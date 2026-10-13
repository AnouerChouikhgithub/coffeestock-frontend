import { useCallback, useEffect, useState } from 'react'
import { getHealthStatus, type HealthStatus } from '../services/health'
import { Alert } from '../components/Alert'
import { LoadingState } from '../components/LoadingState'
import { NAV_ITEMS } from './nav'

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: HealthStatus }
  | { kind: 'error'; message: string }

/** Dashboard: the landing page. Shows backend/database health (the one live
 * data source in Phase 6) plus links to the operational sections. */
export function DashboardPage() {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' })

  const load = useCallback(async () => {
    setHealth({ kind: 'loading' })
    try {
      const data = await getHealthStatus()
      setHealth({ kind: 'ok', data })
    } catch (err) {
      setHealth({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Backend connection failed.',
      })
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const data = await getHealthStatus()
        if (!cancelled) {
          setHealth({ kind: 'ok', data })
        }
      } catch (err) {
        if (!cancelled) {
          setHealth({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Backend connection failed.',
          })
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="page-subtitle">Internal operations overview.</p>

      <section aria-labelledby="backend-status-heading" className="panel">
        <h2 id="backend-status-heading">Backend status</h2>

        {health.kind === 'loading' ? <LoadingState label="Checking backend health…" /> : null}

        {health.kind === 'error' ? (
          <Alert variant="error" title="Backend unavailable">
            <p>{health.message}</p>
            <p>Start the Symfony API (see docs/DEVELOPMENT_SETUP.md), then retry.</p>
            <button type="button" className="button" onClick={() => void load()}>
              Retry
            </button>
          </Alert>
        ) : null}

        {health.kind === 'ok' ? (
          <div aria-live="polite">
            <p className="status-ok">
              Backend connected — {health.data.status} · {health.data.app} ·{' '}
              {health.data.environment}
            </p>
            <p className={health.data.database.connected ? 'status-ok' : 'status-error'}>
              Database: {health.data.database.message}
            </p>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="sections-heading" className="panel">
        <h2 id="sections-heading">Sections</h2>
        <ul className="section-links">
          {NAV_ITEMS.filter((item) => item.to !== '/').map((item) => (
            <li key={item.to}>
              <span className="section-name">{item.label}</span>
              <span className="nav-badge">{item.status === 'live' ? 'live' : 'coming in phase 7'}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
