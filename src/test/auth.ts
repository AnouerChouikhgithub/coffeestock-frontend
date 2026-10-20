import type { AuthSession, UserRole } from '../auth/types'

/** Test helper: put a valid session in sessionStorage so a mounted AuthProvider
 * restores it, exactly as it would after a page refresh. */
export function seedSession(role: UserRole = 'MANAGER', overrides: Partial<AuthSession> = {}): AuthSession {
  const session: AuthSession = {
    token: `test-token-${role.toLowerCase()}`,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    user: { id: 1, username: `${role.toLowerCase()}-user`, role },
    ...overrides,
  }
  window.sessionStorage.setItem('coffeestock.auth.session', JSON.stringify(session))
  return session
}

export function clearSeededSession(): void {
  window.sessionStorage.clear()
}
