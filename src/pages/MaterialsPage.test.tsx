import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MaterialsPage } from './MaterialsPage'
import { createMaterial, listMaterials } from '../services/materials'
import type { Material } from '../services/types'

vi.mock('../services/materials', () => ({
  listMaterials: vi.fn(),
  createMaterial: vi.fn(),
}))

beforeEach(() => vi.clearAllMocks())

const material: Material = {
  id: 1,
  name: 'Espresso beans',
  type: 'RAW',
  base_unit: 'g',
  reorder_threshold: '500.000',
  stocktake_threshold: null,
  is_active: true,
  created_at: '2026-10-11T09:30:00+00:00',
}

function apiError(code: string, message: string, details: Array<{ field: string; issue: string }> = []) {
  return { response: { data: { error: { code, message, details } } } }
}

describe('MaterialsPage', () => {
  it('renders materials with base units as strings', async () => {
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 1, items: [material] })

    render(<MaterialsPage />)

    expect(await screen.findByText('Espresso beans')).toBeInTheDocument()
    // Amounts stay raw decimal strings — no float formatting.
    const table = screen.getByRole('table')
    expect(within(table).getByText('500.000')).toBeInTheDocument()
    expect(within(table).getByText('g')).toBeInTheDocument()
  })

  it('shows an empty state when there are no materials', async () => {
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 0, items: [] })

    render(<MaterialsPage />)

    expect(await screen.findByText(/No materials yet/i)).toBeInTheDocument()
  })

  it('shows an error state and retries', async () => {
    const user = userEvent.setup()
    vi.mocked(listMaterials).mockRejectedValueOnce(new Error('Network Error'))

    render(<MaterialsPage />)

    expect(await screen.findByText(/Could not load materials/i)).toBeInTheDocument()

    vi.mocked(listMaterials).mockResolvedValueOnce({ page: 1, perPage: 50, total: 0, items: [] })
    await user.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.getByText(/No materials yet/i)).toBeInTheDocument()
    })
  })

  it('surfaces DUPLICATE_NAME as a field error on create', async () => {
    const user = userEvent.setup()
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 0, items: [] })
    vi.mocked(createMaterial).mockRejectedValue(
      apiError('DUPLICATE_NAME', 'Validation failed.', [
        { field: 'name', issue: 'A material with this name already exists.' },
      ]),
    )

    render(<MaterialsPage />)

    await user.type(screen.getByLabelText(/^Name/i), 'Espresso beans')
    await user.click(screen.getByRole('button', { name: /create material/i }))

    expect((await screen.findAllByText(/already exists/i)).length).toBeGreaterThan(0)
  })

  it('creates a material and refreshes the list', async () => {
    const user = userEvent.setup()
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 0, items: [] })
    vi.mocked(createMaterial).mockResolvedValue(material)

    render(<MaterialsPage />)

    await user.type(screen.getByLabelText(/^Name/i), 'Espresso beans')
    await user.click(screen.getByRole('button', { name: /create material/i }))

    await waitFor(() => {
      expect(createMaterial).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Espresso beans', base_unit: 'g' }),
      )
    })
  })
})
