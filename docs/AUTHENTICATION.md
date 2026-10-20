# Frontend authentication

Phase 10. The UI now authenticates against the existing Symfony API; nothing in
the backend contract changed to make this possible.

## Flow

```
/login  ──POST /api/login {username,password}──▶  { token, expires_at, user }
   │                                                    │
   │                                    sessionStorage  │
   ▼                                                    ▼
RequireAuth guard ──▶ AppShell ──▶ pages ──▶ apiClient (Authorization: Bearer …)
                                                   │
                                            401 ──▶ clear session ──▶ /login
```

Files:

| File | Responsibility |
| ---- | -------------- |
| `src/auth/types.ts` | `UserRole`, `AuthUser`, `AuthSession`, role helpers |
| `src/auth/tokenStorage.ts` | persist / restore / expire the session |
| `src/auth/AuthProvider.tsx` | login, logout, restoration, 401 subscription |
| `src/auth/sessionEvents.ts` | 401 event bus (keeps `services/` free of React) |
| `src/auth/RequireAuth.tsx` | route guard, remembers the attempted deep link |
| `src/auth/RequireRole.tsx` | role-based UI visibility helper |
| `src/pages/LoginPage.tsx` | login screen, validation, error states |
| `src/services/api.ts` | bearer injection + contract error normalisation |
| `src/services/download.ts` | authenticated CSV download |
| `src/pages/AuditLogPage.tsx` | Admin-only audit trail (was unreachable in the UI) |

## Token storage decision

`sessionStorage`, not `localStorage`.

* Survives a refresh — which is what "restore authentication after reload" needs —
  and the provider reads it in the state initializer, so there is no redirect
  flash on refresh.
* Scoped to the tab: a second tab must sign in rather than silently inheriting a
  credential the user never entered there.
* Discarded on tab close, bounding the window for a stolen token.
* The contract is a bearer header, so JavaScript must be able to read the token;
  XSS exposure is mitigated (short tab lifetime, 8-hour server expiry, explicit
  revocation on logout), not eliminated. An HttpOnly cookie would require a
  backend contract change and was deliberately not attempted.

Expiry is checked client-side on every read; an expired or unparseable
`expires_at` fails closed (treated as signed out) and the stored blob is deleted.

## API integration

`apiClient` is the only axios instance. A request interceptor attaches
`Authorization: Bearer <token>` when the tab holds a usable session; a response
interceptor normalises every failure into `ApiError` (`status`, contract `code`,
`body`) and turns a 401 from anything **except** `/login` into a session-expiry
signal that clears storage and redirects. A rejected login stays on the form —
clearing storage there would wipe a session the user still legitimately has.

This covers inventory, materials, suppliers, receipts, consumption/waste,
adjustments, stocktaking, reports and audit logs, because they all route through
the same instance.

## CSV export

`GET /api/reports/*/export.csv` is protected, so the previous `<a href download>`
could not work — the browser sent no token. Exports now go through
`downloadCsv()`:

1. fetch the file with `responseType: 'blob'` through the authenticated client;
2. reject a non-`text/csv` response (a JSON/HTML error page is never saved as a
   CSV file);
3. derive the filename from `Content-Disposition` (exposed cross-origin via
   `nelmio_cors.expose_headers`) or fall back to a sensible default;
4. save the Blob and revoke the object URL.

The page shows an exporting state and an error alert if the export fails.

## Role-aware UI

Navigation is filtered by role (`nav.ts` `roles`): Adjustments is Manager+,
Audit log is Admin-only. The audit page is reachable by URL for anyone
authenticated, and then shows the server's 403 as an error state — the backend
remains the enforcement point. UI visibility is convenience, never control.

## Tests (Vitest, mocked API)

`src/auth/tokenStorage.test.ts`, `src/services/api.test.ts`,
`src/services/download.test.ts`, `src/pages/LoginPage.test.tsx`,
`src/auth/RequireAuth.test.tsx`, `src/app/App.test.tsx`,
`src/pages/ReportsPage.test.tsx` — 67 tests covering the login form states,
bearer attachment, 401 handling, refresh restoration, expiry, logout, CSV
download success/failure and role-aware navigation.

Browser-to-database verification lives in `e2e/` (Playwright); see
`docs/RELEASE_READINESS.md`.
