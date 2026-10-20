import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

/** Route guard: everything below it needs a session.
 *
 * The attempted location is handed to the login page so a deep link survives the
 * round trip. This is a UX guard only — the backend re-checks the bearer token on
 * every request, and a client-side redirect is never treated as authorization.
 */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status !== 'authenticated') {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    )
  }

  return <Outlet />
}
