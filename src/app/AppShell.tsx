import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { NAV_ITEMS, visibleNavItems } from './nav'

/** Application shell: fixed left sidebar + main region.
 *
 * Landmarks (banner/navigation/main) and the skip link are here so every page
 * inherits them. The header carries the signed-in identity and the sign-out
 * action; the nav is filtered by role. Individual pages own their headings.
 */
export function AppShell() {
  const { session, logout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const items = session ? visibleNavItems(session.user.role) : NAV_ITEMS

  async function handleSignOut() {
    setSigningOut(true)
    try {
      // Clearing the session makes RequireAuth redirect this tab to /login.
      await logout()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="shell-header">
        <span className="shell-brand">CoffeeStock</span>
        <span className="shell-tagline">Smart Inventory. Better Decisions.</span>
        {session ? (
          <div className="shell-user">
            <span className="shell-user-name">{session.user.username}</span>
            <span className="role-badge">{session.user.role}</span>
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        ) : null}
      </header>

      <nav className="shell-nav" aria-label="Primary">
        <ul>
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
              >
                {item.label}
                {item.status === 'planned' ? (
                  <span className="nav-badge" aria-hidden="true">
                    soon
                  </span>
                ) : null}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main id="main-content" className="shell-main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
