import { Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { DashboardPage } from './DashboardPage'
import { PlannedPage } from './PlannedPage'

/** Route table. Only Dashboard is live in Phase 6; the operational sections
 * resolve to placeholders until Phase 7 wires them to the backend. */
export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="materials" element={<PlannedPage title="Materials" />} />
        <Route path="receipts" element={<PlannedPage title="Receipts" />} />
        <Route path="consumption" element={<PlannedPage title="Consumption & Waste" />} />
        <Route path="adjustments" element={<PlannedPage title="Adjustments" />} />
        <Route path="stocktaking" element={<PlannedPage title="Stocktaking" />} />
        <Route path="reports" element={<PlannedPage title="Reports" />} />
        <Route path="*" element={<PlannedPage title="Page not found" />} />
      </Route>
    </Routes>
  )
}

export default App
