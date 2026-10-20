import { apiClient } from './api'
import type { AuthSession, AuthUser } from '../auth/types'

/** Wire shape of POST /api/login (docs/api-contract.md endpoint 2). */
interface LoginResponse {
  token: string
  expires_at: string
  user: AuthUser
}

/** POST /api/login — exchange credentials for an opaque bearer token. */
export async function loginRequest(username: string, password: string): Promise<AuthSession> {
  const { data } = await apiClient.post<LoginResponse>('/login', { username, password })
  return {
    token: data.token,
    expiresAt: data.expires_at,
    user: data.user,
  }
}

/** POST /api/logout — revoke the server-side session behind `token`.
 *
 * The token is passed explicitly because the caller clears local storage first
 * (see AuthProvider.logout): by the time this runs the tab no longer holds it.
 * Best effort by design — a failure here must not strand a signed-in UI.
 */
export async function logoutRequest(token: string): Promise<void> {
  await apiClient.post('/logout', null, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
