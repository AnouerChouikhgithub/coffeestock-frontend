import { useState, type FormEvent } from 'react'
import { Alert } from '../components/Alert'
import { MaterialSelect } from '../components/MaterialSelect'
import { TextAreaField, TextField } from '../components/FormField'
import { recordConsumption, recordWaste } from '../services/usage'
import { errorCode, errorMessage, fieldErrors, type UsageResult } from '../services/types'

type Mode = 'consumption' | 'waste'

/** POST /api/consumptions and POST /api/wastes (REQ-040/041). Waste requires a
 * reason note (BR-15); quantities are validated server-side (scale 3, > 0). */
export function ConsumptionPage() {
  const [mode, setMode] = useState<Mode>('consumption')
  const [materialId, setMaterialId] = useState<number | ''>('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [saved, setSaved] = useState<UsageResult | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFormErrors({})
    setFormError(null)
    setBlocked(false)
    setSaved(null)

    // Client-side guard for the waste reason; the backend enforces the rest.
    if (mode === 'waste' && note.trim() === '') {
      setFormErrors({ note: 'A reason is required for waste (BR-15).' })
      setSaving(false)
      return
    }
    if (materialId === '') {
      setFormErrors({ material_id: 'Pick a material.' })
      setSaving(false)
      return
    }

    const input = {
      material_id: materialId,
      quantity: quantity.trim(),
      note: note.trim() === '' ? null : note.trim(),
    }

    try {
      const result = mode === 'waste' ? await recordWaste(input) : await recordConsumption(input)
      setSaved(result)
      setQuantity('')
      setNote('')
    } catch (err) {
      setBlocked(errorCode(err) === 'NEGATIVE_STOCK_BLOCKED')
      setFormErrors(fieldErrors(err))
      setFormError(errorMessage(err, 'Could not record the entry.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h1>Consumption &amp; Waste</h1>
      <p className="page-subtitle">
        Record stock leaving the shelf. Each entry posts one negative ledger movement.
      </p>

      <section aria-labelledby="usage-form-heading" className="panel">
        <h2 id="usage-form-heading">New entry</h2>

        <div className="mode-toggle" role="radiogroup" aria-label="Entry type">
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'consumption'}
            className={mode === 'consumption' ? 'button button-selected' : 'button'}
            onClick={() => setMode('consumption')}
          >
            Consumption
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'waste'}
            className={mode === 'waste' ? 'button button-selected' : 'button'}
            onClick={() => setMode('waste')}
          >
            Waste
          </button>
        </div>

        {saved ? (
          <Alert variant="success" title={mode === 'waste' ? 'Waste recorded' : 'Consumption recorded'}>
            <p>
              Entry #{saved.id} posted a movement of {saved.quantity} (movement #
              {saved.stock_movement_id}).
            </p>
          </Alert>
        ) : null}
        {formError ? (
          <Alert
            variant="error"
            title={blocked ? 'Blocked: stock would go negative' : 'Could not save'}
          >
            <p>{formError}</p>
            {blocked ? (
              <p>
                The entry would push stock below zero (OD-1). Reduce the quantity or use an
                adjustment with manager approval.
              </p>
            ) : null}
          </Alert>
        ) : null}

        <form onSubmit={(e) => void submit(e)} noValidate>
          <MaterialSelect
            label="Material"
            value={materialId}
            onChange={setMaterialId}
            error={formErrors.material_id}
          />
          <TextField
            label="Quantity"
            inputMode="decimal"
            required
            value={quantity}
            error={formErrors.quantity}
            hint="Positive decimal, at most 3 decimal places, in the material's base unit."
            onChange={(e) => setQuantity(e.target.value)}
          />
          <TextAreaField
            label={mode === 'waste' ? 'Reason (required)' : 'Note (optional)'}
            value={note}
            maxLength={500}
            error={formErrors.note}
            rows={3}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="submit" className="button" disabled={saving}>
            {saving ? 'Saving…' : mode === 'waste' ? 'Record waste' : 'Record consumption'}
          </button>
        </form>
      </section>
    </div>
  )
}
