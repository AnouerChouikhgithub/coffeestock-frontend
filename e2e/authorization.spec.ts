import { expect, test } from '@playwright/test'
import { API_ORIGIN, USERS } from './support/config'
import { api, createSupplier, signIn, signOut, unique } from './support/flows'
import { countRows, materialId } from './support/db'

test.describe('Workflow G — authorization', () => {
  test('anonymous API calls get the contract 401 payload', async ({ page }) => {
    for (const path of ['/api/materials', '/api/inventory', '/api/audit-logs']) {
      const response = await page.request.get(`${API_ORIGIN}${path}`)
      expect(response.status(), `${path} must require a token`).toBe(401)
      const body = (await response.json()) as { error: { code: string; details: unknown[] } }
      expect(body.error.code).toBe('AUTH_REQUIRED')
      expect(body.error.details).toEqual([])
    }
  })

  test('an operator is refused manager-only writes and nothing is written', async ({ page }) => {
    // A supplier to aim the deactivation at.
    await signIn(page, USERS.manager)
    const supplierId = await createSupplier(page, unique('E2E Authz Supplier'))
    await signOut(page)

    await signIn(page, USERS.operator)

    // UI: manager-only and admin-only sections are not offered.
    await expect(page.getByRole('link', { name: 'Adjustments' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Audit log' })).toHaveCount(0)

    const materialName = unique('E2E Operator Material')
    const created = await api(page, 'POST', '/api/materials', {
      name: materialName,
      type: 'RAW',
      base_unit: 'g',
    })
    expect(created.status()).toBe(403)
    expect(((await created.json()) as { error: { code: string } }).error.code).toBe('FORBIDDEN')
    expect(materialId(materialName), 'a refused write must not create a row').toBe('')

    const audit = await api(page, 'GET', '/api/audit-logs')
    expect(audit.status()).toBe(403)

    const deactivate = await api(page, 'POST', `/api/suppliers/${supplierId}/deactivate`)
    expect(deactivate.status()).toBe(403)
    expect(countRows('supplier', `id = ${supplierId} AND is_active = true`)).toBe('1')
  })

  test('a manager may deactivate a supplier but may not read the audit log', async ({ page }) => {
    await signIn(page, USERS.manager)
    const supplierId = await createSupplier(page, unique('E2E Manager Deactivates'))

    const audit = await api(page, 'GET', '/api/audit-logs')
    expect(audit.status(), 'audit log is Admin-only per the contract').toBe(403)
    expect(((await audit.json()) as { error: { code: string } }).error.code).toBe('FORBIDDEN')

    const deactivate = await api(page, 'POST', `/api/suppliers/${supplierId}/deactivate`)
    expect(deactivate.status()).toBe(204)
    expect(countRows('supplier', `id = ${supplierId} AND is_active = false`)).toBe('1')
  })

  test('an admin can read the audit log in the browser', async ({ page }) => {
    await signIn(page, USERS.admin)

    await page.getByRole('link', { name: 'Audit log' }).click()

    await expect(page.getByRole('heading', { name: 'Audit log', level: 1 })).toBeVisible()
    // The page must load for an admin — an error state would mean a 403 got through.
    await expect(page.getByText('Could not load the audit log')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Audit log', level: 1 })).toBeVisible()
    // Rows are only rendered once something has been audited; either state proves
    // the request was authorized, which is what this test is about.
    const table = page.getByRole('table', { name: 'Audit log' })
    const empty = page.getByText('No audit entries yet.')
    await expect(table.or(empty)).toBeVisible()
  })

  test('a manager reaching the audit page directly is shown an error, not data', async ({
    page,
  }) => {
    await signIn(page, USERS.manager)

    // The nav hides it, but the guard that matters is server-side.
    await page.goto('/audit-logs')

    await expect(page.getByText('Could not load the audit log')).toBeVisible()
    await expect(page.getByRole('table', { name: 'Audit log' })).toHaveCount(0)
  })
})
