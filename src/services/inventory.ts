import { apiClient } from './api'
import type { InventoryItem, Movement, Paginated } from './types'

export interface MovementHistoryParams {
  page?: number
  perPage?: number
  movement_type?: string
  date_from?: string
  date_to?: string
}

/** GET /api/inventory — current inventory overview. */
export async function listInventory(): Promise<Paginated<InventoryItem>> {
  const { data } = await apiClient.get<Paginated<InventoryItem>>('/inventory')
  return data
}

/** GET /api/inventory/{id} — one material's stock on hand. */
export async function getInventoryItem(materialId: number): Promise<InventoryItem> {
  const { data } = await apiClient.get<InventoryItem>(`/inventory/${materialId}`)
  return data
}

/** GET /api/inventory/{id}/movements — movement history, newest first. */
export async function listMovements(
  materialId: number,
  params: MovementHistoryParams = {},
): Promise<Paginated<Movement>> {
  const query: Record<string, string | number> = {}
  if (params.page !== undefined) query.page = params.page
  if (params.perPage !== undefined) query.perPage = params.perPage
  if (params.movement_type !== undefined) query.movement_type = params.movement_type
  if (params.date_from !== undefined) query.date_from = params.date_from
  if (params.date_to !== undefined) query.date_to = params.date_to

  const { data } = await apiClient.get<Paginated<Movement>>(`/inventory/${materialId}/movements`, {
    params: query,
  })
  return data
}
