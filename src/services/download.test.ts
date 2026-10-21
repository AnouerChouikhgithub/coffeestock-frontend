import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadCsv, filenameFromDisposition } from './download'
import { ApiError, apiClient } from './api'

function csvResponse(
  body = 'material_id,name\n1,Beans\n',
  headers: Record<string, string> = {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': 'attachment; filename="inventory-report.csv"',
  },
) {
  return {
    data: new Blob([body], { type: 'text/csv' }),
    status: 200,
    statusText: 'OK',
    headers,
  }
}

let clicked: Array<{ download: string; href: string }> = []

beforeEach(() => {
  clicked = []
  // jsdom does not implement object URLs.
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  }))
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push({ download: this.download, href: this.href })
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('downloadCsv', () => {
  it('requests the export through the authenticated client and saves the file', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(csvResponse())

    await downloadCsv('/reports/inventory/export.csv', { type: 'RAW' }, 'fallback.csv')

    expect(get).toHaveBeenCalledWith('/reports/inventory/export.csv', {
      params: { type: 'RAW' },
      responseType: 'blob',
    })
    expect(clicked).toHaveLength(1)
    // Server-provided filename wins over the fallback.
    expect(clicked[0].download).toBe('inventory-report.csv')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('falls back to the supplied filename when the server sends no disposition', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(
      csvResponse(undefined, { 'content-type': 'text/csv' }),
    )

    await downloadCsv('/reports/movements/export.csv', {}, 'movement-report.csv')

    expect(clicked[0].download).toBe('movement-report.csv')
  })

  it('refuses to save a non-CSV body as a file', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: new Blob(['{"error":{"code":"AUTH_REQUIRED"}}'], { type: 'application/json' }),
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
    })

    await expect(downloadCsv('/reports/inventory/export.csv', {}, 'x.csv')).rejects.toBeInstanceOf(
      ApiError,
    )
    expect(clicked).toHaveLength(0)
  })

  it('surfaces a server error without downloading anything', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new ApiError(403, null, 'Forbidden.'))

    await expect(downloadCsv('/reports/inventory/export.csv', {}, 'x.csv')).rejects.toMatchObject({
      status: 403,
    })
    expect(clicked).toHaveLength(0)
  })
})

describe('filenameFromDisposition', () => {
  it('reads a quoted filename', () => {
    expect(filenameFromDisposition('attachment; filename="export.csv"')).toBe('export.csv')
  })

  it('reads an unquoted filename', () => {
    expect(filenameFromDisposition('attachment; filename=export.csv')).toBe('export.csv')
  })

  it('returns null when absent', () => {
    expect(filenameFromDisposition('inline')).toBeNull()
  })
})
