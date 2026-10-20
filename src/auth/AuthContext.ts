import { createContext } from 'react'
import type { AuthSession } from './types'

export type AuthStatus = 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  /** Null exactly when `status` is 'anonymous'. */
  session: AuthSession | null
  /** Exchanges credentials for a session and persists it. Throws ApiError on failure. */
  login: (username: string, password: string) => Promise<AuthSession>
  /** Revokes the server session (best effort) and always clears local state. */
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
