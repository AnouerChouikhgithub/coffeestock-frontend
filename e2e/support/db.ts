import { execFileSync } from 'node:child_process'
import { DB_CONTAINER, DB_NAME, DB_USER } from './config'

/** Read-only assertions against the real PostgreSQL database.
 *
 * The browser can only show what the API returned; these queries prove the rows
 * actually landed (or did not, when a request was refused).
 */
export function query(sql: string): string {
  return execFileSync(
    'docker',
    ['exec', DB_CONTAINER, 'psql', '-U', DB_USER, '-d', DB_NAME, '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql],
    { encoding: 'utf8' },
  ).trim()
}

export function scalar(sql: string): string {
  const rows = query(sql).split('\n').filter((line) => line !== '')
  if (rows.length === 0) {
    return ''
  }
  return rows[0].trim()
}

/** Derived stock on hand for a material, straight from the ledger. */
export function stockOnHand(materialName: string): string {
  return scalar(
    `SELECT COALESCE(SUM(m.signed_quantity), 0)
       FROM stock_movement m
       JOIN material mat ON mat.id = m.material_id
      WHERE mat.name = '${materialName.replace(/'/g, "''")}'`,
  )
}

export function materialId(name: string): string {
  return scalar(`SELECT id FROM material WHERE name = '${name.replace(/'/g, "''")}'`)
}

export function countRows(table: string, where = 'TRUE'): string {
  return scalar(`SELECT COUNT(*) FROM ${table} WHERE ${where}`)
}
