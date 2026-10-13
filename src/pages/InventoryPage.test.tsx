import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InventoryPage } from './InventoryPage'
import { listInventory, listMovements } from '../services/inventory'
import type { InventoryItem } from '../services/types'

vi.mock('../services/inventory', () => ({
  listInventory: vi.fn(),
  listMovements: vi.fn(),
}))

beforeEach(() => vi.clearAllMocks())

const item: InventoryItem = {
  material_id: 1,
  name: 'Espresso beans',
  type: 'RAW',
  base_unit: 'g',
  stock_on_hand: '84.123',
  below_threshold: true,
}

describe('InventoryPage', () => {
  it('renders stock on hand as a raw decimal string', async () => {
    vi.mocked(listInventory).mockResolvedValue({ page: 1, perPage: 50, total: 1, items: [item] })

    render(<InventoryPage />)

    expect(await screen.findByText('84.123')).toBeInTheDocument()
    expect(screen.getByText('Espresso beans').closest('tr')).toHaveTextContent('yes')
  })

  it('shows an error state when inventory fails to load', async () => {
    vi.mocked(listInventory).mockRejectedValue(new Error('Network Error'))

    render(<InventoryPage />)

    expect(await screen.findByText(/Could not load inventory/i)).toBeInTheDocument()
  })

  it('loads movement history for a material with the type filter', async () => {
    const user = userEvent.setup()
    vi.mocked(listInventory).mockResolvedValue({ page: 1, perPage: 50, total: 1, items: [item] })
    vi.mocked(listMovements).mockResolvedValue({
      page: 1,
      perPage: 25,
      total: 1,
      items: [
        {
          id: 881,
          movement_type: 'RECEIPT',
          signed_quantity: '100.000',
          occurred_at: '2026-10-12T09:00:00+00:00',
          source_document_type: 'RECEIPT_ITEM',
          source_document_id: 20,
          created_by_user_id: 1,
          batch_id: null,
        },
      ],
    })

    render(<InventoryPage />)
    await screen.findByRole('button', { name: /movements/i })

    await user.selectOptions(screen.getByLabelText(/filter by movement type/i), 'RECEIPT')
    await user.click(screen.getByRole('button', { name: /movements/i }))

    await waitFor(() => {
      expect(listMovements).toHaveBeenCalledWith(1, {
        perPage: 25,
        movement_type: 'RECEIPT',
      })
    })
    expect(await screen.findByText('100.000')).toBeInTheDocument()
  })
})
