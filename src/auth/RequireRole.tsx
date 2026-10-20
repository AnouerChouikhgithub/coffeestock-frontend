import type { ReactNode } from 'react'
import { useAuth } from './useAuth'
import type { UserRole } from './types'

interface RequireRoleProps {
  /** Roles allowed to see the children. */
  roles: readonly UserRole[]
  children: ReactNode
  /** Rendered instead when the current role is not allowed (default: nothing). */
  fallback?: ReactNode
}

/** Hides UI the current role cannot use.
 *
 * Convenience, not a control: the backend enforces the same matrix and will
 * reject the request even if a user forces the UI to render.
 */
export function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const { session } = useAuth()

  if (!session || !roles.includes(session.user.role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
