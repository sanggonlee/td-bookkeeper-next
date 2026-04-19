/**
 * Migrates persisted labels after a category rename (local data/ only).
 * Run: npx tsx scripts/migrate-category-labels.ts
 */
import fs from 'fs/promises'
import path from 'path'
import {
  decryptHistory,
  encryptHistory,
  decryptTransactionArchiveWire,
  encryptTransactionArchiveWire,
} from '../lib/obfuscate'

const OLD_TO_NEW: Record<string, string> = {
  'Mort/Maint': 'Home',
  'Cash Withdrawl': 'Bank',
  'Cash Withdrawal': 'Bank',
  'E-Transfer': 'Transfer',
  'Transportation': 'Car/Transportation',
  'Internet/Phone': 'Telecom/Subscriptions',
  'Amazon': 'Etc',
  'OSAP': 'Tax',
  'Learning': 'Etc',
}

function mapLabel(label: string): string {
  return OLD_TO_NEW[label] ?? label
}

async function migrateSeen() {
  const p = path.join(process.cwd(), 'data', 'seen.json')
  const raw = JSON.parse(await fs.readFile(p, 'utf-8')) as Record<string, string>
  for (const k of Object.keys(raw)) {
    raw[k] = mapLabel(raw[k])
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
      const nk = mapLabel(k)
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
      if (typeof row.category === 'string') row.category = mapLabel(row.category)
    }
    const out = encryptTransactionArchiveWire(arr)
    await fs.writeFile(fp, JSON.stringify(out, null, 2) + '\n', 'utf-8')
  }
}

async function main() {
  await migrateSeen()
  await migrateHistoryDir()
  await migrateTransactionsDir()
  console.log('Migrated seen.json, data/history/*.json, data/transactions/*.json')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
