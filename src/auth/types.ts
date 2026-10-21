/** Authentication types mirroring POST /api/login (docs/api-contract.md, OD-8 option A).
 *
 * The backend issues an opaque bearer token backed by a server-side session row
 * (only its SHA-256 hash is stored). `expires_at` is the ISO-8601 instant the
 * session stops authenticating.
 */

/** The three roles the backend knows about (App\Enum\UserRole). */
export type UserRole = 'OPERATOR' | 'MANAGER' | 'ADMIN'

export const USER_ROLES: readonly UserRole[] = ['OPERATOR', 'MANAGER', 'ADMIN']

/** Roles allowed to mutate stock-bearing records (materials, receipts, adjustments, stocktake commits). */
export const MANAGEMENT_ROLES: readonly UserRole[] = ['MANAGER', 'ADMIN']

export interface AuthUser {
  id: number
  username: string
  role: UserRole
}

/** A live credential: the token plus what we need to restore it after a refresh. */
export interface AuthSession {
  token: string
  /** ISO-8601 timestamp after which the token must not be sent. */
  expiresAt: string
  user: AuthUser
}

export function isUserRole(value: unknown): value is UserRole {
  return value === 'OPERATOR' || value === 'MANAGER' || value === 'ADMIN'
}

/** True when the role may mutate records the contract restricts to Manager+. */
export function canManage(role: UserRole): boolean {
  return MANAGEMENT_ROLES.includes(role)
}
