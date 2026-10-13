import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

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

async function renderAt(path: string) {
  const { getHealthStatus } = await import('../services/health')
  vi.mocked(getHealthStatus).mockResolvedValue(healthyResponse)

  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
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

  it('renders a placeholder for a planned section', async () => {
    await renderAt('/materials')

    expect(screen.getByRole('heading', { name: 'Materials', level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/will be built in a later phase/i)).toBeInTheDocument()
  })

  it('shows an explicit error state when the backend is unavailable', async () => {
    const { getHealthStatus } = await import('../services/health')
    vi.mocked(getHealthStatus).mockRejectedValue(new Error('Network Error'))

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Backend unavailable/i)).toBeInTheDocument()
    expect(screen.getByText(/Network Error/i)).toBeInTheDocument()
  })

  it('offers a retry action in the error state', async () => {
    const user = userEvent.setup()
    const { getHealthStatus } = await import('../services/health')
    vi.mocked(getHealthStatus)
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(healthyResponse)

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Backend unavailable/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.getByText(/Backend connected/i)).toBeInTheDocument()
    })
  })
})
