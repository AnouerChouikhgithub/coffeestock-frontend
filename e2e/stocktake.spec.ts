import { expect, test } from '@playwright/test'
import { USERS } from './support/config'
import { createMaterial, createSupplier, recordReceipt, signIn, unique } from './support/flows'
import { countRows, materialId, stockOnHand } from './support/db'

test.describe('Workflow E — stocktaking', () => {
  test('an over-tolerance count needs approval, then commits a delta into the ledger', async ({
    page,
  }) => {
    await signIn(page, USERS.manager)

    const material = unique('E2E Count Beans')
    const supplier = unique('E2E Count Supplier')
    await createMaterial(page, material, { type: 'RAW', unit: 'g' })
    await createSupplier(page, supplier)
    await recordReceipt(page, supplier, `${material} (g)`, '3.000', `COUNT-${Date.now()}`)
    expect(Number(stockOnHand(material))).toBe(3)

    await page.goto('/stocktaking')
    await page.getByLabel('Count 1 material').selectOption({ label: `${material} (g)` })
    await page.getByLabel('Counted quantity').fill('10.000')
    await page.getByRole('button', { name: 'Create draft' }).click()

    const draftHeading = page.getByRole('heading', { name: /Draft #\d+/ })
    const draftError = page.getByRole('alert')
    await expect(draftHeading.or(draftError).first()).toBeVisible()
    if ((await draftHeading.count()) === 0) {
      throw new Error(
        `Stocktake draft failed: ${(await draftError.first().innerText()).replace(/\s+/g, ' ')}`,
      )
    }

    // A 7.000 variance cannot be committed silently (OD-5): the server asks for
    // an approver comment first.
    await page.getByRole('button', { name: 'Commit stocktake' }).click()
    await expect(page.getByText(/Approval needed|Approval required/i)).toBeVisible()
    expect(Number(stockOnHand(material))).toBe(3)

    await page.getByLabel(/Approver comment for count #\d+/).fill('Recounted twice by the manager')
    await page.getByRole('button', { name: 'Commit stocktake' }).click()
    await expect(page.getByText('Stocktake committed')).toBeVisible()

    // The ledger now matches the physical count, via one STOCKTAKE_DELTA row.
    expect(Number(stockOnHand(material))).toBe(10)
    expect(
      countRows(
        'stock_movement',
        `movement_type = 'STOCKTAKE_DELTA' AND material_id = ${materialId(material)}`,
      ),
    ).toBe('1')

    await page.goto('/inventory')
    await expect(page.getByRole('cell', { name: '10.000', exact: true }).first()).toBeVisible()
  })
})
