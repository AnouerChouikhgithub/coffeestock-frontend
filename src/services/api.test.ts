import { AxiosError } from 'axios'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiClient } from './api'
import { onUnauthorized } from '../auth/sessionEvents'
import { readSession } from '../auth/tokenStorage'
import { clearSeededSession, seedSession } from '../test/auth'

/** Adapter that records the outgoing config and answers with a fixed response. */
function adapterReturning(
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
): { adapter: AxiosAdapter; calls: InternalAxiosRequestConfig[] } {
  const calls: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config)
    const response: AxiosResponse = { data, status, statusText: '', headers, config }
    if (status >= 200 && status < 300) {
      return response
    }
    throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, null, response)
  }
  return { adapter, calls }
}

const AUTH_REQUIRED = {
  error: { code: 'AUTH_REQUIRED', message: 'Authentication required.', details: [] },
}

const originalAdapter = apiClient.defaults.adapter

beforeEach(() => {
  clearSeededSession()
})

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

describe('apiClient authentication', () => {
  it('attaches the bearer token to protected requests', async () => {
    seedSession('MANAGER')
    const { adapter, calls } = adapterReturning(200, { items: [] })
    apiClient.defaults.adapter = adapter

    await apiClient.get('/materials')

    expect(calls).toHaveLength(1)
    expect(calls[0].headers.get('Authorization')).toBe('Bearer test-token-manager')
  })

  it('sends no Authorization header when the tab has no session', async () => {
    const { adapter, calls } = adapterReturning(200, { items: [] })
    apiClient.defaults.adapter = adapter

    await apiClient.get('/health')

    expect(calls[0].headers.get('Authorization')).toBeUndefined()
  })

  it('does not attach an expired token', async () => {
    seedSession('MANAGER', { expiresAt: '2020-01-01T00:00:00+00:00' })
    const { adapter, calls } = adapterReturning(200, { items: [] })
    apiClient.defaults.adapter = adapter

    await apiClient.get('/materials')

    expect(calls[0].headers.get('Authorization')).toBeUndefined()
  })

  it('normalises the contract error envelope into ApiError', async () => {
    seedSession('MANAGER')
    const { adapter } = adapterReturning(403, {
      error: { code: 'FORBIDDEN', message: 'You may not perform this action.', details: [] },
    })
    apiClient.defaults.adapter = adapter

    await expect(apiClient.post('/materials', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      code: 'FORBIDDEN',
      message: 'You may not perform this action.',
    })
  })

  it('clears the session and signals expiry on a 401 from a protected route', async () => {
    seedSession('MANAGER')
    const { adapter } = adapterReturning(401, AUTH_REQUIRED)
    apiClient.defaults.adapter = adapter

    const listener = vi.fn()
    const unsubscribe = onUnauthorized(listener)

    await expect(apiClient.get('/materials')).rejects.toBeInstanceOf(ApiError)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(readSession()).toBeNull()
    unsubscribe()
  })

  it('treats a rejected login as a credential error, not a session expiry', async () => {
    seedSession('MANAGER')
    const { adapter } = adapterReturning(401, {
      error: { code: 'AUTH_INVALID', message: 'Invalid credentials.', details: [] },
    })
    apiClient.defaults.adapter = adapter

    const listener = vi.fn()
    const unsubscribe = onUnauthorized(listener)

    await expect(apiClient.post('/login', { username: 'a', password: 'b' })).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_INVALID',
    })

    expect(listener).not.toHaveBeenCalled()
    expect(readSession()).not.toBeNull()
    unsubscribe()
  })
})
