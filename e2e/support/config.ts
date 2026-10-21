/** Shared E2E constants. Everything is overridable so CI can point at its own
 * service containers without editing files. */
export const API_ORIGIN = process.env.E2E_API_ORIGIN ?? 'http://127.0.0.1:8000'
export const DB_CONTAINER = process.env.E2E_DB_CONTAINER ?? 'coffeestock-backend-database-1'
export const DB_NAME = process.env.E2E_DB_NAME ?? 'coffeestock_e2e'
export const DB_USER = process.env.E2E_DB_USER ?? 'coffeestock'
// serverVersion is required: DBAL will not probe the server version itself here.
export const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  `postgresql://${DB_USER}:coffeestock@127.0.0.1:6543/${DB_NAME}?serverVersion=16&charset=utf8`
export const PHP_BIN = process.env.PHP_BIN ?? 'C:/xampp/php/php.exe'
export const BACKEND_DIR = '../coffeestock-backend'

export const PASSWORD = process.env.E2E_PASSWORD ?? 'e2e-correct-horse'

export const USERS = {
  operator: { username: 'e2e_operator', password: PASSWORD, role: 'OPERATOR' },
  manager: { username: 'e2e_manager', password: PASSWORD, role: 'MANAGER' },
  admin: { username: 'e2e_admin', password: PASSWORD, role: 'ADMIN' },
} as const

export type E2EUser = (typeof USERS)[keyof typeof USERS]
