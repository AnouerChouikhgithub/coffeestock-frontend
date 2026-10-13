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
  { to: '/materials', label: 'Materials', status: 'planned' },
  { to: '/receipts', label: 'Receipts', status: 'planned' },
  { to: '/consumption', label: 'Consumption & Waste', status: 'planned' },
  { to: '/adjustments', label: 'Adjustments', status: 'planned' },
  { to: '/stocktaking', label: 'Stocktaking', status: 'planned' },
  { to: '/reports', label: 'Reports', status: 'planned' },
]
