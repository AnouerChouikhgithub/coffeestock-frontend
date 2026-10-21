import { ApiError, apiClient } from './api'

/** Authenticated CSV export.
 *
 * The report endpoints are protected, so a plain `<a href>` cannot be used: the
 * browser would issue the request without the bearer header and get a 401 the
 * user sees as a broken download. Instead the file is fetched through the shared
 * client (which attaches the token), then handed to the browser as a Blob.
 */

const CSV_CONTENT_TYPE = 'text/csv'

/** Pull the server's filename out of Content-Disposition, if it sent one. */
export function filenameFromDisposition(disposition: string): string | null {
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
  if (!match) {
    return null
  }
  const name = decodeURIComponent(match[1].trim())
  return name === '' ? null : name
}

function saveBlob(blob: Blob, filename: string): void {
  if (typeof URL.createObjectURL !== 'function') {
    throw new Error('This browser cannot save downloaded files.')
  }
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Fetch a protected CSV and save it.
 *
 * @throws ApiError when the server rejects the request, or when it answers with
 * something other than CSV — the previous implementation would happily save a
 * JSON or HTML error page as `export.csv`.
 */
export async function downloadCsv(
  path: string,
  params: Record<string, string | number | undefined>,
  fallbackFilename: string,
): Promise<void> {
  const response = await apiClient.get<Blob>(path, { params, responseType: 'blob' })

  const contentType = String(response.headers['content-type'] ?? '')
  if (!contentType.includes(CSV_CONTENT_TYPE)) {
    throw new ApiError(
      response.status,
      null,
      `Expected a CSV file but the server returned ${contentType || 'an unknown content type'}.`,
    )
  }

  const disposition = String(response.headers['content-disposition'] ?? '')
  saveBlob(response.data, filenameFromDisposition(disposition) ?? fallbackFilename)
}
