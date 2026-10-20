import { useCallback, useEffect, useState } from 'react'
import { Alert } from '../components/Alert'
import { DataTable, type Column } from '../components/DataTable'
import { LoadingState } from '../components/LoadingState'
import { listAuditLogs, type AuditLogEntry } from '../services/auditLogs'
import { errorMessage } from '../services/types'

const PER_PAGE = 25

const columns: Column<AuditLogEntry>[] = [
  { header: 'When', render: (row) => row.occurred_at.replace('T', ' ').slice(0, 19) },
  { header: 'Actor', render: (row) => `#${row.actor_user_id}` },
  { header: 'Action', render: (row) => row.action },
  { header: 'Outcome', render: (row) => row.outcome },
  {
    header: 'Target',
    render: (row) => `${row.target_entity} #${row.target_entity_id}`,
  },
  { header: 'Detail', render: (row) => row.detail ?? '—' },
]

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; items: AuditLogEntry[]; total: number; page: number }
  | { kind: 'error'; message: string }

/** Admin-only audit trail browser (contract 29). The backend rejects non-admins
 * with 403; the nav entry is hidden for them as a convenience.
 */
export function AuditLogPage() {
  const [state, setState] = useState<State>({ kind: 'loading' })

  // Initial page: no synchronous setState, so the first paint is already 'loading'.
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const result = await listAuditLogs({ page: 1, per_page: PER_PAGE })
        if (!cancelled) {
          setState({ kind: 'ok', items: result.items, total: result.total, page: 1 })
        }
      } catch (err) {
        if (!cancelled) {
          setState({ kind: 'error', message: errorMessage(err, 'Failed to load the audit log.') })
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

  const load = useCallback(async (page: number) => {
    setState({ kind: 'loading' })
    try {
      const result = await listAuditLogs({ page, per_page: PER_PAGE })
      setState({ kind: 'ok', items: result.items, total: result.total, page })
    } catch (err) {
      setState({ kind: 'error', message: errorMessage(err, 'Failed to load the audit log.') })
    }
  }, [])

  const lastPage = state.kind === 'ok' ? Math.max(1, Math.ceil(state.total / PER_PAGE)) : 1

  return (
    <div className="page">
      <h1>Audit log</h1>
      <p className="page-subtitle">
        Append-only record of who performed each stock-affecting operation.
      </p>

      {state.kind === 'loading' ? <LoadingState label="Loading audit log…" /> : null}

      {state.kind === 'error' ? (
        <Alert variant="error" title="Could not load the audit log">
          <p>{state.message}</p>
          <button type="button" className="button" onClick={() => void load(1)}>
            Retry
          </button>
        </Alert>
      ) : null}

      {state.kind === 'ok' && state.items.length === 0 ? (
        <p className="empty-title">No audit entries yet.</p>
      ) : null}

      {state.kind === 'ok' && state.items.length > 0 ? (
        <>
          <DataTable
            caption="Audit log"
            columns={columns}
            rows={state.items}
            rowKey={(row) => row.id}
          />
          <div className="filter-actions">
            <button
              type="button"
              className="button button-secondary"
              disabled={state.page <= 1}
              onClick={() => void load(state.page - 1)}
            >
              Previous
            </button>
            <span className="page-subtitle" aria-live="polite">
              Page {state.page} of {lastPage} ({state.total} entries)
            </span>
            <button
              type="button"
              className="button button-secondary"
              disabled={state.page >= lastPage}
              onClick={() => void load(state.page + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
