import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('../services/health', () => ({
  getHealthStatus: vi.fn().mockResolvedValue({
    status: 'ok',
    app: 'coffeestock-backend',
    environment: 'dev',
    database: {
      connected: true,
      driver: 'pgsql',
      message: 'Database connection is active.',
    },
  }),
}))

describe('App', () => {
  it('renders the CoffeeStock shell and the backend status', async () => {
    render(<App />)

    expect(screen.getByText('CoffeeStock')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/Backend connected/i)).toBeInTheDocument()
    })
  })
})
