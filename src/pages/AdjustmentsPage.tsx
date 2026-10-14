import { useState, type FormEvent } from 'react'
import { Alert } from '../components/Alert'
import { MaterialSelect } from '../components/MaterialSelect'
import { TextAreaField, TextField } from '../components/FormField'
import { createAdjustment } from '../services/adjustments'
import { errorCode, errorMessage, fieldErrors, type AdjustmentResult } from '../services/types'

/** POST /api/adjustments (REQ-050): signed delta + mandatory reason. The server
 * answers 409 APPROVAL_REQUIRED / NEGATIVE_STOCK_BLOCKED; resubmitting with
 * approved=true records the approval row (OD-1/OD-5). */
export function AdjustmentsPage() {
  const [materialId, setMaterialId] = useState<number | ''>('')
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [saved, setSaved] = useState<AdjustmentResult | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent, approved: boolean) => {
    event.preventDefault()
    setSaving(true)
    setFormErrors({})
    setFormError(null)
    setNeedsApproval(false)
    setSaved(null)

    if (materialId === '') {
      setFormErrors({ material_id: 'Pick a material.' })
      setSaving(false)
      return
    }

    try {
      const result = await createAdjustment({
        material_id: materialId,
        signed_delta: delta.trim(),
        reason: reason.trim(),
        approved,
      })
      setSaved(result)
      setDelta('')
      setReason('')
    } catch (err) {
      const code = errorCode(err)
      setNeedsApproval(code === 'APPROVAL_REQUIRED' || code === 'NEGATIVE_STOCK_BLOCKED')
      setFormErrors(fieldErrors(err))
      setFormError(errorMessage(err, 'Could not record the adjustment.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h1>Adjustments</h1>
      <p className="page-subtitle">
        Signed corrections with a mandatory reason. Every adjustment is a new ledger movement —
        nothing is ever edited.
      </p>

      <section aria-labelledby="adjustments-form-heading" className="panel">
        <h2 id="adjustments-form-heading">New adjustment</h2>

        {saved ? (
          <Alert variant="success" title="Adjustment recorded">
            <p>
              Adjustment #{saved.id}: {saved.signed_delta} (movement #{saved.stock_movement_id})
              {saved.approval_id !== null ? ` · approval #${saved.approval_id}` : ''}.
            </p>
          </Alert>
        ) : null}
        {formError ? (
          <Alert
            variant="error"
            title={needsApproval ? 'Approval required' : 'Could not save'}
          >
            <p>{formError}</p>
            {needsApproval ? (
              <p>Press “Save with approval” to record this adjustment together with its approval.</p>
            ) : null}
          </Alert>
        ) : null}

        <form onSubmit={(e) => void submit(e, false)} noValidate>
          <MaterialSelect
            label="Material"
            value={materialId}
            onChange={setMaterialId}
            error={formErrors.material_id}
          />
          <TextField
            label="Signed delta"
            inputMode="decimal"
            required
            value={delta}
            error={formErrors.signed_delta}
            hint="Negative removes stock, positive adds it. Non-zero, at most 3 decimals."
            onChange={(e) => setDelta(e.target.value)}
          />
          <TextAreaField
            label="Reason"
            required
            value={reason}
            maxLength={500}
            error={formErrors.reason}
            rows={3}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="button-row">
            <button type="submit" className="button" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="button button-accent"
              disabled={saving}
              onClick={(e) => void submit(e, true)}
            >
              Save with approval
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
