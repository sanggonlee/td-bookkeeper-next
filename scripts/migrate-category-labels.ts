/**
 * Migrates persisted category labels to the canonical set and rewrites patterns.json
 * (local data/ only). Run: npx tsx scripts/migrate-category-labels.ts
 */
import fs from 'fs/promises'
import path from 'path'
import {
  decryptHistory,
  encryptHistory,
  decryptTransactionArchiveWire,
  encryptTransactionArchiveWire,
  decryptPatternsWire,
  encryptPatternsWire,
} from '../lib/obfuscate'
import { CANONICAL_CATEGORY_ORDER, normalizeCategoryLabel } from '../lib/canonical-categories'
import type { PatternEntry } from '../lib/types'

async function migrateSeen() {
  const p = path.join(process.cwd(), 'data', 'seen.json')
  const raw = JSON.parse(await fs.readFile(p, 'utf-8')) as Record<string, string>
  for (const k of Object.keys(raw)) {
    raw[k] = normalizeCategoryLabel(raw[k])
  }
  await fs.writeFile(p, JSON.stringify(raw, null, 2) + '\n', 'utf-8')
}

async function migrateHistoryDir() {
  const dir = path.join(process.cwd(), 'data', 'history')
  let files: string[]
  try {
    files = await fs.readdir(dir)
  } catch {
    return
  }
  for (const f of files) {
    if (!f.endsWith('.json')) continue
    const fp = path.join(dir, f)
    const raw = JSON.parse(await fs.readFile(fp, 'utf-8')) as Record<string, string>
    const amounts = decryptHistory(raw)
    const merged: Record<string, number> = {}
    for (const [k, v] of Object.entries(amounts)) {
      if (k === 'Total') continue
      const nk = normalizeCategoryLabel(k)
      merged[nk] = (merged[nk] ?? 0) + v
    }
    const total = Object.values(merged).reduce((a, b) => a + b, 0)
    merged['Total'] = total
    const out = encryptHistory(merged)
    await fs.writeFile(fp, JSON.stringify(out, null, 2) + '\n', 'utf-8')
  }
}

async function migrateTransactionsDir() {
  const dir = path.join(process.cwd(), 'data', 'transactions')
  let files: string[]
  try {
    files = await fs.readdir(dir)
  } catch {
    return
  }
  for (const f of files) {
    if (!f.endsWith('.json')) continue
    const fp = path.join(dir, f)
    const raw = JSON.parse(await fs.readFile(fp, 'utf-8')) as unknown
    const isLegacyArray = Array.isArray(raw)
    const isWire =
      raw &&
      typeof raw === 'object' &&
      (raw as { format?: string }).format === 'enc-v1' &&
      Array.isArray((raw as { items?: unknown }).items)
    if (!isLegacyArray && !isWire) continue
    const arr = decryptTransactionArchiveWire(raw)
    for (const row of arr) {
      if (typeof row.category === 'string') row.category = normalizeCategoryLabel(row.category)
    }
    const out = encryptTransactionArchiveWire(arr)
    await fs.writeFile(fp, JSON.stringify(out, null, 2) + '\n', 'utf-8')
  }
}

function dedupePatterns(patterns: string[]): string[] {
  return [...new Set(patterns)].sort((a, b) => a.localeCompare(b))
}

async function migratePatternsFile() {
  const p = path.join(process.cwd(), 'data', 'patterns.json')
  let rawText: string
  try {
    rawText = await fs.readFile(p, 'utf-8')
  } catch {
    return
  }
  const wire = JSON.parse(rawText) as unknown
  const entries = decryptPatternsWire(wire)

  const merged = new Map<string, string[]>()
  for (const e of entries) {
    const label = normalizeCategoryLabel(e.label)
    const cur = merged.get(label) ?? []
    cur.push(...e.patterns)
    merged.set(label, cur)
  }

  const out: PatternEntry[] = CANONICAL_CATEGORY_ORDER.map(label => ({
    label,
    patterns: dedupePatterns(merged.get(label) ?? []),
  }))

  const outWire = encryptPatternsWire(out)
  await fs.writeFile(p, JSON.stringify(outWire, null, 2) + '\n', 'utf-8')
}

async function main() {
  await migratePatternsFile()
  await migrateSeen()
  await migrateHistoryDir()
  await migrateTransactionsDir()
  console.log(
    'Migrated data/patterns.json (canonical labels only), seen.json, history/*.json, transactions/*.json'
  )
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
