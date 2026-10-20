/** Dashboard-first navigation (pre-approved Phase 6 decision).
 *
 * `status` keeps the shell honest about which sections are live. `roles`, when
 * present, hides a section the current role cannot act in — the backend enforces
 * the same matrix, so this is convenience, never a control.
 */

import { MANAGEMENT_ROLES, type UserRole } from '../auth/types'

export interface NavItem {
  /** React Router path. */
  to: string
  label: string
  /** 'live' pages are reachable; 'planned' render a placeholder. */
  status: 'live' | 'planned'
  /** Roles allowed to see this entry. Absent means every authenticated role. */
  roles?: readonly UserRole[]
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', status: 'live' },
  { to: '/materials', label: 'Materials', status: 'live' },
  { to: '/inventory', label: 'Inventory', status: 'live' },
  { to: '/receipts', label: 'Receipts', status: 'live' },
  { to: '/consumption', label: 'Consumption & Waste', status: 'live' },
  // Adjustments are a Manager+ action in docs/api-contract.md (18).
  { to: '/adjustments', label: 'Adjustments', status: 'live', roles: MANAGEMENT_ROLES },
  { to: '/stocktaking', label: 'Stocktaking', status: 'live' },
  { to: '/reports', label: 'Reports', status: 'live' },
  // Audit log is Admin-only (contract 29, REQ-110).
  { to: '/audit-logs', label: 'Audit log', status: 'live', roles: ['ADMIN'] },
]

export function visibleNavItems(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
}
