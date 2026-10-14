import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReportsPage } from './ReportsPage'
import { getInventoryReport, getMovementsReport, type MovementReportRow } from '../services/reports'
import type { InventoryItem, Paginated } from '../services/types'

vi.mock('../services/reports', () => ({
  getInventoryReport: vi.fn(),
  getMovementsReport: vi.fn(),
  inventoryCsvUrl: vi.fn(() => '/reports/inventory/export.csv'),
  movementsCsvUrl: vi.fn(() => '/reports/movements/export.csv'),
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

const row: MovementReportRow = {
  material_id: 1,
  movement_type: 'CONSUMPTION',
  total_quantity: '-2.750',
  movement_count: 2,
}

describe('ReportsPage', () => {
  it('renders the inventory report with raw decimal strings', async () => {
    vi.mocked(getInventoryReport).mockResolvedValue({
      page: 1,
      perPage: 50,
      total: 1,
      items: [item],
    } satisfies Paginated<InventoryItem>)

    render(<ReportsPage />)

    expect(await screen.findByText('84.123')).toBeInTheDocument()
    expect(screen.getByText('Espresso beans').closest('tr')).toHaveTextContent('yes')
    expect(getInventoryReport).toHaveBeenCalledWith('')
  })

  it('shows an error state with retry when the report fails', async () => {
    vi.mocked(getInventoryReport).mockRejectedValue(new Error('Network Error'))

    render(<ReportsPage />)

    expect(await screen.findByText(/Could not load inventory report/i)).toBeInTheDocument()
  })

  it('loads the movement report on Apply filters and honours filters', async () => {
    const user = userEvent.setup()
    vi.mocked(getInventoryReport).mockResolvedValue({
      page: 1,
      perPage: 50,
      total: 0,
      items: [],
    })
    vi.mocked(getMovementsReport).mockResolvedValue({
      page: 1,
      perPage: 50,
      total: 1,
      items: [row],
    })

    render(<ReportsPage />)
    await screen.findByRole('button', { name: /apply filters/i })

    await user.click(screen.getByRole('button', { name: /apply filters/i }))

    expect(await screen.findByText('-2.750')).toBeInTheDocument()
    expect(getMovementsReport).toHaveBeenCalledWith(
      expect.objectContaining({ movement_type: undefined }),
    )
  })
})
