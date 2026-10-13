import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StocktakingPage } from './StocktakingPage'
import { listMaterials } from '../services/materials'
import { commitStocktake, createStocktake } from '../services/stocktakes'
import type { Material, Stocktake } from '../services/types'

vi.mock('../services/materials', () => ({ listMaterials: vi.fn() }))
vi.mock('../services/stocktakes', () => ({
  createStocktake: vi.fn(),
  getStocktake: vi.fn(),
  commitStocktake: vi.fn(),
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

const draft: Stocktake = {
  id: 7,
  status: 'DRAFT',
  taken_at: '2026-10-13T10:00:00+00:00',
  created_by_user_id: 1,
  committed_by_user_id: null,
  committed_at: null,
  counts: [
    {
      id: 30,
      material_id: 1,
      counted_quantity: '95.000',
      derived_stock_at_count: '100.000',
      delta: '-5.000',
      reconciliation_movement_id: null,
    },
  ],
}

describe('StocktakingPage', () => {
  it('creates a draft and shows derived stock and delta per count', async () => {
    const user = userEvent.setup()
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 1, items: [material] })
    vi.mocked(createStocktake).mockResolvedValue(draft)

    render(<StocktakingPage />)
    await screen.findByRole('option', { name: /Espresso beans/ })

    await user.selectOptions(screen.getByLabelText(/count 1 material/i), '1')
    await user.type(screen.getByLabelText(/counted quantity/i), '95.000')
    await user.click(screen.getByRole('button', { name: /create draft/i }))

    expect(await screen.findByText(/Draft #7/i)).toBeInTheDocument()
    expect(screen.getByText('100.000')).toBeInTheDocument() // derived at count
    expect(screen.getByText('-5.000')).toBeInTheDocument() // delta
  })

  it('asks for approval comments on APPROVAL_REQUIRED and commits with them', async () => {
    const user = userEvent.setup()
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 1, items: [material] })
    vi.mocked(createStocktake).mockResolvedValue(draft)
    vi.mocked(commitStocktake)
      .mockRejectedValueOnce({
        response: {
          data: {
            error: {
              code: 'APPROVAL_REQUIRED',
              message: 'Over-tolerance counts need an approval entry.',
              details: [],
            },
          },
        },
      })
      .mockResolvedValueOnce({
        ...draft,
        status: 'COMMITTED',
        committed_by_user_id: 1,
        committed_at: '2026-10-13T10:05:00+00:00',
        counts: [{ ...draft.counts[0], reconciliation_movement_id: 900 }],
      })

    render(<StocktakingPage />)
    await screen.findByRole('option', { name: /Espresso beans/ })
    await user.selectOptions(screen.getByLabelText(/count 1 material/i), '1')
    await user.type(screen.getByLabelText(/counted quantity/i), '95.000')
    await user.click(screen.getByRole('button', { name: /create draft/i }))
    expect(await screen.findByText(/Draft #7/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /commit stocktake/i }))

    // Server demands approvals → comment fields appear.
    expect(await screen.findByText(/exceed the tolerance/i)).toBeInTheDocument()
    const comment = screen.getByLabelText(/approver comment for count #30/i)
    await user.type(comment, 'Shrinkage agreed with manager')

    await user.click(screen.getByRole('button', { name: /commit stocktake/i }))

    await waitFor(() => {
      expect(commitStocktake).toHaveBeenLastCalledWith(
        7,
        [{ count_id: 30, approver_comment: 'Shrinkage agreed with manager' }],
      )
    })
    expect(await screen.findByText(/Stocktake committed/i)).toBeInTheDocument()
  })

  it('rejects rows without a material before calling the API', async () => {
    const user = userEvent.setup()
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 1, items: [material] })

    render(<StocktakingPage />)
    await screen.findByRole('option', { name: /Espresso beans/ })

    await user.click(screen.getByRole('button', { name: /create draft/i }))

    expect(await screen.findByText(/Every row needs a material/i)).toBeInTheDocument()
    expect(createStocktake).not.toHaveBeenCalled()
  })
})
