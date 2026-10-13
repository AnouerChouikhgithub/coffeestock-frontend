import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdjustmentsPage } from './AdjustmentsPage'
import { listMaterials } from '../services/materials'
import { createAdjustment } from '../services/adjustments'
import type { Material } from '../services/types'

vi.mock('../services/materials', () => ({ listMaterials: vi.fn() }))
vi.mock('../services/adjustments', () => ({ createAdjustment: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

const material: Material = {
  id: 1,
  name: 'Milk',
  type: 'CONSUMABLE',
  base_unit: 'l',
  reorder_threshold: null,
  stocktake_threshold: '1.000',
  is_active: true,
  created_at: '2026-10-11T09:30:00+00:00',
}

function apiError(code: string, message: string) {
  return { response: { data: { error: { code, message, details: [] } } } }
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('option', { name: /Milk/ })
  await user.selectOptions(screen.getByLabelText(/material/i), '1')
  await user.type(screen.getByLabelText(/signed delta/i), '-5.000')
  await user.type(screen.getByLabelText(/^reason/i), 'Spillage during decanting')
}

describe('AdjustmentsPage', () => {
  it('saves a signed adjustment with its reason', async () => {
    const user = userEvent.setup()
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 1, items: [material] })
    vi.mocked(createAdjustment).mockResolvedValue({
      id: 9,
      material_id: 1,
      signed_delta: '-5.000',
      reason: 'Spillage during decanting',
      approval_id: null,
      created_by_user_id: 1,
      stock_movement_id: 883,
    })

    render(<AdjustmentsPage />)
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText(/Adjustment recorded/i)).toBeInTheDocument()
    expect(createAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({ signed_delta: '-5.000', approved: false }),
    )
  })

  it('offers approval after APPROVAL_REQUIRED and resubmits with approved=true', async () => {
    const user = userEvent.setup()
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 1, items: [material] })
    vi.mocked(createAdjustment)
      .mockRejectedValueOnce(apiError('APPROVAL_REQUIRED', 'Adjustment exceeds the threshold.'))
      .mockResolvedValueOnce({
        id: 10,
        material_id: 1,
        signed_delta: '-5.000',
        reason: 'Spillage during decanting',
        approval_id: 3,
        created_by_user_id: 1,
        stock_movement_id: 884,
      })

    render(<AdjustmentsPage />)
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText(/Approval required/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save with approval/i }))

    await waitFor(() => {
      expect(createAdjustment).toHaveBeenLastCalledWith(
        expect.objectContaining({ approved: true }),
      )
    })
    expect(await screen.findByText(/approval #3/i)).toBeInTheDocument()
  })

  it('explains a NEGATIVE_STOCK_BLOCKED rejection', async () => {
    const user = userEvent.setup()
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 1, items: [material] })
    vi.mocked(createAdjustment).mockRejectedValue(
      apiError('NEGATIVE_STOCK_BLOCKED', 'Adjustment would push stock below zero.'),
    )

    render(<AdjustmentsPage />)
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText(/Approval required/i)).toBeInTheDocument()
    expect(screen.getByText(/below zero/i)).toBeInTheDocument()
  })
})
