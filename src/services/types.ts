/** Types mirroring docs/api-contract.md. Amounts are decimal strings (scale 3);
 * never parse them to floats — the contract forbids float arithmetic on stock.
 */

export interface Paginated<T> {
  page: number
  perPage: number
  total: number
  items: T[]
}

/** Standard error envelope (ErrorResponse::make on the backend). */
export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: Array<{ field: string; issue: string }>
  }
}

export type MaterialType = 'RAW' | 'CONSUMABLE'
export type BaseUnit = 'g' | 'kg' | 'ml' | 'l' | 'piece'

export interface Material {
  id: number
  name: string
  type: MaterialType
  base_unit: BaseUnit
  reorder_threshold: string | null
  stocktake_threshold: string | null
  is_active: boolean
  created_at: string
}

export interface Supplier {
  id: number
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  is_active: boolean
}

export interface ReceiptItem {
  id: number
  material_id: number
  quantity: string
  unit_cost: string | null
  batch_id: number | null
  stock_movement_id: number
}

export interface Receipt {
  id: number
  supplier_id: number
  delivery_date: string
  note: string | null
  created_at: string
  created_by_user_id: number
  items: ReceiptItem[]
}

export interface ReceiptListItem {
  id: number
  supplier_id: number
  delivery_date: string
  created_at: string
  created_by_user_id: number
  item_count: number
}

export type MovementType = 'RECEIPT' | 'CONSUMPTION' | 'WASTE' | 'ADJUSTMENT' | 'STOCKTAKE_DELTA'

export interface Movement {
  id: number
  movement_type: MovementType
  signed_quantity: string
  occurred_at: string
  source_document_type: string
  source_document_id: number
  created_by_user_id: number
  batch_id: number | null
}

export interface InventoryItem {
  material_id: number
  name: string
  type: MaterialType
  base_unit: BaseUnit
  stock_on_hand: string
  below_threshold: boolean
}

export interface UsageResult {
  id: number
  material_id: number
  quantity: string
  recorded_at: string
  note: string | null
  created_by_user_id: number
  stock_movement_id: number
}

export interface AdjustmentResult {
  id: number
  material_id: number
  signed_delta: string
  reason: string
  approval_id: number | null
  created_by_user_id: number
  stock_movement_id: number
}

export type StocktakeStatus = 'DRAFT' | 'COMMITTED'

export interface StocktakeCount {
  id: number
  material_id: number
  counted_quantity: string
  derived_stock_at_count: string
  delta: string
  reconciliation_movement_id: number | null
}

export interface Stocktake {
  id: number
  status: StocktakeStatus
  taken_at: string
  created_by_user_id: number
  committed_by_user_id: number | null
  committed_at: string | null
  counts: StocktakeCount[]
}

/** Best-effort extraction of the backend's error code for user-facing messages. */
export function errorCode(err: unknown): string | null {
  const body = (err as { response?: { data?: ApiErrorBody } })?.response?.data
  return body?.error?.code ?? null
}

/** Best-effort extraction of per-field issues for form validation display. */
export function fieldErrors(err: unknown): Record<string, string> {
  const details = (err as { response?: { data?: ApiErrorBody } })?.response?.data?.error?.details
  if (!details) {
    return {}
  }
  const out: Record<string, string> = {}
  for (const d of details) {
    out[d.field] = d.issue
  }
  return out
}

/** Top-level message for non-field errors. */
export function errorMessage(err: unknown, fallback: string): string {
  const body = (err as { response?: { data?: ApiErrorBody } })?.response?.data
  if (body?.error?.message) {
    const firstDetail = body.error.details?.[0]?.issue
    return firstDetail ? `${body.error.message} ${firstDetail}` : body.error.message
  }
  if (err instanceof Error && err.message) {
    return err.message
  }
  return fallback
}
