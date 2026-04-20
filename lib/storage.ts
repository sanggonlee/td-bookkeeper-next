import fs from 'fs/promises'
import path from 'path'
import type {
  PatternsFile,
  SeenFile,
  HistoryFile,
  CategorizedTransaction,
  TransactionArchiveEntry,
} from './types'
import {
  encryptHistory,
  decryptHistory,
  encryptSeen,
  decryptSeen,
  encryptPatternsWire,
  decryptPatternsWire,
  encryptTransactionArchiveWire,
} from './obfuscate'
import { isCanonicalPatternsForm, normalizePatternsFile } from './canonical-categories'

// ---------------------------------------------------------------------------
// Storage provider
//
// Production (STORAGE_KV_REST_API_URL set): Upstash Redis via REST API.
// Development (no env var): local JSON files in data/.
//
// Redis key namespace: "bk:" prefix for all keys.
//   bk:patterns          → PatternsWireV1 (pattern substrings obfuscated)
//   bk:seen              → SeenFile (JSON, keys obfuscated)
//   bk:history:YYYY-MM   → HistoryFile (JSON, values obfuscated)
//   bk:transactions:YYYY-MM → TransactionsArchiveWireV1 (descriptions obfuscated)
//
// Local files: data/patterns.json (PatternsWireV1), data/history/YYYY-MM.json,
//   data/transactions/YYYY-MM.json, data/seen.json
// ---------------------------------------------------------------------------

const useRedis = !!process.env.STORAGE_KV_REST_API_URL

// -- Redis helpers -----------------------------------------------------------

function getRedis() {
  const { Redis } = require('@upstash/redis') as typeof import('@upstash/redis')
  return new Redis({
    url: process.env.STORAGE_KV_REST_API_URL!,
    token: process.env.STORAGE_KV_REST_API_TOKEN!,
  })
}

async function redisGet<T>(key: string): Promise<T | null> {
  return getRedis().get<T>(key)
}

async function redisSet(key: string, value: unknown): Promise<void> {
  await getRedis().set(key, value)
}

async function redisKeys(pattern: string): Promise<string[]> {
  return getRedis().keys(pattern)
}

// -- Filesystem helpers ------------------------------------------------------

async function fileRead(relativePath: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(process.cwd(), relativePath), 'utf-8')
  } catch {
    return null
  }
}

async function fileWrite(relativePath: string, content: string): Promise<void> {
  const fullPath = path.join(process.cwd(), relativePath)
  const tmp = fullPath + '.tmp'
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(tmp, content, 'utf-8')
  await fs.rename(tmp, fullPath)
}

// -- Generic JSON read / write -----------------------------------------------

async function readJson<T>(key: string, fallback: T): Promise<T> {
  if (useRedis) {
    const value = await redisGet<T>(`bk:${key}`)
    if (value !== null) return value
    return fallback
  }
  const raw = await fileRead(`data/${key}.json`)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  if (useRedis) {
    await redisSet(`bk:${key}`, value)
    return
  }
  await fileWrite(`data/${key}.json`, JSON.stringify(value, null, 2))
}

// -- Public API --------------------------------------------------------------

export async function readPatterns(): Promise<PatternsFile> {
  let decoded: PatternsFile
  if (useRedis) {
    const value = await redisGet<unknown>('bk:patterns')
    if (value !== null) {
      decoded = decryptPatternsWire(value)
    } else {
      const raw = await fileRead('data/patterns.json')
      decoded = raw ? decryptPatternsWire(JSON.parse(raw)) : []
    }
  } else {
    const raw = await fileRead('data/patterns.json')
    decoded = raw ? decryptPatternsWire(JSON.parse(raw)) : []
  }

  const normalized = normalizePatternsFile(decoded)
  if (!isCanonicalPatternsForm(decoded)) {
    await writePatterns(normalized)
  }
  return normalized
}

export async function writePatterns(data: PatternsFile): Promise<void> {
  const wire = encryptPatternsWire(data)
  if (useRedis) {
    await redisSet('bk:patterns', wire)
    return
  }
  await fileWrite('data/patterns.json', JSON.stringify(wire, null, 2))
}

export async function readSeen(): Promise<SeenFile> {
  const raw = await readJson<Record<string, string>>('seen', {})
  return decryptSeen(raw)
}

export async function writeSeen(data: SeenFile): Promise<void> {
  return writeJson('seen', encryptSeen(data))
}

export async function readHistory(yearMonth: string): Promise<HistoryFile> {
  let raw: Record<string, string>
  if (useRedis) {
    const value = await redisGet<Record<string, string>>(`bk:history:${yearMonth}`)
    raw = value ?? {}
  } else {
    let str = await fileRead(`data/history/${yearMonth}.json`)
    if (str === null) {
      str = await fileRead(`data/history:${yearMonth}.json`)
    }
    raw = str ? (JSON.parse(str) as Record<string, string>) : {}
  }
  return decryptHistory(raw)
}

export async function writeHistory(yearMonth: string, data: HistoryFile): Promise<void> {
  const payload = encryptHistory(data)
  if (useRedis) {
    await redisSet(`bk:history:${yearMonth}`, payload)
    return
  }
  await fileWrite(`data/history/${yearMonth}.json`, JSON.stringify(payload, null, 2))
}

function toArchiveEntries(transactions: CategorizedTransaction[]): TransactionArchiveEntry[] {
  return transactions.map(t => ({
    date: t.date,
    description: t.description,
    inflow: t.inflow,
    outflow: t.outflow,
    source: t.source,
    category: t.category ?? 'Uncategorized',
  }))
}

export async function writeTransactionArchive(
  yearMonth: string,
  transactions: CategorizedTransaction[]
): Promise<void> {
  const entries = toArchiveEntries(transactions)
  const wire = encryptTransactionArchiveWire(entries)
  if (useRedis) {
    await redisSet(`bk:transactions:${yearMonth}`, wire)
    return
  }
  await fileWrite(`data/transactions/${yearMonth}.json`, JSON.stringify(wire, null, 2))
}

export async function readAllHistory(): Promise<Record<string, HistoryFile>> {
  try {
    let yearMonths: string[]

    if (useRedis) {
      const keys = await redisKeys('bk:history:*')
      yearMonths = keys.map(k => k.replace('bk:history:', ''))
    } else {
      const fromDir = new Set<string>()
      try {
        const dir = path.join(process.cwd(), 'data', 'history')
        const files = await fs.readdir(dir)
        for (const f of files) {
          if (f.endsWith('.json') && f !== '.gitkeep') {
            fromDir.add(f.replace('.json', ''))
          }
        }
      } catch {
        /* missing dir */
      }
      try {
        const dataDir = path.join(process.cwd(), 'data')
        const top = await fs.readdir(dataDir)
        for (const f of top) {
          const m = f.match(/^history:(\d{4}-\d{2})\.json$/)
          if (m) fromDir.add(m[1])
        }
      } catch {
        /* missing dir */
      }
      yearMonths = [...fromDir]
    }

    const entries = await Promise.all(
      yearMonths.map(async ym => [ym, await readHistory(ym)] as [string, HistoryFile])
    )
    return Object.fromEntries(entries.sort((a, b) => a[0].localeCompare(b[0])))
  } catch {
    return {}
  }
}
