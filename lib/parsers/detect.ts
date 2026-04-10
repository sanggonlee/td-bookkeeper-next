export type BankSource = 'td' | 'amex' | 'scotia' | 'unknown'

const MONTH_ABBREVS = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?$/i

function isAmexDate(str: string): boolean {
  const parts = str.trim().split(/\s+/)
  return (
    parts.length === 3 &&
    /^\d{1,2}$/.test(parts[0]) &&
    MONTH_ABBREVS.test(parts[1]) &&
    /^\d{4}$/.test(parts[2])
  )
}

function isTdDate(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(str.trim()) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str.trim())
}

export function detectBankSource(rows: string[][]): BankSource {
  // Scan up to 20 rows — Amex XLSX files have several account-info / header
  // rows before the first transaction row.
  for (const row of rows.slice(0, 20)) {
    if (row.length === 0 || row.every(c => !c.trim())) continue
    const firstCell = row[0]?.trim() ?? ''

    if (row.length >= 3 && isAmexDate(firstCell)) return 'amex'
    if (row.length >= 4 && isTdDate(firstCell)) return 'td'
    // Scotia stub: no detection yet
  }
  return 'unknown'
}
