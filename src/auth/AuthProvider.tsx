import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { onUnauthorized } from './sessionEvents'
import { clearSession, readSession, writeSession } from './tokenStorage'
import { loginRequest, logoutRequest } from '../services/auth'
import type { AuthSession } from './types'

/** Owns the single source of truth for "who is signed in".
 *
 * Restoration happens in the state initializer, so the first render already
 * knows whether the tab has a usable session — protected routes do not flash a
 * redirect to /login on refresh.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession())

  // A 401 from any request (expired or revoked token) signs the tab out.
  useEffect(() => onUnauthorized(() => setSession(null)), [])

  const login = useCallback(async (username: string, password: string): Promise<AuthSession> => {
    const next = await loginRequest(username, password)
    writeSession(next)
    setSession(next)
    return next
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    const token = session?.token ?? null

    // Clear locally first, so sign-out is immediate and cannot be undone by a
    // navigation that interrupts the revocation request (a race the end-to-end
    // suite exposed: reload right after clicking "Sign out" restored the session).
    clearSession()
    setSession(null)

    if (!token) {
      return
    }
    try {
      await logoutRequest(token)
    } catch {
      // Revocation is best effort: an offline or already-expired token must not
      // resurrect the signed-in UI.
    }
  }, [session])

  const value = useMemo<AuthContextValue>(
    () => ({
      status: session ? 'authenticated' : 'anonymous',
      session,
      login,
      logout,
    }),
    [session, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
