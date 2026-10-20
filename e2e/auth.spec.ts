import { expect, test } from '@playwright/test'
import { API_ORIGIN, USERS } from './support/config'
import { authToken, signIn } from './support/flows'

test.describe('Workflow A — authentication', () => {
  test('an anonymous visitor is redirected to the login screen', async ({ page }) => {
    await page.goto('/materials')

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    // The application shell must not leak to an unauthenticated visitor.
    await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0)
    await expect(page).toHaveURL(/\/login$/)
  })

  test('invalid credentials are refused without revealing the cause', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Username').fill(USERS.manager.username)
    await page.getByLabel('Password').fill('definitely-not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Invalid username or password.')
    await expect(alert).not.toContainText(/unknown|does not exist|not found/i)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('empty fields are validated before any request is sent', async ({ page }) => {
    await page.goto('/')

    const requests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/login')) {
        requests.push(request.url())
      }
    })

    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Enter your username.')).toBeVisible()
    await expect(page.getByText('Enter your password.')).toBeVisible()
    expect(requests).toHaveLength(0)
  })

  test('a valid sign-in survives a refresh, and sign-out revokes the token', async ({ page }) => {
    await signIn(page, USERS.manager)
    await expect(page.getByText(USERS.manager.username)).toBeVisible()

    const token = await authToken(page)

    // Refresh: the stored session must restore, not bounce to /login.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()

    // Sign out clears the tab...
    // The revocation POST is fire-and-forget from the UI's point of view, so wait
    // for the response explicitly rather than assuming it beat the redirect.
    const revocation = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/logout') && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    expect(
      await page.evaluate(() => window.sessionStorage.getItem('coffeestock.auth.session')),
    ).toBeNull()
    expect((await revocation).status()).toBe(204)

    // ...and the server-side session is gone too, so a copied token is dead.
    const replay = await page.request.get(`${API_ORIGIN}/api/materials`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(replay.status()).toBe(401)
  })

  test('a protected URL is unreachable once signed out', async ({ page }) => {
    await signIn(page, USERS.operator)
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

    await page.goto('/reports')

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('an expired session is treated as signed out', async ({ page }) => {
    await signIn(page, USERS.manager)

    // Age the stored credential past its expiry: the client must fail closed.
    await page.evaluate(() => {
      const raw = window.sessionStorage.getItem('coffeestock.auth.session')
      if (raw === null) {
        return
      }
      const session = JSON.parse(raw) as Record<string, unknown>
      session.expiresAt = '2020-01-01T00:00:00+00:00'
      window.sessionStorage.setItem('coffeestock.auth.session', JSON.stringify(session))
    })

    await page.reload()

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })
})
