import type { Transaction } from '@/lib/types'

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

function parseAmexDate(raw: string): string | null {
  const parts = raw.trim().split(/\s+/)
  if (parts.length < 3) return null
  const [dayStr, monRaw, yearStr] = parts
  const day = parseInt(dayStr, 10)
  if (isNaN(day)) return null
  const mon = MONTH_MAP[monRaw.replace('.', '').toLowerCase()]
  if (!mon) return null
  const year = parseInt(yearStr, 10)
  if (isNaN(year)) return null
  return `${year}-${mon}-${String(day).padStart(2, '0')}`
}

function parseAmexAmount(flow: string, flow2: string): { inflow: number; outflow: number } {
  const raw = flow.trim() || flow2.trim()
  const cleaned = raw.replace(/[$,]/g, '')
  if (cleaned.startsWith('-')) {
    return { inflow: Math.abs(parseFloat(cleaned)), outflow: 0 }
  }
  return { inflow: 0, outflow: parseFloat(cleaned) || 0 }
}

export function parseAmexRows(
  rows: string[][],
  month: number,
  year: number
): Transaction[] {
  const results: Transaction[] = []
  for (const row of rows) {
    if (row.length < 3) continue
    const [dateRaw, desc, flow, flow2 = ''] = row
    const date = parseAmexDate(dateRaw)
    if (!date) continue
    const [y, m] = date.split('-').map(Number)
    if (y !== year || m !== month) continue
    const { inflow, outflow } = parseAmexAmount(flow, flow2)
    results.push({ date, description: desc.trim(), inflow, outflow, source: 'amex' })
  }
  return results
}
