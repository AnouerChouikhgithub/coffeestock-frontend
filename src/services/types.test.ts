import { describe, expect, it } from 'vitest'
import { errorCode, errorMessage, fieldErrors } from './types'
import { ApiError } from './api'

/** Regression: the helpers used to read only `err.response.data`, which the API
 * client never sets — every server error code and field issue was invisible, so
 * the approval / negative-stock branches in the pages could never trigger. */
describe('error envelope helpers', () => {
  const body = {
    error: {
      code: 'APPROVAL_REQUIRED',
      message: 'Request validation failed.',
      details: [{ field: 'approvals', issue: 'count #1 exceeds tolerance (OD-5)' }],
    },
  }

  it('read the contract envelope from an ApiError', () => {
    const err = new ApiError(409, body)

    expect(errorCode(err)).toBe('APPROVAL_REQUIRED')
    expect(fieldErrors(err)).toEqual({ approvals: 'count #1 exceeds tolerance (OD-5)' })
    expect(errorMessage(err, 'fallback')).toContain('exceeds tolerance')
  })

  it('still accept an axios-shaped error', () => {
    const err = { response: { data: body } }

    expect(errorCode(err)).toBe('APPROVAL_REQUIRED')
    expect(fieldErrors(err)).toEqual({ approvals: 'count #1 exceeds tolerance (OD-5)' })
  })

  it('fall back cleanly for unknown errors', () => {
    expect(errorCode(new Error('boom'))).toBeNull()
    expect(fieldErrors(new Error('boom'))).toEqual({})
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('boom')
  })
})
