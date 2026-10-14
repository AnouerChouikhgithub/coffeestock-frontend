import { apiClient } from './api'
import type { UsageResult } from './types'

export interface UsageInput {
  material_id: number
  quantity: string
  recorded_at?: string | null
  note?: string | null
}

/** POST /api/consumptions — negative CONSUMPTION movement. */
export async function recordConsumption(input: UsageInput): Promise<UsageResult> {
  const { data } = await apiClient.post<UsageResult>('/consumptions', input)
  return data
}

/** POST /api/wastes — negative WASTE movement; note carries the reason (BR-15). */
export async function recordWaste(input: UsageInput): Promise<UsageResult> {
  const { data } = await apiClient.post<UsageResult>('/wastes', input)
  return data
}
