import type { Transaction, CategorizedTransaction, PatternEntry, SeenFile } from './types'

function buildRegex(patterns: string[]): RegExp {
  const escaped = patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`.*(?:${escaped.join('|')}).*`, 'i')
}

export function categorize(
  transactions: Transaction[],
  patternEntries: PatternEntry[],
  seen: SeenFile
): CategorizedTransaction[] {
  return transactions.map(t => {
    const desc = t.description

    // 1. Exact match in seen.json — always wins
    if (seen[desc] !== undefined) {
      return { ...t, status: 'auto', category: seen[desc] }
    }

    // 2. Collect all matching pattern entries
    const matches: string[] = []
    for (const entry of patternEntries) {
      if (entry.patterns.length === 0) continue
      const regex = buildRegex(entry.patterns)
      if (regex.test(desc)) {
        matches.push(entry.label)
      }
    }

    if (matches.length === 0) {
      return { ...t, status: 'unknown' }
    }
    if (matches.length === 1) {
      return { ...t, status: 'auto', category: matches[0] }
    }
    // 2+ matches → ambiguous
    return { ...t, status: 'ambiguous', candidates: matches }
  })
}
