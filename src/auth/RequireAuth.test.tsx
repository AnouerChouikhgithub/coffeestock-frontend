import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { RequireAuth } from './RequireAuth'
import { clearSeededSession, seedSession } from '../test/auth'

function ProtectedArea() {
  return <h1>Protected area</h1>
}

function LoginStub() {
  return <h1>Sign in</h1>
}

function renderAt(path: string) {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginStub />} />
          <Route element={<RequireAuth />}>
            <Route path="/materials" element={<ProtectedArea />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

beforeEach(() => {
  clearSeededSession()
})

describe('RequireAuth', () => {
  it('redirects an anonymous visitor to the login screen', () => {
    renderAt('/materials')

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByText('Protected area')).not.toBeInTheDocument()
  })

  it('restores a stored session, so a refresh keeps the protected route', () => {
    seedSession('MANAGER')

    renderAt('/materials')

    expect(screen.getByRole('heading', { name: 'Protected area' })).toBeInTheDocument()
  })

  it('treats an expired stored session as signed out', () => {
    seedSession('MANAGER', { expiresAt: '2020-01-01T00:00:00+00:00' })

    renderAt('/materials')

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })
})
