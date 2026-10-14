import { apiClient } from './api'
import type { Paginated, Receipt, ReceiptListItem } from './types'

export interface ReceiptItemInput {
  material_id: number
  quantity: string
  unit_cost?: string | null
  batch?: { batch_number: string; expires_at?: string | null } | null
}

export interface CreateReceiptInput {
  supplier_id: number
  delivery_date: string
  items: ReceiptItemInput[]
  note?: string | null
}

export interface ReceiptListParams {
  page?: number
  perPage?: number
  supplier_id?: number
  material_id?: number
  date_from?: string
  date_to?: string
}

export async function listReceipts(params: ReceiptListParams = {}): Promise<Paginated<ReceiptListItem>> {
  const query: Record<string, string | number> = {}
  if (params.page !== undefined) query.page = params.page
  if (params.perPage !== undefined) query.perPage = params.perPage
  if (params.supplier_id !== undefined) query.supplier_id = params.supplier_id
  if (params.material_id !== undefined) query.material_id = params.material_id
  if (params.date_from !== undefined) query.date_from = params.date_from
  if (params.date_to !== undefined) query.date_to = params.date_to

  const { data } = await apiClient.get<Paginated<ReceiptListItem>>('/receipts', { params: query })
  return data
}

export async function getReceipt(id: number): Promise<Receipt> {
  const { data } = await apiClient.get<Receipt>(`/receipts/${id}`)
  return data
}

export async function createReceipt(input: CreateReceiptInput): Promise<Receipt> {
  const { data } = await apiClient.post<Receipt>('/receipts', input)
  return data
}
