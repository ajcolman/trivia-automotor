// ─── RFC 4180 CSV builder ─────────────────────────────────────────────────────

/**
 * Escapes a single cell value according to RFC 4180:
 * - Values containing commas, double-quotes, or newlines are wrapped in
 *   double-quotes.
 * - Any double-quote characters within the value are escaped by doubling them.
 * - `null` / `undefined` values become an empty string.
 * - Boolean values become `"true"` / `"false"`.
 * - Numbers are coerced to their string representation.
 */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''

  const str = typeof value === 'boolean' ? String(value) : String(value)

  // Wrap in quotes if the value contains a comma, double-quote, CR, or LF
  if (str.includes(',') || str.includes('"') || str.includes('\r') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

/**
 * Builds an RFC 4180–compliant CSV string from a header row and data rows.
 *
 * - Uses CRLF (`\r\n`) as the line terminator as required by RFC 4180.
 * - All cell values are sanitised via `escapeCell`.
 *
 * @param headers  Array of column header strings.
 * @param rows     Array of rows; each row is an array of cell values.
 *                 Rows shorter than the header are padded with empty strings;
 *                 extra columns are silently truncated.
 * @returns        A UTF-8 CSV string suitable for writing to a `.csv` file or
 *                 sending as a `text/csv` HTTP response.
 *
 * @example
 * const csv = buildCsv(
 *   ['Name', 'Score', 'Date'],
 *   [
 *     ['Alice', 850, '2026-05-07'],
 *     ['Bob, Jr.', 720, '2026-05-07'],
 *     ['Carol "The Champ"', 990, '2026-05-07'],
 *   ],
 * )
 * // Name,Score,Date\r\nAlice,850,2026-05-07\r\n...
 */
export function buildCsv(headers: string[], rows: unknown[][]): string {
  const columnCount = headers.length

  const lines: string[] = []

  // Header row
  lines.push(headers.map(escapeCell).join(','))

  // Data rows
  for (const row of rows) {
    const cells: string[] = []
    for (let i = 0; i < columnCount; i++) {
      cells.push(escapeCell(row[i]))
    }
    lines.push(cells.join(','))
  }

  return lines.join('\r\n')
}

/**
 * Convenience helper: returns a `Blob` with MIME type `text/csv;charset=utf-8`
 * ready for use with `URL.createObjectURL` in the browser.
 *
 * Only available in environments that support the `Blob` constructor.
 */
export function buildCsvBlob(headers: string[], rows: unknown[][]): Blob {
  const content = buildCsv(headers, rows)
  return new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' })
}

/**
 * Convenience helper: returns a `Response` with appropriate headers for
 * downloading a CSV file.  Designed for use in Next.js Route Handlers.
 *
 * @param headers    CSV header row.
 * @param rows       CSV data rows.
 * @param filename   Suggested download filename (default: `export.csv`).
 */
export function csvResponse(
  headers: string[],
  rows: unknown[][],
  filename = 'export.csv',
): Response {
  const content = buildCsv(headers, rows)

  return new Response('﻿' + content, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
