import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReceiptsPage } from './ReceiptsPage'
import { listMaterials } from '../services/materials'
import { listSuppliers } from '../services/suppliers'
import { createReceipt, listReceipts } from '../services/receipts'
import type { Material, Supplier } from '../services/types'

vi.mock('../services/materials', () => ({ listMaterials: vi.fn() }))
vi.mock('../services/suppliers', () => ({ listSuppliers: vi.fn() }))
vi.mock('../services/receipts', () => ({
  listReceipts: vi.fn(),
  getReceipt: vi.fn(),
  createReceipt: vi.fn(),
}))

beforeEach(() => vi.clearAllMocks())

const supplier: Supplier = {
  id: 1,
  name: 'Roastery Co',
  contact_name: null,
  email: null,
  phone: null,
  is_active: true,
}

const material: Material = {
  id: 1,
  name: 'Espresso beans',
  type: 'RAW',
  base_unit: 'g',
  reorder_threshold: null,
  stocktake_threshold: null,
  is_active: true,
  created_at: '2026-10-11T09:30:00+00:00',
}

describe('ReceiptsPage', () => {
  it('lists receipts and posts a receipt with batch metadata', async () => {
    const user = userEvent.setup()
    vi.mocked(listReceipts).mockResolvedValue({
      page: 1,
      perPage: 50,
      total: 0,
      items: [],
    })
    vi.mocked(listSuppliers).mockResolvedValue({ page: 1, perPage: 100, total: 1, items: [supplier] })
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 1, items: [material] })
    vi.mocked(createReceipt).mockResolvedValue({
      id: 1,
      supplier_id: 1,
      delivery_date: '2026-10-12',
      note: null,
      created_at: '2026-10-12T09:00:00+00:00',
      created_by_user_id: 1,
      items: [],
    })

    render(<ReceiptsPage />)

    await screen.findByRole('option', { name: 'Roastery Co' })
    await user.selectOptions(screen.getByLabelText(/supplier/i), '1')
    await user.type(screen.getByLabelText(/delivery date/i), '2026-10-12')
    await user.selectOptions(screen.getByLabelText(/item 1 material/i), '1')
    await user.type(screen.getByLabelText(/^quantity/i), '12.500')
    await user.type(screen.getByLabelText(/batch number/i), 'RO-041')
    await user.click(screen.getByRole('button', { name: /record receipt/i }))

    await waitFor(() => {
      expect(createReceipt).toHaveBeenCalledWith({
        supplier_id: 1,
        delivery_date: '2026-10-12',
        note: null,
        items: [
          {
            material_id: 1,
            quantity: '12.500',
            batch: { batch_number: 'RO-041' },
          },
        ],
      })
    })
    expect(await screen.findByText(/Receipt recorded/i)).toBeInTheDocument()
  })

  it('surfaces backend field errors on submit', async () => {
    const user = userEvent.setup()
    vi.mocked(listReceipts).mockResolvedValue({ page: 1, perPage: 50, total: 0, items: [] })
    vi.mocked(listSuppliers).mockResolvedValue({ page: 1, perPage: 100, total: 1, items: [supplier] })
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 1, items: [material] })
    vi.mocked(createReceipt).mockRejectedValue({
      response: {
        data: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Request validation failed.',
            details: [{ field: 'items.0.quantity', issue: 'must be > 0' }],
          },
        },
      },
    })

    render(<ReceiptsPage />)

    await screen.findByRole('option', { name: 'Roastery Co' })
    await user.selectOptions(screen.getByLabelText(/supplier/i), '1')
    await user.type(screen.getByLabelText(/delivery date/i), '2026-10-12')
    await user.selectOptions(screen.getByLabelText(/item 1 material/i), '1')
    await user.type(screen.getByLabelText(/^quantity/i), '0')
    await user.click(screen.getByRole('button', { name: /record receipt/i }))

    expect(await screen.findByText(/Could not save/i)).toBeInTheDocument()
    expect(screen.getByText('must be > 0')).toBeInTheDocument()
  })
})
