import { useEffect, useState } from 'react'
import { listMaterials } from '../services/materials'
import type { Material } from '../services/types'

interface MaterialSelectProps {
  label: string
  value: number | ''
  onChange: (materialId: number | '') => void
  error?: string
  /** Optional external catalogue. When omitted, the component fetches its own. */
  materials?: Material[]
}

/** Material dropdown shared by the movement-entry forms. Shows each material's
 * base unit only (per the UI no-unit-conversion decision): "Name (unit)". */
export function MaterialSelect({ label, value, onChange, error, materials }: MaterialSelectProps) {
  const [fetched, setFetched] = useState<Material[] | null>(null)
  const [failed, setFailed] = useState(false)
  const needsFetch = materials === undefined

  useEffect(() => {
    if (!needsFetch) {
      return
    }
    let cancelled = false
    const run = async () => {
      try {
        const page = await listMaterials()
        if (!cancelled) {
          setFetched(page.items)
        }
      } catch {
        if (!cancelled) {
          setFailed(true)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [needsFetch])

  const items = materials ?? fetched

  if (failed) {
    return <p className="field-error">Could not load materials for the picker.</p>
  }
  if (!items) {
    return <p className="empty-hint">Loading materials…</p>
  }

  return (
    <div className={error ? 'field field-invalid' : 'field'}>
      <label htmlFor={`material-${label}`}>{label}</label>
      <select
        id={`material-${label}`}
        value={value === '' ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      >
        <option value="">Select a material…</option>
        {items.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.base_unit})
          </option>
        ))}
      </select>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  )
}
