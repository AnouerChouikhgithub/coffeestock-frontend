import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, isExpired, readSession, readToken, writeSession } from './tokenStorage'
import type { AuthSession } from './types'

const STORAGE_KEY = 'coffeestock.auth.session'

const valid: AuthSession = {
  token: 'opaque-token',
  expiresAt: '2999-01-01T00:00:00+00:00',
  user: { id: 7, username: 'manager', role: 'MANAGER' },
}

beforeEach(() => {
  window.sessionStorage.clear()
})

describe('tokenStorage', () => {
  it('round-trips a session', () => {
    writeSession(valid)

    expect(readSession()).toEqual(valid)
    expect(readToken()).toBe('opaque-token')
  })

  it('returns null when nothing is stored', () => {
    expect(readSession()).toBeNull()
    expect(readToken()).toBeNull()
  })

  it('rejects malformed JSON instead of throwing', () => {
    window.sessionStorage.setItem(STORAGE_KEY, '{not-json')

    expect(readSession()).toBeNull()
  })

  it('rejects a payload that does not match the session shape', () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 42 }))

    expect(readSession()).toBeNull()
  })

  it('rejects an unknown role', () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...valid, user: { ...valid.user, role: 'SUPERUSER' } }),
    )

    expect(readSession()).toBeNull()
  })

  it('drops an expired session and clears storage', () => {
    writeSession({ ...valid, expiresAt: '2020-01-01T00:00:00+00:00' })

    expect(readSession()).toBeNull()
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('treats an unparseable expiry as expired (fails closed)', () => {
    expect(isExpired({ ...valid, expiresAt: 'not-a-date' })).toBe(true)
    expect(isExpired(valid)).toBe(false)
  })

  it('clears the stored session', () => {
    writeSession(valid)
    clearSession()

    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
