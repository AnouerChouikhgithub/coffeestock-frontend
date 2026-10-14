/** Dashboard-first navigation (pre-approved Phase 6 decision).
 *
 * The left sidebar exposes the operational sections. Pages beyond Dashboard are
 * placeholders until Phase 7 wires them to the backend; `status` lets the shell
 * label them so the nav stays honest about what is live.
 */

export interface NavItem {
  /** React Router path. */
  to: string
  label: string
  /** 'live' pages are reachable; 'planned' render a placeholder. */
  status: 'live' | 'planned'
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', status: 'live' },
  { to: '/materials', label: 'Materials', status: 'live' },
  { to: '/inventory', label: 'Inventory', status: 'live' },
  { to: '/receipts', label: 'Receipts', status: 'live' },
  { to: '/consumption', label: 'Consumption & Waste', status: 'live' },
  { to: '/adjustments', label: 'Adjustments', status: 'live' },
  { to: '/stocktaking', label: 'Stocktaking', status: 'live' },
  { to: '/reports', label: 'Reports', status: 'live' },
]
