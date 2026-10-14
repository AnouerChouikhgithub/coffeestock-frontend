import { apiClient } from './api'
import type { Stocktake } from './types'

export interface StocktakeCountInput {
  material_id: number
  counted_quantity: string
}

export interface StocktakeApprovalInput {
  count_id: number
  approver_comment?: string | null
}

/** POST /api/stocktakes — create a DRAFT with counts. */
export async function createStocktake(counts: StocktakeCountInput[]): Promise<Stocktake> {
  const { data } = await apiClient.post<Stocktake>('/stocktakes', { counts })
  return data
}

/** GET /api/stocktakes/{id} — draft or committed resource. */
export async function getStocktake(id: number): Promise<Stocktake> {
  const { data } = await apiClient.get<Stocktake>(`/stocktakes/${id}`)
  return data
}

/** POST /api/stocktakes/{id}/commit — post deltas atomically (INV-10). */
export async function commitStocktake(
  id: number,
  approvals: StocktakeApprovalInput[] = [],
): Promise<Stocktake> {
  const { data } = await apiClient.post<Stocktake>(`/stocktakes/${id}/commit`, { approvals })
  return data
}
