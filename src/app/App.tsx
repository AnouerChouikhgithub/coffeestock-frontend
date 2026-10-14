import { Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { DashboardPage } from './DashboardPage'
import { PlannedPage } from './PlannedPage'
import { MaterialsPage } from '../pages/MaterialsPage'
import { InventoryPage } from '../pages/InventoryPage'
import { ReceiptsPage } from '../pages/ReceiptsPage'
import { ConsumptionPage } from '../pages/ConsumptionPage'
import { AdjustmentsPage } from '../pages/AdjustmentsPage'
import { StocktakingPage } from '../pages/StocktakingPage'
import { ReportsPage } from '../pages/ReportsPage'

/** Route table. Dashboard plus the Phase 7 operational workflows and the
 * Phase 8 reporting view. */
export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="receipts" element={<ReceiptsPage />} />
        <Route path="consumption" element={<ConsumptionPage />} />
        <Route path="adjustments" element={<AdjustmentsPage />} />
        <Route path="stocktaking" element={<StocktakingPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="*" element={<PlannedPage title="Page not found" />} />
      </Route>
    </Routes>
  )
}

export default App
