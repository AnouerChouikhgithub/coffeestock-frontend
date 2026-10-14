import { useCallback, useEffect, useState } from 'react'
import { Alert } from '../components/Alert'
import { DataTable, type Column } from '../components/DataTable'
import { LoadingState } from '../components/LoadingState'
import { SelectField } from '../components/FormField'
import { listInventory, listMovements } from '../services/inventory'
import { errorMessage, type InventoryItem, type Movement } from '../services/types'

type ListState =
  | { kind: 'loading' }
  | { kind: 'ok'; items: InventoryItem[] }
  | { kind: 'error'; message: string }

type MovementsState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; material: InventoryItem; items: Movement[] }
  | { kind: 'error'; message: string }

const MOVEMENT_FILTERS = ['', 'RECEIPT', 'CONSUMPTION', 'WASTE', 'ADJUSTMENT', 'STOCKTAKE_DELTA']

export function InventoryPage() {
  const [list, setList] = useState<ListState>({ kind: 'loading' })
  const [movements, setMovements] = useState<MovementsState>({ kind: 'idle' })
  const [filter, setFilter] = useState('')

  const load = useCallback(async () => {
    setList({ kind: 'loading' })
    try {
      const page = await listInventory()
      setList({ kind: 'ok', items: page.items })
    } catch (err) {
      setList({ kind: 'error', message: errorMessage(err, 'Failed to load inventory.') })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const page = await listInventory()
        if (!cancelled) {
          setList({ kind: 'ok', items: page.items })
        }
      } catch (err) {
        if (!cancelled) {
          setList({ kind: 'error', message: errorMessage(err, 'Failed to load inventory.') })
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const openMovements = useCallback(async (material: InventoryItem, movementType: string) => {
    setMovements({ kind: 'loading' })
    try {
      const page = await listMovements(material.material_id, {
        perPage: 25,
        movement_type: movementType === '' ? undefined : movementType,
      })
      setMovements({ kind: 'ok', material, items: page.items })
    } catch (err) {
      setMovements({ kind: 'error', message: errorMessage(err, 'Failed to load movements.') })
    }
  }, [])

  const columns: Column<InventoryItem>[] = [
    { header: 'Name', render: (i) => i.name },
    { header: 'Type', render: (i) => i.type },
    { header: 'Base unit', render: (i) => i.base_unit },
    {
      header: 'Stock on hand',
      render: (i) => (
        <span className={i.below_threshold ? 'qty-below' : undefined}>{i.stock_on_hand}</span>
      ),
    },
    {
      header: 'Below threshold',
      render: (i) => (i.below_threshold ? 'yes' : 'no'),
    },
    {
      header: '',
      render: (i) => (
        <button
          type="button"
          className="button button-small"
          onClick={() => void openMovements(i, filter)}
        >
          Movements
        </button>
      ),
    },
  ]

  const movementColumns: Column<Movement>[] = [
    { header: 'Type', render: (m) => m.movement_type },
    { header: 'Signed quantity', render: (m) => m.signed_quantity },
    { header: 'Occurred at', render: (m) => m.occurred_at },
    { header: 'Source', render: (m) => `${m.source_document_type} #${m.source_document_id}` },
  ]

  return (
    <div className="page">
      <h1>Inventory</h1>
      <p className="page-subtitle">Current stock on hand, derived from the ledger.</p>

      <section aria-labelledby="inventory-list-heading" className="panel">
        <h2 id="inventory-list-heading">Stock on hand</h2>
        {list.kind === 'loading' ? <LoadingState label="Loading inventory…" /> : null}
        {list.kind === 'error' ? (
          <Alert variant="error" title="Could not load inventory">
            <p>{list.message}</p>
            <button type="button" className="button" onClick={() => void load()}>
              Retry
            </button>
          </Alert>
        ) : null}
        {list.kind === 'ok' && list.items.length === 0 ? (
          <p className="empty-title">No materials in inventory yet.</p>
        ) : null}
        {list.kind === 'ok' && list.items.length > 0 ? (
          <DataTable caption="Inventory" columns={columns} rows={list.items} rowKey={(i) => i.material_id} />
        ) : null}
      </section>

      <section aria-labelledby="movements-heading" className="panel">
        <h2 id="movements-heading">Movement history</h2>
        <SelectField
          label="Filter by movement type"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {MOVEMENT_FILTERS.map((f) => (
            <option key={f || 'all'} value={f}>
              {f === '' ? 'All types' : f}
            </option>
          ))}
        </SelectField>

        {movements.kind === 'idle' ? (
          <p className="empty-hint">Choose “Movements” on a material to see its ledger history.</p>
        ) : null}
        {movements.kind === 'loading' ? <LoadingState label="Loading movements…" /> : null}
        {movements.kind === 'error' ? (
          <Alert variant="error" title="Could not load movements">
            <p>{movements.message}</p>
          </Alert>
        ) : null}
        {movements.kind === 'ok' && movements.items.length === 0 ? (
          <p className="empty-title">No movements for this filter.</p>
        ) : null}
        {movements.kind === 'ok' && movements.items.length > 0 ? (
          <>
            <p className="empty-hint">
              {movements.material.name} (base unit: {movements.material.base_unit})
            </p>
            <DataTable
              caption={`Movements for ${movements.material.name}`}
              columns={movementColumns}
              rows={movements.items}
              rowKey={(m) => m.id}
            />
          </>
        ) : null}
      </section>
    </div>
  )
}
