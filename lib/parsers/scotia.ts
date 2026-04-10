import type { Transaction } from '@/lib/types'

export function parseScotiaRows(
  _rows: string[][],
  _month: number,
  _year: number
): Transaction[] {
  // Scotia format TBD — stub returns empty array
  console.warn('Scotia parser is a stub — format not yet implemented')
  return []
}
