import { NextResponse } from 'next/server'
import {
  readPatterns,
  readSeen,
  writePatterns,
  writeSeen,
  writeHistory,
  writeTransactionArchive,
} from '@/lib/storage'
import { normalizeCategoryLabel } from '@/lib/canonical-categories'
import type { FinalizePayload, CategorizedTransaction } from '@/lib/types'

export async function POST(request: Request) {
  const body = (await request.json()) as FinalizePayload
  const { month, year, resolutions, rememberDescriptions, saveAsPatterns, transactions } = body

  const yearMonth = `${year}-${String(month).padStart(2, '0')}`

  // 1. Update seen.json
  const seen = await readSeen()
  for (const desc of rememberDescriptions) {
    const cat = resolutions[desc]
    if (cat) seen[desc] = normalizeCategoryLabel(cat)
  }
  await writeSeen(seen)

  // 2. Update patterns.json
  if (Object.keys(saveAsPatterns).length > 0) {
    const patterns = await readPatterns()
    for (const [desc, categoryLabel] of Object.entries(saveAsPatterns)) {
      const label = normalizeCategoryLabel(categoryLabel)
      const existing = patterns.find(p => p.label === label)
      if (existing) {
        if (!existing.patterns.includes(desc)) {
          existing.patterns.push(desc)
        }
      } else {
        patterns.push({ label, patterns: [desc] })
      }
    }
    await writePatterns(patterns)
  }

  // 3. Build history from all transactions (auto + manually resolved)
  const history: Record<string, number> = {}
  let total = 0

  const resolved: CategorizedTransaction[] = transactions.map(t => {
    if (t.status !== 'auto') {
      const r = resolutions[t.description] ?? 'Uncategorized'
      return { ...t, status: 'auto' as const, category: normalizeCategoryLabel(r) }
    }
    return { ...t, category: normalizeCategoryLabel(t.category ?? 'Uncategorized') }
  })

  for (const t of resolved) {
    const cat = t.category ?? 'Etc'
    const net = t.outflow - t.inflow
    history[cat] = (history[cat] ?? 0) + net
    total += net
  }
  history['Total'] = total

  await writeHistory(yearMonth, history)
  await writeTransactionArchive(yearMonth, resolved)

  return NextResponse.json({ ok: true, yearMonth })
}
