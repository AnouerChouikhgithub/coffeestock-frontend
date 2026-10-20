import { Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { DashboardPage } from './DashboardPage'
import { PlannedPage } from './PlannedPage'
import { RequireAuth } from '../auth/RequireAuth'
import { MaterialsPage } from '../pages/MaterialsPage'
import { InventoryPage } from '../pages/InventoryPage'
import { ReceiptsPage } from '../pages/ReceiptsPage'
import { ConsumptionPage } from '../pages/ConsumptionPage'
import { AdjustmentsPage } from '../pages/AdjustmentsPage'
import { StocktakingPage } from '../pages/StocktakingPage'
import { ReportsPage } from '../pages/ReportsPage'
import { AuditLogPage } from '../pages/AuditLogPage'
import { LoginPage } from '../pages/LoginPage'

/** Route table. `/login` is the only unauthenticated route; everything else
 * sits behind RequireAuth, which redirects to it when the tab has no session. */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="materials" element={<MaterialsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="receipts" element={<ReceiptsPage />} />
          <Route path="consumption" element={<ConsumptionPage />} />
          <Route path="adjustments" element={<AdjustmentsPage />} />
          <Route path="stocktaking" element={<StocktakingPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit-logs" element={<AuditLogPage />} />
          <Route path="*" element={<PlannedPage title="Page not found" />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
