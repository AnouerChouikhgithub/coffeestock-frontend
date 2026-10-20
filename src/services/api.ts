import axios, { type AxiosError, type AxiosResponse } from 'axios'
import { clearSession, readToken } from '../auth/tokenStorage'
import { emitUnauthorized } from '../auth/sessionEvents'
import type { ApiErrorBody } from './types'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

/** The single axios instance every service talks through.
 *
 * Two interceptors keep authentication in one place:
 *  - request: attach `Authorization: Bearer <token>` when this tab has a session.
 *  - response: normalise every failure into ApiError, and turn a 401 that is not
 *    the login endpoint itself into a session-expiry signal.
 */
export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const GENERIC_MESSAGE = 'The API request failed. Please check the backend connection or endpoint.'

export class ApiError extends Error {
  public readonly status: number | null
  /** Parsed contract error envelope, when the backend sent one. */
  public readonly body: ApiErrorBody | null
  /** `error.code` from the contract envelope (e.g. AUTH_INVALID, RATE_LIMITED). */
  public readonly code: string | null

  constructor(status: number | null, body: ApiErrorBody | null = null, message?: string) {
    super(message ?? body?.error?.message ?? GENERIC_MESSAGE)
    this.name = 'ApiError'
    this.status = status
    this.body = body
    this.code = body?.error?.code ?? null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Accept only payloads that actually look like the contract error envelope. */
function asErrorBody(value: unknown): ApiErrorBody | null {
  if (!isRecord(value) || !isRecord(value.error)) {
    return null
  }
  const { code, message, details } = value.error
  if (typeof code !== 'string' || typeof message !== 'string') {
    return null
  }
  return {
    error: {
      code,
      message,
      details: Array.isArray(details)
        ? (details as Array<{ field: string; issue: string }>)
        : undefined,
    },
  }
}

/** Error bodies arrive as JSON, or as a Blob when the request asked for a binary
 * response type (CSV export). Both are decoded here so callers never have to. */
async function readErrorBody(data: unknown): Promise<ApiErrorBody | null> {
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      return asErrorBody(JSON.parse(await data.text()) as unknown)
    } catch {
      return null
    }
  }
  return asErrorBody(data)
}

apiClient.interceptors.request.use((config) => {
  const token = readToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const status = error.response?.status ?? null
    const body = await readErrorBody(error.response?.data)
    const url = error.config?.url ?? ''
    // A rejected login is a credential error to show on the form, not an expired
    // session: clearing storage there would wipe a session the user still has.
    const isCredentialCheck = url.endsWith('/login')

    if (status === 401 && !isCredentialCheck) {
      clearSession()
      emitUnauthorized()
    }

    throw new ApiError(status, body)
  },
)
