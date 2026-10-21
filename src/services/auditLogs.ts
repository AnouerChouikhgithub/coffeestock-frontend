import { apiClient } from './api'
import type { Paginated } from './types'

/** One row of GET /api/audit-logs (Admin-only in the contract, REQ-110). */
export interface AuditLogEntry {
  id: number
  actor_user_id: number
  action: string
  target_entity: string
  target_entity_id: number
  occurred_at: string
  outcome: string
  detail: string | null
}

export interface AuditLogParams {
  page?: number
  per_page?: number
  action?: string
  actor_user_id?: number
  date_from?: string
  date_to?: string
}

export async function listAuditLogs(
  params: AuditLogParams = {},
): Promise<Paginated<AuditLogEntry>> {
  const { data } = await apiClient.get<Paginated<AuditLogEntry>>('/audit-logs', { params })
  return data
}
