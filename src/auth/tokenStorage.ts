import { isUserRole, type AuthSession, type AuthUser } from './types'

/** Where the bearer token lives.
 *
 * Decision (Stage 2 token-storage review): `sessionStorage`, not `localStorage`.
 *
 * - Survives a page refresh, which is what "restore authentication state" needs.
 * - Scoped to one tab, so a second tab starts from scratch instead of silently
 *   reusing a credential the user never entered there.
 * - Discarded when the tab closes, which bounds the window an XSS payload could
 *   have exfiltrated a long-lived token for.
 * - Either way JavaScript can read the token (the backend contract is a bearer
 *   header, not an HttpOnly cookie), so XSS exposure is mitigated, not removed:
 *   the real control is the 8-hour server-side expiry plus `/api/logout`
 *   revocation.
 *
 * Every accessor is defensive: storage can throw (private mode, quota), and the
 * stored blob is untrusted input, so it is validated on the way in and out.
 */

const STORAGE_KEY = 'coffeestock.auth.session'

function storage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseSession(raw: string | null): AuthSession | null {
  if (!raw) {
    return null
  }

  let decoded: unknown
  try {
    decoded = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(decoded)) {
    return null
  }

  const { token, expiresAt, user } = decoded
  if (typeof token !== 'string' || token === '' || typeof expiresAt !== 'string') {
    return null
  }
  if (!isRecord(user) || typeof user.id !== 'number' || typeof user.username !== 'string') {
    return null
  }
  if (!isUserRole(user.role)) {
    return null
  }

  const parsedUser: AuthUser = { id: user.id, username: user.username, role: user.role }
  return { token, expiresAt, user: parsedUser }
}

/** True when the server-side session behind this token is no longer usable. */
export function isExpired(session: AuthSession, now: number = Date.now()): boolean {
  const expiresAt = Date.parse(session.expiresAt)
  if (Number.isNaN(expiresAt)) {
    // Fail closed: an unparseable expiry must not keep a credential alive.
    return true
  }
  return expiresAt <= now
}

/** Read and validate the stored session, dropping it if it has expired. */
export function readSession(now: number = Date.now()): AuthSession | null {
  const store = storage()
  if (!store) {
    return null
  }

  let raw: string | null
  try {
    raw = store.getItem(STORAGE_KEY)
  } catch {
    return null
  }

  const session = parseSession(raw)
  if (!session) {
    return null
  }
  if (isExpired(session, now)) {
    clearSession()
    return null
  }
  return session
}

export function writeSession(session: AuthSession): void {
  const store = storage()
  if (!store) {
    return
  }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Quota or private mode: the in-memory session still works for this tab.
  }
}

export function clearSession(): void {
  const store = storage()
  if (!store) {
    return
  }
  try {
    store.removeItem(STORAGE_KEY)
  } catch {
    // Nothing useful to do; the in-memory state is cleared by the provider.
  }
}

/** The token to send, or null when there is no usable session. */
export function readToken(now: number = Date.now()): string | null {
  return readSession(now)?.token ?? null
}
