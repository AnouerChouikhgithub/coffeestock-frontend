import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Alert } from '../components/Alert'
import { DataTable, type Column } from '../components/DataTable'
import { LoadingState } from '../components/LoadingState'
import { SelectField, TextField } from '../components/FormField'
import { createMaterial, listMaterials } from '../services/materials'
import { errorMessage, fieldErrors, type Material } from '../services/types'

type ListState =
  | { kind: 'loading' }
  | { kind: 'ok'; items: Material[] }
  | { kind: 'error'; message: string }

const UNIT_OPTIONS = ['g', 'kg', 'ml', 'l', 'piece'] as const

export function MaterialsPage() {
  const [list, setList] = useState<ListState>({ kind: 'loading' })
  const [form, setForm] = useState({ name: '', type: 'RAW', base_unit: 'g', reorder: '', stocktake: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setList({ kind: 'loading' })
    try {
      const page = await listMaterials({ includeInactive: true })
      setList({ kind: 'ok', items: page.items })
    } catch (err) {
      setList({ kind: 'error', message: errorMessage(err, 'Failed to load materials.') })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const page = await listMaterials({ includeInactive: true })
        if (!cancelled) {
          setList({ kind: 'ok', items: page.items })
        }
      } catch (err) {
        if (!cancelled) {
          setList({ kind: 'error', message: errorMessage(err, 'Failed to load materials.') })
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const columns: Column<Material>[] = [
    { header: 'Name', render: (m) => m.name },
    { header: 'Type', render: (m) => m.type },
    { header: 'Base unit', render: (m) => m.base_unit },
    { header: 'Reorder threshold', render: (m) => m.reorder_threshold ?? '—' },
    { header: 'Stocktake threshold', render: (m) => m.stocktake_threshold ?? '—' },
    { header: 'Active', render: (m) => (m.is_active ? 'yes' : 'no') },
  ]

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFormErrors({})
    setFormError(null)

    try {
      await createMaterial({
        name: form.name.trim(),
        type: form.type as Material['type'],
        base_unit: form.base_unit,
        reorder_threshold: form.reorder.trim() === '' ? null : form.reorder.trim(),
        stocktake_threshold: form.stocktake.trim() === '' ? null : form.stocktake.trim(),
      })
      setForm({ name: '', type: 'RAW', base_unit: 'g', reorder: '', stocktake: '' })
      await load()
    } catch (err) {
      setFormErrors(fieldErrors(err))
      setFormError(errorMessage(err, 'Could not create the material.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h1>Materials</h1>
      <p className="page-subtitle">Catalogue of raw materials and consumables.</p>

      <section aria-labelledby="materials-list-heading" className="panel">
        <h2 id="materials-list-heading">All materials</h2>
        {list.kind === 'loading' ? <LoadingState label="Loading materials…" /> : null}
        {list.kind === 'error' ? (
          <Alert variant="error" title="Could not load materials">
            <p>{list.message}</p>
            <button type="button" className="button" onClick={() => void load()}>
              Retry
            </button>
          </Alert>
        ) : null}
        {list.kind === 'ok' && list.items.length === 0 ? (
          <p className="empty-title">No materials yet.</p>
        ) : null}
        {list.kind === 'ok' && list.items.length > 0 ? (
          <DataTable caption="Materials" columns={columns} rows={list.items} rowKey={(m) => m.id} />
        ) : null}
      </section>

      <section aria-labelledby="materials-create-heading" className="panel">
        <h2 id="materials-create-heading">Add a material</h2>
        {formError ? (
          <Alert variant="error" title="Could not save">
            <p>{formError}</p>
          </Alert>
        ) : null}
        <form onSubmit={(e) => void submit(e)} noValidate>
          <TextField
            label="Name"
            value={form.name}
            required
            maxLength={120}
            error={formErrors.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <SelectField
            label="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="RAW">RAW</option>
            <option value="CONSUMABLE">CONSUMABLE</option>
          </SelectField>
          <SelectField
            label="Base unit"
            value={form.base_unit}
            error={formErrors.base_unit}
            onChange={(e) => setForm({ ...form, base_unit: e.target.value })}
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Reorder threshold (optional)"
            inputMode="decimal"
            value={form.reorder}
            error={formErrors.reorder_threshold}
            hint="Decimal, at most 3 decimal places."
            onChange={(e) => setForm({ ...form, reorder: e.target.value })}
          />
          <TextField
            label="Stocktake threshold (optional)"
            inputMode="decimal"
            value={form.stocktake}
            error={formErrors.stocktake_threshold}
            hint="Variance tolerance used by stocktakes (OD-5)."
            onChange={(e) => setForm({ ...form, stocktake: e.target.value })}
          />
          <button type="submit" className="button" disabled={saving}>
            {saving ? 'Saving…' : 'Create material'}
          </button>
        </form>
      </section>
    </div>
  )
}
