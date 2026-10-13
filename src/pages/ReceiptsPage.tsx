import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Alert } from '../components/Alert'
import { DataTable, type Column } from '../components/DataTable'
import { LoadingState } from '../components/LoadingState'
import { MaterialSelect } from '../components/MaterialSelect'
import { SelectField, TextField } from '../components/FormField'
import { createReceipt, listReceipts } from '../services/receipts'
import { listSuppliers } from '../services/suppliers'
import { errorMessage, fieldErrors, type ReceiptListItem, type Supplier } from '../services/types'

type ListState =
  | { kind: 'loading' }
  | { kind: 'ok'; items: ReceiptListItem[] }
  | { kind: 'error'; message: string }

interface ItemRow {
  materialId: number | ''
  quantity: string
  batchNumber: string
}

export function ReceiptsPage() {
  const [list, setList] = useState<ListState>({ kind: 'loading' })
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [form, setForm] = useState({
    supplierId: '' as number | '',
    deliveryDate: '',
    note: '',
  })
  const [rows, setRows] = useState<ItemRow[]>([{ materialId: '', quantity: '', batchNumber: '' }])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setList({ kind: 'loading' })
    try {
      const page = await listReceipts()
      setList({ kind: 'ok', items: page.items })
    } catch (err) {
      setList({ kind: 'error', message: errorMessage(err, 'Failed to load receipts.') })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const page = await listReceipts()
        if (!cancelled) {
          setList({ kind: 'ok', items: page.items })
        }
      } catch (err) {
        if (!cancelled) {
          setList({ kind: 'error', message: errorMessage(err, 'Failed to load receipts.') })
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const page = await listSuppliers({ perPage: 100 })
        if (!cancelled) {
          setSuppliers(page.items.filter((s) => s.is_active))
        }
      } catch {
        // The supplier picker simply stays empty; the form surfaces the error on submit.
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const columns: Column<ReceiptListItem>[] = [
    { header: '#', render: (r) => r.id },
    { header: 'Supplier', render: (r) => `#${r.supplier_id}` },
    { header: 'Delivery date', render: (r) => r.delivery_date },
    { header: 'Items', render: (r) => r.item_count },
    { header: 'Created', render: (r) => r.created_at },
  ]

  const setRow = (index: number, patch: Partial<ItemRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFormErrors({})
    setFormError(null)
    setSaved(false)

    try {
      await createReceipt({
        supplier_id: Number(form.supplierId),
        delivery_date: form.deliveryDate,
        note: form.note.trim() === '' ? null : form.note.trim(),
        items: rows.map((row) => ({
          material_id: Number(row.materialId),
          quantity: row.quantity.trim(),
          batch:
            row.batchNumber.trim() === ''
              ? null
              : { batch_number: row.batchNumber.trim() },
        })),
      })
      setSaved(true)
      setForm({ supplierId: '', deliveryDate: '', note: '' })
      setRows([{ materialId: '', quantity: '', batchNumber: '' }])
      await load()
    } catch (err) {
      setFormErrors(fieldErrors(err))
      setFormError(errorMessage(err, 'Could not record the receipt.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h1>Receipts</h1>
      <p className="page-subtitle">Deliveries from suppliers; each item posts a positive ledger movement.</p>

      <section aria-labelledby="receipts-list-heading" className="panel">
        <h2 id="receipts-list-heading">Recent receipts</h2>
        {list.kind === 'loading' ? <LoadingState label="Loading receipts…" /> : null}
        {list.kind === 'error' ? (
          <Alert variant="error" title="Could not load receipts">
            <p>{list.message}</p>
            <button type="button" className="button" onClick={() => void load()}>
              Retry
            </button>
          </Alert>
        ) : null}
        {list.kind === 'ok' && list.items.length === 0 ? (
          <p className="empty-title">No receipts recorded yet.</p>
        ) : null}
        {list.kind === 'ok' && list.items.length > 0 ? (
          <DataTable caption="Receipts" columns={columns} rows={list.items} rowKey={(r) => r.id} />
        ) : null}
      </section>

      <section aria-labelledby="receipts-create-heading" className="panel">
        <h2 id="receipts-create-heading">Record a receipt</h2>
        {saved ? (
          <Alert variant="success" title="Receipt recorded">
            <p>The receipt and its ledger movements were saved.</p>
          </Alert>
        ) : null}
        {formError ? (
          <Alert variant="error" title="Could not save">
            <p>{formError}</p>
          </Alert>
        ) : null}

        <form onSubmit={(e) => void submit(e)} noValidate>
          <SelectField
            label="Supplier"
            value={form.supplierId === '' ? '' : String(form.supplierId)}
            required
            error={formErrors.supplier_id}
            onChange={(e) =>
              setForm({ ...form, supplierId: e.target.value === '' ? '' : Number(e.target.value) })
            }
          >
            <option value="">Select a supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Delivery date"
            type="date"
            required
            value={form.deliveryDate}
            error={formErrors.delivery_date}
            hint="Must be today or earlier."
            onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
          />

          <fieldset className="items-fieldset">
            <legend>Items</legend>
            {rows.map((row, index) => (
              <div className="item-row" key={index}>
                <MaterialSelect
                  label={`Item ${index + 1} material`}
                  value={row.materialId}
                  onChange={(id) => setRow(index, { materialId: id })}
                  error={formErrors[`items.${index}.material_id`]}
                />
                <TextField
                  label="Quantity"
                  inputMode="decimal"
                  required
                  value={row.quantity}
                  error={formErrors[`items.${index}.quantity`]}
                  hint="Decimal, at most 3 decimal places."
                  onChange={(e) => setRow(index, { quantity: e.target.value })}
                />
                <TextField
                  label="Batch number (optional)"
                  value={row.batchNumber}
                  error={formErrors[`items.${index}.batch.batch_number`]}
                  hint="Required for RAW materials (OD-6)."
                  onChange={(e) => setRow(index, { batchNumber: e.target.value })}
                />
              </div>
            ))}
            <button
              type="button"
              className="button button-small"
              onClick={() => setRows([...rows, { materialId: '', quantity: '', batchNumber: '' }])}
            >
              Add item
            </button>
          </fieldset>

          <TextField
            label="Note (optional)"
            value={form.note}
            maxLength={500}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />

          <button type="submit" className="button" disabled={saving}>
            {saving ? 'Saving…' : 'Record receipt'}
          </button>
        </form>
      </section>
    </div>
  )
}
