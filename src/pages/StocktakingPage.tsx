import { useState, type FormEvent } from 'react'
import { Alert } from '../components/Alert'
import { DataTable, type Column } from '../components/DataTable'
import { MaterialSelect } from '../components/MaterialSelect'
import { TextField } from '../components/FormField'
import { commitStocktake, createStocktake } from '../services/stocktakes'
import { errorCode, errorMessage, fieldErrors, type Stocktake, type StocktakeCount } from '../services/types'

interface CountRow {
  materialId: number | ''
  counted: string
}

interface DraftState {
  stocktake: Stocktake
  /** count_id -> approver comment, for over-tolerance commits. */
  approvals: Record<number, string>
}

/** Stocktake workflow (REQ-051/052): build a draft with physical counts, review
 * the derived-vs-counted delta, then commit. Over-tolerance counts come back as
 * 409 APPROVAL_REQUIRED; the user adds comments and retries (OD-5). */
export function StocktakingPage() {
  const [rows, setRows] = useState<CountRow[]>([{ materialId: '', counted: '' }])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [saved, setSaved] = useState<Stocktake | null>(null)
  const [busy, setBusy] = useState(false)
  const [approvalError, setApprovalError] = useState<string | null>(null)

  const setRow = (index: number, patch: Partial<CountRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const createDraft = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setFormErrors({})
    setFormError(null)
    setSaved(null)
    setApprovalError(null)

    if (rows.some((row) => row.materialId === '')) {
      setFormErrors({ counts: 'Every row needs a material.' })
      setBusy(false)
      return
    }

    try {
      const stocktake = await createStocktake(
        rows.map((row) => ({
          material_id: Number(row.materialId),
          counted_quantity: row.counted.trim(),
        })),
      )
      setDraft({ stocktake, approvals: {} })
      setRows([{ materialId: '', counted: '' }])
    } catch (err) {
      setFormErrors(fieldErrors(err))
      setFormError(errorMessage(err, 'Could not create the stocktake draft.'))
    } finally {
      setBusy(false)
    }
  }

  const commit = async (approvals: Record<number, string>) => {
    if (!draft) return
    setBusy(true)
    setApprovalError(null)
    setFormError(null)

    try {
      const committed = await commitStocktake(
        draft.stocktake.id,
        Object.entries(approvals).map(([countId, comment]) => ({
          count_id: Number(countId),
          approver_comment: comment === '' ? null : comment,
        })),
      )
      setSaved(committed)
      setDraft(null)
    } catch (err) {
      if (errorCode(err) === 'APPROVAL_REQUIRED') {
        // Seed approval comments for the counts the server flagged.
        const seeded: Record<number, string> = { ...approvals }
        for (const count of draft.stocktake.counts) {
          if (seeded[count.id] === undefined) {
            seeded[count.id] = ''
          }
        }
        setDraft({ ...draft, approvals: seeded })
        setApprovalError(
          'Some counts exceed the tolerance (OD-5). Add an approver comment for each and commit again.',
        )
      } else {
        setFormError(errorMessage(err, 'Could not commit the stocktake.'))
      }
    } finally {
      setBusy(false)
    }
  }

  const countColumns: Column<StocktakeCount>[] = [
    { header: 'Count #', render: (c) => c.id },
    { header: 'Material', render: (c) => `#${c.material_id}` },
    { header: 'Counted', render: (c) => c.counted_quantity },
    { header: 'Derived at count', render: (c) => c.derived_stock_at_count },
    { header: 'Delta', render: (c) => c.delta },
  ]

  return (
    <div className="page">
      <h1>Stocktaking</h1>
      <p className="page-subtitle">
        Record physical counts. The server snapshots derived stock at draft time; committing posts
        one STOCKTAKE_DELTA movement per non-zero delta.
      </p>

      <section aria-labelledby="stocktake-create-heading" className="panel">
        <h2 id="stocktake-create-heading">New stocktake</h2>

        {saved ? (
          <Alert variant="success" title="Stocktake committed">
            <p>
              Stocktake #{saved.id} is COMMITTED
              {saved.committed_at ? ` (committed at ${saved.committed_at})` : ''}.
            </p>
          </Alert>
        ) : null}
        {formError ? (
          <Alert variant="error" title="Could not save">
            <p>{formError}</p>
          </Alert>
        ) : null}

        <form onSubmit={(e) => void createDraft(e)} noValidate>
          <fieldset className="items-fieldset">
            <legend>Counts</legend>
            {rows.map((row, index) => (
              <div className="item-row" key={index}>
                <MaterialSelect
                  label={`Count ${index + 1} material`}
                  value={row.materialId}
                  onChange={(id) => setRow(index, { materialId: id })}
                />
                <TextField
                  label="Counted quantity"
                  inputMode="decimal"
                  required
                  value={row.counted}
                  error={formErrors[`counts.${index + 1}.counted_quantity`]}
                  hint="Zero or positive, at most 3 decimals."
                  onChange={(e) => setRow(index, { counted: e.target.value })}
                />
              </div>
            ))}
            {formErrors.counts ? <p className="field-error">{formErrors.counts}</p> : null}
            <button
              type="button"
              className="button button-small"
              onClick={() => setRows([...rows, { materialId: '', counted: '' }])}
            >
              Add count
            </button>
          </fieldset>
          <button type="submit" className="button" disabled={busy}>
            {busy ? 'Saving…' : 'Create draft'}
          </button>
        </form>
      </section>

      {draft ? (
        <section aria-labelledby="stocktake-draft-heading" className="panel">
          <h2 id="stocktake-draft-heading">Draft #{draft.stocktake.id}</h2>
          <DataTable
            caption="Stocktake counts"
            columns={countColumns}
            rows={draft.stocktake.counts}
            rowKey={(c) => c.id}
          />

          {approvalError ? (
            <Alert variant="error" title="Approval needed">
              <p>{approvalError}</p>
            </Alert>
          ) : null}

          {draft.stocktake.counts.some((c) => draft.approvals[c.id] !== undefined)
            ? draft.stocktake.counts
                .filter((c) => draft.approvals[c.id] !== undefined)
                .map((c) => (
                  <TextField
                    key={c.id}
                    label={`Approver comment for count #${c.id} (delta ${c.delta})`}
                    value={draft.approvals[c.id]}
                    maxLength={500}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        approvals: { ...draft.approvals, [c.id]: e.target.value },
                      })
                    }
                  />
                ))
            : null}

          <div className="button-row">
            <button
              type="button"
              className="button button-accent"
              disabled={busy}
              onClick={() => void commit(draft.approvals)}
            >
              {busy ? 'Committing…' : 'Commit stocktake'}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
