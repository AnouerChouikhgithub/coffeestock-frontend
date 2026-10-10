import { apiClient } from './api'

export interface HealthStatus {
  status: string
  app: string
  environment: string
  database: {
    connected: boolean
    driver: string
    message: string
  }
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const { data } = await apiClient.get<HealthStatus>('/health')
  return data
}
