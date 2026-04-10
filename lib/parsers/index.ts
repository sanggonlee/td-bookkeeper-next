import { parse } from 'csv-parse/sync'
import { xlsToRows } from './xls'
import { detectBankSource } from './detect'
import { parseTdRows } from './td'
import { parseAmexRows } from './amex'
import { parseScotiaRows } from './scotia'
import type { Transaction } from '@/lib/types'

function deduplicateAcrossFiles(groups: Transaction[][]): Transaction[] {
  const seen = new Map<string, string>()
  const result: Transaction[] = []

  for (let i = 0; i < groups.length; i++) {
    for (const t of groups[i]) {
      const key = `${t.date}|${t.description}|${t.outflow}|${t.inflow}`
      const firstSeen = seen.get(key)
      if (firstSeen === undefined) {
        seen.set(key, String(i))
        result.push(t)
      } else if (firstSeen === String(i)) {
        result.push(t)
      }
      // Cross-file duplicate — skip
    }
  }
  return result
}

export async function parseFiles(
  files: File[],
  month: number,
  year: number
): Promise<Transaction[]> {
  const groups: Transaction[][] = []

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let rows: string[][]
    const name = file.name.toLowerCase()

    if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
      rows = xlsToRows(buffer)
    } else {
      const text = buffer.toString('utf-8')
      rows = parse(text, { relax_column_count: true, skip_empty_lines: true }) as string[][]
    }

    const source = detectBankSource(rows)

    let transactions: Transaction[]
    if (source === 'td') {
      transactions = parseTdRows(rows, month, year)
    } else if (source === 'amex') {
      transactions = parseAmexRows(rows, month, year)
    } else if (source === 'scotia') {
      transactions = parseScotiaRows(rows, month, year)
    } else {
      console.warn(`Could not detect bank source for file: ${file.name}`)
      transactions = []
    }

    groups.push(transactions)
  }

  return deduplicateAcrossFiles(groups)
}
