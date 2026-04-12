import fs from 'fs/promises'
import path from 'path'
import type { PatternsFile, SeenFile, HistoryFile } from './types'
import { encryptHistory, decryptHistory, encryptSeen, decryptSeen } from './obfuscate'

// ---------------------------------------------------------------------------
// Storage provider
//
// Production (STORAGE_KV_REST_API_URL set): Upstash Redis via REST API.
// Development (no env var): local JSON files in data/.
//
// Redis key namespace: "bk:" prefix for all keys.
//   bk:patterns          → PatternsFile (JSON, plaintext)
//   bk:seen              → SeenFile (JSON, keys obfuscated)
//   bk:history:YYYY-MM   → HistoryFile (JSON, values obfuscated)
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
    // Redis returns parsed JSON automatically; fall back to filesystem seed
    // for patterns (committed to git) when Redis has no value yet.
    if (value !== null) return value
    if (key === 'patterns') {
      const raw = await fileRead('data/patterns.json')
      return raw ? (JSON.parse(raw) as T) : fallback
    }
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
  return readJson<PatternsFile>('patterns', [])
}

export async function writePatterns(data: PatternsFile): Promise<void> {
  return writeJson('patterns', data)
}

export async function readSeen(): Promise<SeenFile> {
  const raw = await readJson<Record<string, string>>('seen', {})
  return decryptSeen(raw)
}

export async function writeSeen(data: SeenFile): Promise<void> {
  return writeJson('seen', encryptSeen(data))
}

export async function readHistory(yearMonth: string): Promise<HistoryFile> {
  const raw = await readJson<Record<string, string>>(`history:${yearMonth}`, {})
  return decryptHistory(raw)
}

export async function writeHistory(yearMonth: string, data: HistoryFile): Promise<void> {
  return writeJson(`history:${yearMonth}`, encryptHistory(data))
}

export async function readAllHistory(): Promise<Record<string, HistoryFile>> {
  try {
    let yearMonths: string[]

    if (useRedis) {
      const keys = await redisKeys('bk:history:*')
      yearMonths = keys.map(k => k.replace('bk:history:', ''))
    } else {
      const dir = path.join(process.cwd(), 'data', 'history')
      const files = await fs.readdir(dir)
      yearMonths = files
        .filter(f => f.endsWith('.json') && f !== '.gitkeep')
        .map(f => f.replace('.json', ''))
    }

    const entries = await Promise.all(
      yearMonths.map(async ym => {
        const raw = await readJson<Record<string, string>>(`history:${ym}`, {})
        return [ym, decryptHistory(raw)] as [string, HistoryFile]
      })
    )
    return Object.fromEntries(entries.sort((a, b) => a[0].localeCompare(b[0])))
  } catch {
    return {}
  }
}
