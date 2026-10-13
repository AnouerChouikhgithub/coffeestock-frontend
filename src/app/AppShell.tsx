import { NavLink, Outlet } from 'react-router-dom'
import { NAV_ITEMS } from './nav'

/** Application shell: fixed left sidebar + main region.
 *
 * Landmarks (banner/navigation/main) and the skip link are here so every page
 * inherits them. Individual pages own their own headings and states.
 */
export function AppShell() {
  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="shell-header">
        <span className="shell-brand">CoffeeStock</span>
        <span className="shell-tagline">Smart Inventory. Better Decisions.</span>
      </header>

      <nav className="shell-nav" aria-label="Primary">
        <ul>
          {NAV_ITEMS.map((item) => (
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
