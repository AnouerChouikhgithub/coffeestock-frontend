import { useCallback, useEffect, useState } from 'react'
import { Alert } from '../components/Alert'
import { DataTable, type Column } from '../components/DataTable'
import { SelectField, TextField } from '../components/FormField'
import { LoadingState } from '../components/LoadingState'
import { MaterialSelect } from '../components/MaterialSelect'
import {
  getInventoryReport,
  getMovementsReport,
  inventoryCsvUrl,
  movementsCsvUrl,
  type MovementReportRow,
} from '../services/reports'
import { errorMessage, type InventoryItem, type MovementType } from '../services/types'

type ListState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; items: T[] }
  | { kind: 'error'; message: string }

const MATERIAL_TYPES = ['', 'RAW', 'CONSUMABLE']
const MOVEMENT_TYPES: Array<'' | MovementType> = [
  '',
  'RECEIPT',
  'CONSUMPTION',
  'WASTE',
  'ADJUSTMENT',
  'STOCKTAKE_DELTA',
]

const inventoryColumns: Column<InventoryItem>[] = [
  { header: 'Name', render: (i) => i.name },
  { header: 'Type', render: (i) => i.type },
  { header: 'Base unit', render: (i) => i.base_unit },
  {
    header: 'Stock on hand',
    render: (i) => (
      <span className={i.below_threshold ? 'qty-below' : undefined}>{i.stock_on_hand}</span>
    ),
  },
  { header: 'Below threshold', render: (i) => (i.below_threshold ? 'yes' : 'no') },
]

const movementColumns: Column<MovementReportRow>[] = [
  { header: 'Material ID', render: (r) => String(r.material_id) },
  { header: 'Movement type', render: (r) => r.movement_type },
  { header: 'Total quantity', render: (r) => r.total_quantity },
  { header: 'Movement count', render: (r) => String(r.movement_count) },
]

export function ReportsPage() {
  const [inventory, setInventory] = useState<ListState<InventoryItem>>({ kind: 'loading' })
  const [movements, setMovements] = useState<ListState<MovementReportRow>>({ kind: 'idle' })
  const [inventoryType, setInventoryType] = useState('')
  const [materialId, setMaterialId] = useState<number | ''>('')
  const [movementType, setMovementType] = useState<'' | MovementType>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const loadInventory = useCallback(async (type: string) => {
    setInventory({ kind: 'loading' })
    try {
      const page = await getInventoryReport(type === '' ? '' : (type as 'RAW' | 'CONSUMABLE'))
      setInventory({ kind: 'ok', items: page.items })
    } catch (err) {
      setInventory({ kind: 'error', message: errorMessage(err, 'Failed to load inventory report.') })
    }
  }, [])

  const loadMovements = useCallback(
    async (filters: {
      materialId: number | ''
      movementType: '' | MovementType
      dateFrom: string
      dateTo: string
    }) => {
      setMovements({ kind: 'loading' })
      try {
        const page = await getMovementsReport({
          material_id: filters.materialId === '' ? undefined : filters.materialId,
          movement_type: filters.movementType === '' ? undefined : filters.movementType,
          date_from: filters.dateFrom === '' ? undefined : filters.dateFrom,
          date_to: filters.dateTo === '' ? undefined : filters.dateTo,
        })
        setMovements({ kind: 'ok', items: page.items })
      } catch (err) {
        setMovements({ kind: 'error', message: errorMessage(err, 'Failed to load movement report.') })
      }
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const page = await getInventoryReport('')
        if (!cancelled) {
          setInventory({ kind: 'ok', items: page.items })
        }
      } catch (err) {
        if (!cancelled) {
          setInventory({ kind: 'error', message: errorMessage(err, 'Failed to load inventory report.') })
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
      <h1>Reports</h1>
      <p className="page-subtitle">
        Operational reports derived from the movement ledger, with CSV export.
      </p>

      <section aria-labelledby="inventory-report-heading" className="panel">
        <h2 id="inventory-report-heading">Current inventory report</h2>
        <div className="filter-row">
          <SelectField
            label="Filter by material type"
            value={inventoryType}
            onChange={(e) => {
              setInventoryType(e.target.value)
              void loadInventory(e.target.value)
            }}
          >
            {MATERIAL_TYPES.map((t) => (
              <option key={t || 'all'} value={t}>
                {t === '' ? 'All types' : t}
              </option>
            ))}
          </SelectField>
          <a
            className="button"
            href={inventoryCsvUrl(inventoryType === '' ? '' : (inventoryType as 'RAW' | 'CONSUMABLE'))}
            download
          >
            Export CSV
          </a>
        </div>

        {inventory.kind === 'idle' || inventory.kind === 'loading' ? (
          <LoadingState label="Loading inventory report…" />
        ) : null}
        {inventory.kind === 'error' ? (
          <Alert variant="error" title="Could not load inventory report">
            <p>{inventory.message}</p>
            <button type="button" className="button" onClick={() => void loadInventory(inventoryType)}>
              Retry
            </button>
          </Alert>
        ) : null}
        {inventory.kind === 'ok' && inventory.items.length === 0 ? (
          <p className="empty-title">No active materials match this filter.</p>
        ) : null}
        {inventory.kind === 'ok' && inventory.items.length > 0 ? (
          <DataTable
            caption="Inventory report"
            columns={inventoryColumns}
            rows={inventory.items}
            rowKey={(i) => i.material_id}
          />
        ) : null}
      </section>

      <section aria-labelledby="movement-report-heading" className="panel">
        <h2 id="movement-report-heading">Movement report</h2>
        <form
          className="filter-row"
          onSubmit={(e) => {
            e.preventDefault()
            void loadMovements({ materialId, movementType, dateFrom, dateTo })
          }}
        >
          <MaterialSelect
            label="Material"
            value={materialId}
            onChange={(id) => setMaterialId(id)}
          />
          <SelectField
            label="Movement type"
            value={movementType}
            onChange={(e) => setMovementType(e.target.value as '' | MovementType)}
          >
            {MOVEMENT_TYPES.map((t) => (
              <option key={t || 'all'} value={t}>
                {t === '' ? 'All types' : t}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Date from (ext: 2026-10-01)"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <TextField
            label="Date to (ext: 2026-10-31)"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <div className="filter-actions">
            <button type="submit" className="button">
              Apply filters
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setMaterialId('')
                setMovementType('')
                setDateFrom('')
                setDateTo('')
                setMovements({ kind: 'idle' })
              }}
            >
              Reset
            </button>
            <a
              className="button"
              href={movementsCsvUrl({
                material_id: materialId === '' ? undefined : materialId,
                movement_type: movementType === '' ? undefined : movementType,
                date_from: dateFrom === '' ? undefined : dateFrom,
                date_to: dateTo === '' ? undefined : dateTo,
              })}
              download
            >
              Export CSV
            </a>
          </div>
        </form>

        {movements.kind === 'idle' ? (
          <p className="empty-hint">Set filters and press “Apply filters” to generate the report.</p>
        ) : null}
        {movements.kind === 'loading' ? <LoadingState label="Loading movement report…" /> : null}
        {movements.kind === 'error' ? (
          <Alert variant="error" title="Could not load movement report">
            <p>{movements.message}</p>
          </Alert>
        ) : null}
        {movements.kind === 'ok' && movements.items.length === 0 ? (
          <p className="empty-title">No movements match these filters.</p>
        ) : null}
        {movements.kind === 'ok' && movements.items.length > 0 ? (
          <DataTable
            caption="Movement report"
            columns={movementColumns}
            rows={movements.items}
            rowKey={(r) => `${r.material_id}-${r.movement_type}`}
          />
        ) : null}
      </section>
    </div>
  )
}
