import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import { ApiError } from '../services/api'
import type { AuthSession } from '../auth/types'

const session: AuthSession = {
  token: 'token',
  expiresAt: '2999-01-01T00:00:00+00:00',
  user: { id: 1, username: 'manager', role: 'MANAGER' },
}

function renderLogin(overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    status: 'anonymous',
    session: null,
    login: vi.fn().mockResolvedValue(session),
    logout: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }

  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthContext.Provider value={value}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  )

  return value
}

describe('LoginPage', () => {
  it('requires both fields before calling the API', async () => {
    const user = userEvent.setup()
    const { login } = renderLogin()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByText('Enter your username.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('submits trimmed credentials', async () => {
    const user = userEvent.setup()
    const { login } = renderLogin()

    await user.type(screen.getByLabelText('Username'), '  manager  ')
    await user.type(screen.getByLabelText('Password'), 'correct-horse')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(login).toHaveBeenCalledWith('manager', 'correct-horse')
  })

  it('shows a non-revealing error for invalid credentials', async () => {
    const user = userEvent.setup()
    renderLogin({
      login: vi
        .fn()
        .mockRejectedValue(
          new ApiError(401, { error: { code: 'AUTH_INVALID', message: 'Invalid credentials.' } }),
        ),
    })

    await user.type(screen.getByLabelText('Username'), 'manager')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Invalid username or password.')
    // Must not leak whether the account exists.
    expect(alert).not.toHaveTextContent(/unknown|not found|no such/i)
  })

  it('reports throttling using the backend message', async () => {
    const user = userEvent.setup()
    renderLogin({
      login: vi.fn().mockRejectedValue(
        new ApiError(429, {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many sign-in attempts. Try again in 60 seconds.',
          },
        }),
      ),
    })

    await user.type(screen.getByLabelText('Username'), 'manager')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/try again in 60 seconds/i)
  })

  it('disables the submit button while the request is in flight', async () => {
    const user = userEvent.setup()
    renderLogin({
      login: vi.fn().mockReturnValue(new Promise<AuthSession>(() => {})),
    })

    await user.type(screen.getByLabelText('Username'), 'manager')
    await user.type(screen.getByLabelText('Password'), 'correct-horse')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
  })

  it('does not render the form for an authenticated session', () => {
    renderLogin({ status: 'authenticated', session })

    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument()
  })
})
