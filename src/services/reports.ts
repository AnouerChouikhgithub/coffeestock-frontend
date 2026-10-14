import { apiClient } from './api'
import type { InventoryItem, MaterialType, MovementType, Paginated } from './types'

export interface MovementReportRow {
  material_id: number
  movement_type: MovementType
  total_quantity: string
  movement_count: number
}

export interface MovementReportParams {
  material_id?: number
  movement_type?: MovementType
  date_from?: string
  date_to?: string
}

/** GET /api/reports/inventory — full-fidelity inventory report (REQ-070). */
export async function getInventoryReport(
  type: MaterialType | '' = '',
): Promise<Paginated<InventoryItem>> {
  const { data } = await apiClient.get<Paginated<InventoryItem>>('/reports/inventory', {
    params: type === '' ? undefined : { type },
  })
  return data
}

/** GET /api/reports/movements — aggregated movements per material × type (REQ-071). */
export async function getMovementsReport(
  params: MovementReportParams = {},
): Promise<Paginated<MovementReportRow>> {
  const { data } = await apiClient.get<Paginated<MovementReportRow>>('/reports/movements', {
    params,
  })
  return data
}

function csvDownloadUrl(path: string, params: Record<string, string | undefined>): string {
  const base = apiClient.defaults.baseURL ?? ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, value)
    }
  }
  const qs = search.toString()
  return base + path + (qs ? `?${qs}` : '')
}

/** Browser-followed download URL for the inventory CSV export (same filters). */
export function inventoryCsvUrl(type: MaterialType | ''): string {
  return csvDownloadUrl('/reports/inventory/export.csv', { type: type || undefined })
}

/** Browser-followed download URL for the movements CSV export (same filters). */
export function movementsCsvUrl(params: MovementReportParams): string {
  return csvDownloadUrl('/reports/movements/export.csv', {
    material_id: params.material_id !== undefined ? String(params.material_id) : undefined,
    movement_type: params.movement_type,
    date_from: params.date_from,
    date_to: params.date_to,
  })
}
