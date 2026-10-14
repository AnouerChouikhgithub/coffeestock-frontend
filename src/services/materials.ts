import { apiClient } from './api'
import type { Material, MaterialType, Paginated } from './types'

export interface MaterialListParams {
  page?: number
  perPage?: number
  type?: MaterialType
  search?: string
  includeInactive?: boolean
}

export interface CreateMaterialInput {
  name: string
  type: MaterialType
  base_unit: string
  reorder_threshold?: string | null
  stocktake_threshold?: string | null
}

export interface UpdateMaterialInput {
  name?: string
  type?: MaterialType
  reorder_threshold?: string | null
  stocktake_threshold?: string | null
  is_active?: boolean
}

export async function listMaterials(params: MaterialListParams = {}): Promise<Paginated<Material>> {
  const query: Record<string, string | number | boolean> = {}
  if (params.page !== undefined) query.page = params.page
  if (params.perPage !== undefined) query.perPage = params.perPage
  if (params.type !== undefined) query.type = params.type
  if (params.search !== undefined) query.search = params.search
  if (params.includeInactive !== undefined) query.includeInactive = params.includeInactive

  const { data } = await apiClient.get<Paginated<Material>>('/materials', { params: query })
  return data
}

export async function createMaterial(input: CreateMaterialInput): Promise<Material> {
  const { data } = await apiClient.post<Material>('/materials', input)
  return data
}

export async function updateMaterial(id: number, input: UpdateMaterialInput): Promise<Material> {
  const { data } = await apiClient.patch<Material>(`/materials/${id}`, input)
  return data
}
