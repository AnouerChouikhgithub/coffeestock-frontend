import { apiClient } from './api'
import type { Paginated, Supplier } from './types'

export interface SupplierListParams {
  page?: number
  perPage?: number
  includeInactive?: boolean
  search?: string
}

export async function listSuppliers(params: SupplierListParams = {}): Promise<Paginated<Supplier>> {
  const query: Record<string, string | number | boolean> = {}
  if (params.page !== undefined) query.page = params.page
  if (params.perPage !== undefined) query.perPage = params.perPage
  if (params.includeInactive !== undefined) query.includeInactive = params.includeInactive
  if (params.search !== undefined) query.search = params.search

  const { data } = await apiClient.get<Paginated<Supplier>>('/suppliers', { params: query })
  return data
}
