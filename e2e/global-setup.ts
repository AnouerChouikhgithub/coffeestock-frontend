import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BACKEND_DIR, DATABASE_URL, DB_NAME, PHP_BIN, USERS } from './support/config'

/** Resets the disposable E2E database and seeds one account per role.
 *
 * This is also the project's "migrations from empty" proof: the schema is built
 * only from migrations, never from doctrine:schema:create.
 */

const backendPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', BACKEND_DIR)

function artisan(args: string[]): string {
  return execFileSync(PHP_BIN, ['bin/console', ...args], {
    cwd: backendPath,
    encoding: 'utf8',
    env: { ...process.env, APP_ENV: 'e2e' },
  })
}

function currentDatabaseOutput(): string {
  return artisan(['doctrine:query:sql', 'SELECT current_database()'])
}

export default async function globalSetup(): Promise<void> {
  if (new URL(DATABASE_URL).pathname !== `/${DB_NAME}`) {
    throw new Error(
      `Refusing to reset a database that is not the E2E one: DATABASE_URL targets ${new URL(DATABASE_URL).pathname}`,
    )
  }

  artisan(['doctrine:database:create', '--if-not-exists'])

  // Guard before any destructive step: prove the connection really points at the
  // disposable database rather than the developer's working one.
  const before = currentDatabaseOutput()
  if (!before.includes(DB_NAME)) {
    throw new Error(
      `Refusing to drop: the application connected to a database that is not ${DB_NAME}. Output: ${before.trim()}`,
    )
  }

  artisan(['doctrine:database:drop', '--force'])
  artisan(['doctrine:database:create'])
  artisan(['doctrine:migrations:migrate', '--no-interaction', '--allow-no-migration'])

  // Every account starts fresh, so a rerun never inherits a previous run's state.
  for (const user of Object.values(USERS)) {
    artisan(['app:user:create', user.username, `--role=${user.role}`, `--password=${user.password}`])
  }

  // The rate-limit counters are real state in the filesystem cache pool. A run
  // that signs in dozens of times from 127.0.0.1 would otherwise inherit the
  // previous run's IP budget and see 429s instead of exercising login.
  artisan(['cache:pool:clear', 'cache.rate_limiter'])
}
