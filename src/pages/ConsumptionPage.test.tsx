import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConsumptionPage } from './ConsumptionPage'
import { listMaterials } from '../services/materials'
import { recordConsumption, recordWaste } from '../services/usage'
import type { Material } from '../services/types'

vi.mock('../services/materials', () => ({ listMaterials: vi.fn() }))
vi.mock('../services/usage', () => ({
  recordConsumption: vi.fn(),
  recordWaste: vi.fn(),
}))

beforeEach(() => vi.clearAllMocks())

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

describe('ConsumptionPage', () => {
  it('requires a reason for waste before calling the API', async () => {
    const user = userEvent.setup()
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 1, items: [material] })

    render(<ConsumptionPage />)
    await screen.findByRole('option', { name: /Espresso beans/ })

    await user.click(screen.getByRole('radio', { name: /waste/i }))
    await user.selectOptions(screen.getByLabelText(/material/i), '1')
    await user.type(screen.getByLabelText(/^quantity/i), '3.250')
    await user.click(screen.getByRole('button', { name: /record waste/i }))

    expect(await screen.findByText(/reason is required for waste/i)).toBeInTheDocument()
    expect(recordWaste).not.toHaveBeenCalled()
  })

  it('records a consumption and reports the movement', async () => {
    const user = userEvent.setup()
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 1, items: [material] })
    vi.mocked(recordConsumption).mockResolvedValue({
      id: 55,
      material_id: 1,
      quantity: '2.500',
      recorded_at: '2026-10-13T10:00:00+00:00',
      note: null,
      created_by_user_id: 1,
      stock_movement_id: 882,
    })

    render(<ConsumptionPage />)
    await screen.findByRole('option', { name: /Espresso beans/ })

    await user.selectOptions(screen.getByLabelText(/material/i), '1')
    await user.type(screen.getByLabelText(/^quantity/i), '2.500')
    await user.click(screen.getByRole('button', { name: /record consumption/i }))

    expect(await screen.findByText(/Consumption recorded/i)).toBeInTheDocument()
    expect(screen.getByText(/movement #\s*882/)).toBeInTheDocument()
  })

  it('explains a NEGATIVE_STOCK_BLOCKED rejection', async () => {
    const user = userEvent.setup()
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 1, items: [material] })
    vi.mocked(recordConsumption).mockRejectedValue({
      response: {
        data: {
          error: {
            code: 'NEGATIVE_STOCK_BLOCKED',
            message: 'Entry would push stock below zero.',
            details: [],
          },
        },
      },
    })

    render(<ConsumptionPage />)
    await screen.findByRole('option', { name: /Espresso beans/ })

    await user.selectOptions(screen.getByLabelText(/material/i), '1')
    await user.type(screen.getByLabelText(/^quantity/i), '50.000')
    await user.click(screen.getByRole('button', { name: /record consumption/i }))

    expect(await screen.findByText(/stock would go negative/i)).toBeInTheDocument()
    expect(screen.getByText(/below zero \(OD-1\)/i)).toBeInTheDocument()
  })

  it('sends the note as the waste reason', async () => {
    const user = userEvent.setup()
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 1, items: [material] })
    vi.mocked(recordWaste).mockResolvedValue({
      id: 56,
      material_id: 1,
      quantity: '3.250',
      recorded_at: '2026-10-13T10:00:00+00:00',
      note: 'Spoiled milk',
      created_by_user_id: 1,
      stock_movement_id: 884,
    })

    render(<ConsumptionPage />)
    await screen.findByRole('option', { name: /Espresso beans/ })

    await user.click(screen.getByRole('radio', { name: /waste/i }))
    await user.selectOptions(screen.getByLabelText(/material/i), '1')
    await user.type(screen.getByLabelText(/^quantity/i), '3.250')
    await user.type(screen.getByLabelText(/reason/i), 'Spoiled milk')
    await user.click(screen.getByRole('button', { name: /record waste/i }))

    await waitFor(() => {
      expect(recordWaste).toHaveBeenCalledWith(
        expect.objectContaining({ note: 'Spoiled milk' }),
      )
    })
  })
})
