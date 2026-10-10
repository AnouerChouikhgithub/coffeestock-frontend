import { useEffect, useState } from 'react'
import { getHealthStatus, type HealthStatus } from './services/health'

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const response = await getHealthStatus()
        setHealth(response)
        setError(null)
      } catch (err) {
        setHealth(null)
        setError(err instanceof Error ? err.message : 'Backend connection failed.')
      }
    }

    void loadHealth()
  }, [])

  return (
    <main>
      <div className="app-shell">
        <p className="eyebrow">Internal operations</p>
        <h1>CoffeeStock</h1>
        <p className="subtitle">Smart Inventory. Better Decisions.</p>

        <div className="status-panel" aria-live="polite">
          {health ? (
            <>
              <strong className="status-ok">Backend connected</strong>
              <span>
                {health.status} · {health.app} · {health.environment}
              </span>
            </>
          ) : (
            <>
              <strong className={error ? 'status-error' : 'status-ok'}>
                {error ? 'Backend unavailable' : 'Checking backend health...'}
              </strong>
              <span>{error ?? 'Waiting for the Symfony API to respond.'}</span>
            </>
          )}
        </div>

        <p className="meta">
          Frontend target: {import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'}
        </p>
      </div>
    </main>
  )
}

export default App
