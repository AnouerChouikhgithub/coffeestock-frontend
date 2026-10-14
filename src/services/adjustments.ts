import { apiClient } from './api'
import type { AdjustmentResult } from './types'

export interface AdjustmentInput {
  material_id: number
  signed_delta: string
  reason: string
  recorded_at?: string | null
  /** OD-1/OD-5 override: acknowledges APPROVAL_REQUIRED / NEGATIVE_STOCK_BLOCKED. */
  approved?: boolean
}

/** POST /api/adjustments — signed correction with mandatory reason. */
export async function createAdjustment(input: AdjustmentInput): Promise<AdjustmentResult> {
  const { data } = await apiClient.post<AdjustmentResult>('/adjustments', input)
  return data
}
