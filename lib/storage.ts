import fs from 'fs/promises'
import path from 'path'
import type { PatternsFile, SeenFile, HistoryFile } from './types'
import { encryptHistory, decryptHistory, encryptSeen, decryptSeen } from './obfuscate'

// ---------------------------------------------------------------------------
// Storage provider: Vercel Blob (production) or local filesystem (development)
//
// Vercel Blob is used when BLOB_READ_WRITE_TOKEN is present (auto-injected by
// Vercel when you link a Blob store to the project).
// ---------------------------------------------------------------------------

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN

// -- Blob helpers (lazy import so the module is tree-shaken in local builds) --

async function blobRead(pathname: string): Promise<string | null> {
  const { list } = await import('@vercel/blob')
  const { blobs } = await list({ prefix: pathname })
  const match = blobs.find(b => b.pathname === pathname)
  if (!match) return null
  const res = await fetch(match.url, { cache: 'no-store' })
  return res.ok ? res.text() : null
}

async function blobWrite(pathname: string, content: string): Promise<void> {
  const { put } = await import('@vercel/blob')
  await put(pathname, content, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  })
}

async function blobList(prefix: string): Promise<string[]> {
  const { list } = await import('@vercel/blob')
  const { blobs } = await list({ prefix })
  return blobs.map(b => b.pathname)
}

// -- Unified read / write / list -----------------------------------------------

async function readRaw(relativePath: string): Promise<string | null> {
  if (useBlob) {
    // Try blob first; fall back to the committed filesystem copy (e.g. patterns.json seed)
    const fromBlob = await blobRead(relativePath).catch(() => null)
    if (fromBlob !== null) return fromBlob
  }
  try {
    return await fs.readFile(path.join(process.cwd(), relativePath), 'utf-8')
  } catch {
    return null
  }
}

async function writeRaw(relativePath: string, content: string): Promise<void> {
  if (useBlob) {
    await blobWrite(relativePath, content)
    return
  }
  const fullPath = path.join(process.cwd(), relativePath)
  const tmp = fullPath + '.tmp'
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(tmp, content, 'utf-8')
  await fs.rename(tmp, fullPath)
}

async function listRaw(prefix: string): Promise<string[]> {
  if (useBlob) {
    return blobList(prefix)
  }
  try {
    const dir = path.join(process.cwd(), prefix)
    const files = await fs.readdir(dir)
    return files.filter(f => f !== '.gitkeep').map(f => `${prefix}/${f}`)
  } catch {
    return []
  }
}

// -- Generic JSON helpers -------------------------------------------------------

async function readJson<T>(relativePath: string, fallback: T): Promise<T> {
  const raw = await readRaw(relativePath)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJson(relativePath: string, data: unknown): Promise<void> {
  await writeRaw(relativePath, JSON.stringify(data, null, 2))
}

// -- Public API ----------------------------------------------------------------

export async function readPatterns(): Promise<PatternsFile> {
  return readJson<PatternsFile>('data/patterns.json', [])
}

export async function writePatterns(data: PatternsFile): Promise<void> {
  return writeJson('data/patterns.json', data)
}

export async function readSeen(): Promise<SeenFile> {
  const raw = await readJson<Record<string, string>>('data/seen.json', {})
  return decryptSeen(raw)
}

export async function writeSeen(data: SeenFile): Promise<void> {
  return writeJson('data/seen.json', encryptSeen(data))
}

export async function readHistory(yearMonth: string): Promise<HistoryFile> {
  const raw = await readJson<Record<string, string>>(
    `data/history/${yearMonth}.json`, {}
  )
  return decryptHistory(raw)
}

export async function writeHistory(yearMonth: string, data: HistoryFile): Promise<void> {
  return writeJson(`data/history/${yearMonth}.json`, encryptHistory(data))
}

export async function readAllHistory(): Promise<Record<string, HistoryFile>> {
  try {
    const paths = await listRaw('data/history')
    const jsonPaths = paths.filter(p => p.endsWith('.json'))
    const entries = await Promise.all(
      jsonPaths.map(async (p) => {
        const key = path.basename(p, '.json')
        const raw = await readJson<Record<string, string>>(p, {})
        return [key, decryptHistory(raw)] as [string, HistoryFile]
      })
    )
    return Object.fromEntries(entries.sort((a, b) => a[0].localeCompare(b[0])))
  } catch {
    return {}
  }
}
