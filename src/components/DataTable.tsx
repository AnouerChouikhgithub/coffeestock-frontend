import type { ReactNode } from 'react'

export interface Column<T> {
  header: string
  /** Cell renderer. Keep amounts as strings — never float-format them. */
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  caption: string
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => number | string
}

/** Simple accessible table. Caption is visible to screen readers; columns keep
 * raw decimal strings so no float conversion happens in the UI. */
export function DataTable<T>({ caption, columns, rows, rowKey }: DataTableProps<T>) {
  return (
    <table className="data-table">
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.header} scope="col">
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((col) => (
              <td key={col.header}>{col.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
