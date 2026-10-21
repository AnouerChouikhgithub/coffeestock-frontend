import { apiClient } from './api'
import { downloadCsv } from './download'
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

/** GET /api/reports/inventory/export.csv, authenticated (contract 27).
 *
 * These endpoints require the bearer token, so they cannot be a plain link: the
 * request goes through the shared client and the response is saved as a file.
 */
export async function exportInventoryCsv(type: MaterialType | ''): Promise<void> {
  await downloadCsv(
    '/reports/inventory/export.csv',
    { type: type === '' ? undefined : type },
    'inventory-report.csv',
  )
}

/** GET /api/reports/movements/export.csv, authenticated (contract 28). */
export async function exportMovementsCsv(params: MovementReportParams): Promise<void> {
  await downloadCsv(
    '/reports/movements/export.csv',
    {
      material_id: params.material_id,
      movement_type: params.movement_type,
      date_from: params.date_from,
      date_to: params.date_to,
    },
    'movement-report.csv',
  )
}
