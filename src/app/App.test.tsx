import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from '../auth/AuthProvider'
import { clearSeededSession, seedSession } from '../test/auth'

const healthyResponse = {
  status: 'ok',
  app: 'coffeestock-backend',
  environment: 'test',
  database: {
    connected: true,
    driver: 'pgsql',
    message: 'Database connection is active.',
  },
}

vi.mock('../services/health', () => ({
  getHealthStatus: vi.fn(),
}))

vi.mock('../services/materials', () => ({
  listMaterials: vi.fn(),
  createMaterial: vi.fn(),
}))

vi.mock('../services/reports', () => ({
  getInventoryReport: vi.fn().mockResolvedValue({ page: 1, perPage: 50, total: 0, items: [] }),
  getMovementsReport: vi.fn(),
  exportInventoryCsv: vi.fn(),
  exportMovementsCsv: vi.fn(),
}))

vi.mock('../services/auditLogs', () => ({
  listAuditLogs: vi.fn().mockResolvedValue({ page: 1, perPage: 25, total: 0, items: [] }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  clearSeededSession()
  seedSession('MANAGER')
})

function renderApp(path: string) {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AuthProvider>,
  )
}

async function renderAt(path: string) {
  const { getHealthStatus } = await import('../services/health')
  vi.mocked(getHealthStatus).mockResolvedValue(healthyResponse)
  renderApp(path)
}

describe('App shell', () => {
  it('renders the dashboard with landmarks and backend status', async () => {
    await renderAt('/')

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/Backend connected/i)).toBeInTheDocument()
    })
  })

  it('exposes a skip-to-content link targeting the main region', async () => {
    await renderAt('/')

    const skip = screen.getByRole('link', { name: /skip to main content/i })
    expect(skip).toHaveAttribute('href', '#main-content')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  })

  it('marks the active nav item via aria-current', async () => {
    await renderAt('/')

    const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
    await waitFor(() => {
      expect(dashboardLink).toHaveAttribute('aria-current', 'page')
    })
  })

  it('shows the signed-in identity and role', async () => {
    await renderAt('/')

    expect(screen.getByText('manager-user')).toBeInTheDocument()
    expect(screen.getByText('MANAGER')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('renders a live workflow page (Materials)', async () => {
    const { listMaterials } = await import('../services/materials')
    vi.mocked(listMaterials).mockResolvedValue({ page: 1, perPage: 50, total: 0, items: [] })

    renderApp('/materials')

    expect(screen.getByRole('heading', { name: 'Materials', level: 1 })).toBeInTheDocument()
  })

  it('renders the live reporting page (Phase 8)', async () => {
    await renderAt('/reports')

    expect(screen.getByRole('heading', { name: 'Reports', level: 1 })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Current inventory report', level: 2 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Movement report', level: 2 }),
    ).toBeInTheDocument()
    // CSV export is an authenticated request now, so it is a button, not a link.
    expect(screen.getAllByRole('button', { name: /export csv/i }).length).toBe(2)
    expect(screen.queryAllByRole('link', { name: /export csv/i })).toHaveLength(0)
  })

  it('redirects to the login screen when the tab has no session', () => {
    clearSeededSession()

    renderApp('/reports')

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /primary/i })).not.toBeInTheDocument()
  })

  it('shows an explicit error state when the backend is unavailable', async () => {
    const { getHealthStatus } = await import('../services/health')
    vi.mocked(getHealthStatus).mockRejectedValue(new Error('Network Error'))

    renderApp('/')

    expect(await screen.findByText(/Backend unavailable/i)).toBeInTheDocument()
    expect(screen.getByText(/Network Error/i)).toBeInTheDocument()
  })

  it('offers a retry action in the error state', async () => {
    const user = userEvent.setup()
    const { getHealthStatus } = await import('../services/health')
    vi.mocked(getHealthStatus)
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(healthyResponse)

    renderApp('/')

    expect(await screen.findByText(/Backend unavailable/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.getByText(/Backend connected/i)).toBeInTheDocument()
    })
  })
})

describe('Role-aware navigation', () => {
  it('hides manager-only and admin-only sections from an operator', async () => {
    clearSeededSession()
    seedSession('OPERATOR')

    await renderAt('/')

    expect(screen.queryByRole('link', { name: /adjustments/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /audit log/i })).not.toBeInTheDocument()
    // Pages every role may read stay visible.
    expect(screen.getByRole('link', { name: /materials/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument()
  })

  it('shows the audit log to an admin only', async () => {
    clearSeededSession()
    seedSession('ADMIN')

    await renderAt('/')

    expect(screen.getByRole('link', { name: /audit log/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /adjustments/i })).toBeInTheDocument()
  })
})
