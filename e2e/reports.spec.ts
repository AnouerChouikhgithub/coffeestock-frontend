import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { USERS } from './support/config'
import { createMaterial, createSupplier, recordReceipt, signIn, unique } from './support/flows'

test.describe('Workflow F — reporting and CSV export', () => {
  test('authenticated exports download real CSV data with formulas neutralised', async ({
    page,
  }) => {
    await signIn(page, USERS.manager)

    // A material literally named like a spreadsheet formula: this is the injection
    // the export has to neutralise.
    const formulaName = `=cmd|' /C calc'!A0 ${Date.now().toString(36)}`
    const supplier = unique('E2E Report Supplier')
    await createMaterial(page, formulaName, { type: 'RAW', unit: 'g' })
    await createSupplier(page, supplier)
    await recordReceipt(page, supplier, `${formulaName} (g)`, '4.000', `REP-${Date.now()}`)

    await page.goto('/reports')
    await expect(page.getByRole('table', { name: 'Inventory report' })).toBeVisible()
    await expect(page.getByRole('cell', { name: formulaName, exact: true })).toBeVisible()

    const [inventoryDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export CSV' }).first().click(),
    ])

    expect(inventoryDownload.suggestedFilename()).toBe('inventory-report.csv')
    const inventoryPath = await inventoryDownload.path()
    expect(inventoryPath).not.toBeNull()
    const inventoryCsv = readFileSync(inventoryPath as string, 'utf8')

    expect(inventoryCsv.split('\n')[0].trim()).toBe(
      'material_id,name,type,base_unit,stock_on_hand,below_threshold',
    )
    // The formula material survived, but prefixed so a spreadsheet treats it as text.
    expect(inventoryCsv).toContain(`'${formulaName}`)
    expect(inventoryCsv).not.toMatch(/,=/m)

    // Same for the movement report, through the filtered export.
    await page.getByRole('button', { name: 'Apply filters' }).click()
    await expect(page.getByRole('table', { name: 'Movement report' })).toBeVisible()

    const [movementsDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export CSV' }).nth(1).click(),
    ])

    expect(movementsDownload.suggestedFilename()).toBe('movement-report.csv')
    const movementsPath = await movementsDownload.path()
    expect(movementsPath).not.toBeNull()
    const movementsCsv = readFileSync(movementsPath as string, 'utf8')

    expect(movementsCsv.split('\n')[0].trim()).toBe(
      'material_id,movement_type,total_quantity,movement_count',
    )
    expect(movementsCsv).toContain('RECEIPT')
  })

  test('an expired session cannot download a report', async ({ page }) => {
    await signIn(page, USERS.manager)
    await page.goto('/reports')
    await expect(page.getByRole('table', { name: 'Inventory report' })).toBeVisible()

    // Kill the credential server-side, then try to export from the still-open page.
    await page.evaluate(async () => {
      const raw = window.sessionStorage.getItem('coffeestock.auth.session')
      if (raw === null) {
        return
      }
      const session = JSON.parse(raw) as { token: string }
      await fetch('http://127.0.0.1:8000/api/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      })
    })

    // A 401 must never be saved as a file: assert no download fires and the tab
    // is bounced to the login screen instead.
    let downloaded = false
    page.on('download', () => {
      downloaded = true
    })

    await page.getByRole('button', { name: 'Export CSV' }).first().click()

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    expect(downloaded, 'an expired session must not produce a saved file').toBe(false)
  })
})
