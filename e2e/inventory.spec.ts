import { expect, test } from '@playwright/test'
import { USERS } from './support/config'
import { createMaterial, createSupplier, recordReceipt, signIn, unique } from './support/flows'
import { materialId, stockOnHand } from './support/db'

test.describe('Workflow B — materials and inventory', () => {
  test('a material created in the UI is listed and persisted', async ({ page }) => {
    await signIn(page, USERS.manager)

    const name = unique('E2E Beans')
    await createMaterial(page, name, { type: 'RAW', unit: 'g' })

    // UI: present in the catalogue table.
    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()

    // Database: really stored, with the requested attributes.
    expect(materialId(name)).not.toBe('')

    // Inventory: a brand-new material reports zero stock on hand.
    await page.goto('/inventory')
    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: '0.000', exact: true }).first()).toBeVisible()
    expect(Number(stockOnHand(name))).toBe(0)
  })
})

test.describe('Workflow C — receipt and stock movement', () => {
  test('recording a receipt increases stock and writes the ledger row', async ({ page }) => {
    await signIn(page, USERS.manager)

    const material = unique('E2E Receipt Beans')
    const supplier = unique('E2E Supplier')
    await createMaterial(page, material, { type: 'RAW', unit: 'g' })
    await createSupplier(page, supplier)

    await recordReceipt(page, supplier, `${material} (g)`, '12.500', `BATCH-${Date.now()}`)

    expect(Number(stockOnHand(material))).toBe(12.5)

    await page.goto('/inventory')
    await expect(page.getByRole('cell', { name: material, exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: '12.500', exact: true }).first()).toBeVisible()
  })
})

test.describe('Workflow D — consumption, waste and adjustments', () => {
  test('consumption reduces stock and an over-consumption is refused without corrupting it', async ({
    page,
  }) => {
    await signIn(page, USERS.manager)

    const material = unique('E2E Usage Beans')
    const supplier = unique('E2E Usage Supplier')
    await createMaterial(page, material, { type: 'RAW', unit: 'g' })
    await createSupplier(page, supplier)
    await recordReceipt(page, supplier, `${material} (g)`, '10.000', `USAGE-${Date.now()}`)

    // A valid consumption posts a negative movement.
    await page.goto('/consumption')
    await page.getByLabel('Material').selectOption({ label: `${material} (g)` })
    await page.getByLabel('Quantity').fill('2.500')
    await page.getByRole('button', { name: 'Record consumption' }).click()
    await expect(page.getByText('Consumption recorded')).toBeVisible()
    expect(Number(stockOnHand(material))).toBe(7.5)

    // An impossible consumption must be rejected and must not move the ledger.
    await page.getByLabel('Quantity').fill('999.000')
    await page.getByRole('button', { name: 'Record consumption' }).click()
    await expect(page.getByRole('alert')).not.toContainText('Consumption recorded')
    expect(Number(stockOnHand(material))).toBe(7.5)

    // Waste requires a reason (BR-15) and posts its own movement.
    await page.getByRole('radio', { name: 'Waste' }).click()
    await page.getByLabel('Material').selectOption({ label: `${material} (g)` })
    await page.getByLabel('Quantity').fill('0.500')
    await page.getByLabel('Reason (required)').fill('Spilled while grinding')
    await page.getByRole('button', { name: 'Record waste' }).click()
    await expect(page.getByText('Waste recorded')).toBeVisible()
    expect(Number(stockOnHand(material))).toBe(7)

    // A manager adjustment is attributed and moves stock.
    await page.goto('/adjustments')
    await page.getByLabel('Material').selectOption({ label: `${material} (g)` })
    await page.getByLabel('Signed delta').fill('-1.000')
    await page.getByLabel('Reason').fill('Recount correction')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Adjustment recorded')).toBeVisible()
    expect(Number(stockOnHand(material))).toBe(6)
  })
})
