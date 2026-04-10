import type { Transaction } from '@/lib/types'

function parseTdDate(raw: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }
  return null
}

export function parseTdRows(
  rows: string[][],
  month: number,
  year: number
): Transaction[] {
  const results: Transaction[] = []
  for (const row of rows) {
    if (row.length < 4) continue
    const [dateRaw, desc, outflowRaw, inflowRaw] = row
    const date = parseTdDate(dateRaw.trim())
    if (!date) continue
    const [y, m] = date.split('-').map(Number)
    if (y !== year || m !== month) continue
    const outflow = parseFloat(outflowRaw) || 0
    const inflow = parseFloat(inflowRaw) || 0
    results.push({ date, description: desc.trim(), outflow, inflow, source: 'td' })
  }
  return results
}
