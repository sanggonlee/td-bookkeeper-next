import type { Transaction } from '@/lib/types'

function norm(s: string | undefined): string {
  return (s ?? '').trim().toLowerCase()
}

function parseMoney(raw: string | undefined): number | null {
  if (raw == null || typeof raw !== 'string') return null
  const cleaned = raw.replace(/[$,]/g, '').trim()
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

function parseIsoDate(raw: string | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null
  const t = raw.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null
  return t
}

/** Scotiabank CSV exports (chequing / credit card) share this header shape. */
export function findScotiaHeader(
  rows: string[][]
): { headerIdx: number; col: Record<string, number> } | null {
  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const row = rows[i]
    if (!row || row.length < 6) continue
    const col: Record<string, number> = {}
    for (let j = 0; j < row.length; j++) {
      const k = norm(row[j])
      if (k) col[k] = j
    }
    if (
      col['filter'] !== undefined &&
      col['date'] !== undefined &&
      col['description'] !== undefined &&
      col['amount'] !== undefined &&
      col['type of transaction'] !== undefined
    ) {
      return { headerIdx: i, col }
    }
  }
  return null
}

export function parseScotiaRows(
  rows: string[][],
  month: number,
  year: number
): Transaction[] {
  const found = findScotiaHeader(rows)
  if (!found) return []

  const { headerIdx, col } = found
  const hasBalance = col['balance'] !== undefined
  const subIdx = col['sub-description']

  const results: Transaction[] = []
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row || row.length < 2) continue

    const date = parseIsoDate(row[col['date']])
    if (!date) continue
    const [y, mo] = date.split('-').map(Number)
    if (y !== year || mo !== month) continue

    const descMain = (row[col['description']] ?? '').trim()
    let description = descMain
    if (subIdx !== undefined) {
      const sub = (row[subIdx] ?? '').trim()
      if (sub) description = descMain ? `${descMain} (${sub})` : sub
    }

    const amountVal = parseMoney(row[col['amount']])
    if (amountVal === null) continue

    const typeRaw = norm(row[col['type of transaction']])

    let inflow = 0
    let outflow = 0

    if (hasBalance) {
      // Chequing / account activity: signed amount (debits negative, credits positive).
      if (amountVal < 0) outflow = Math.abs(amountVal)
      else if (amountVal > 0) inflow = amountVal
      else continue
    } else {
      // Credit card style: amounts are usually positive; direction from type.
      const absAmt = Math.abs(amountVal)
      if (absAmt === 0) continue
      if (typeRaw === 'credit') inflow = absAmt
      else if (typeRaw === 'debit') outflow = absAmt
      else if (amountVal < 0) outflow = Math.abs(amountVal)
      else inflow = amountVal
    }

    if (inflow === 0 && outflow === 0) continue

    results.push({
      date,
      description: description || '(no description)',
      inflow,
      outflow,
      source: 'scotia',
    })
  }
  return results
}
