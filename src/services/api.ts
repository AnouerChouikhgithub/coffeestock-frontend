import axios, { type AxiosError, type AxiosResponse } from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export class ApiError extends Error {
  public readonly status: number | null
  public readonly details?: unknown

  constructor(status: number | null, details?: unknown) {
    super('The API request failed. Please check the backend connection or endpoint.')
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const status = error.response?.status ?? null
    throw new ApiError(status, error.response?.data ?? error.message)
  },
)
