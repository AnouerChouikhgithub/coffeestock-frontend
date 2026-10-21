import { expect, type APIResponse, type Page } from '@playwright/test'
import { API_ORIGIN, type E2EUser } from './config'

/** Sign in through the real login form and wait for the dashboard.
 * If the tab is still authenticated (a previous test's session), sign out first.
 */
export async function signIn(page: Page, user: E2EUser): Promise<void> {
  await page.goto('/')
  const dashboard = page.getByRole('heading', { name: 'Dashboard', level: 1 })
  const loginHeading = page.getByRole('heading', { name: 'Sign in' })
  await expect(dashboard.or(loginHeading)).toBeVisible()
  if (await dashboard.isVisible()) {
    await signOut(page)
  }
  await page.getByLabel('Username').fill(user.username)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
}

/** The bearer token this tab is holding (what every API call actually sends). */
export async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
}

/** Surface the server's message instead of a bare "element not visible" timeout. */
async function expectOutcome(page: Page, successText: string, what: string): Promise<void> {
  const success = page.getByText(successText)
  const failure = page.getByRole('alert')
  await expect(success.or(failure).first()).toBeVisible()
  if ((await success.count()) === 0) {
    throw new Error(`${what} failed: ${(await failure.first().innerText()).replace(/\s+/g, ' ')}`)
  }
}

export async function authToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    const raw = window.sessionStorage.getItem('coffeestock.auth.session')
    return raw === null ? '' : (JSON.parse(raw) as { token: string }).token
  })
  expect(token, 'the tab must hold a bearer token').not.toBe('')
  return token
}

/** Call the real API with the session's real token (no mocks, no shortcuts). */
export async function api(
  page: Page,
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  data?: unknown,
): Promise<APIResponse> {
  const token = await authToken(page)
  return page.request.fetch(`${API_ORIGIN}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: data === undefined ? undefined : JSON.stringify(data),
  })
}

export async function createSupplier(page: Page, name: string): Promise<number> {
  const response = await api(page, 'POST', '/api/suppliers', { name })
  const body = (await response.json()) as { id?: number; error?: unknown }
  expect(response.status(), `supplier creation failed: ${JSON.stringify(body)}`).toBe(201)
  return body.id as number
}

export async function createMaterial(
  page: Page,
  name: string,
  options: { type?: 'RAW' | 'CONSUMABLE'; unit?: string } = {},
): Promise<void> {
  await page.goto('/materials')
  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByLabel('Type').selectOption(options.type ?? 'RAW')
  await page.getByLabel('Base unit').selectOption(options.unit ?? 'g')
  await page.getByRole('button', { name: 'Create material' }).click()
  await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()
}

export async function recordReceipt(
  page: Page,
  supplierName: string,
  materialLabel: string,
  quantity: string,
  batchNumber: string,
): Promise<void> {
  await page.goto('/receipts')
  await page.getByLabel('Supplier').selectOption({ label: supplierName })
  await page.getByLabel('Delivery date').fill(new Date().toISOString().slice(0, 10))
  await page.getByLabel('Item 1 material').selectOption({ label: materialLabel })
  await page.getByLabel('Quantity').fill(quantity)
  await page.getByLabel('Batch number (optional)').fill(batchNumber)
  await page.getByRole('button', { name: 'Record receipt' }).click()
  await expectOutcome(page, 'Receipt recorded', 'Receipt')
}

/** Unique-enough names so repeated runs never collide on catalog data. */
export function unique(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
}
