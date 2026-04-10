import fs from 'fs/promises'
import path from 'path'
import type { PatternsFile, SeenFile, HistoryFile } from './types'
import { encryptHistory, decryptHistory, encryptSeen, decryptSeen } from './obfuscate'

const DATA_DIR = path.join(process.cwd(), 'data')
const HISTORY_DIR = path.join(DATA_DIR, 'history')

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return fallback
  }
}

async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  const tmp = filePath + '.tmp'
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
  await fs.rename(tmp, filePath)
}

export async function readPatterns(): Promise<PatternsFile> {
  return readJson<PatternsFile>(path.join(DATA_DIR, 'patterns.json'), [])
}

export async function writePatterns(data: PatternsFile): Promise<void> {
  return writeJsonAtomic(path.join(DATA_DIR, 'patterns.json'), data)
}

export async function readSeen(): Promise<SeenFile> {
  const raw = await readJson<Record<string, string>>(path.join(DATA_DIR, 'seen.json'), {})
  return decryptSeen(raw)
}

export async function writeSeen(data: SeenFile): Promise<void> {
  return writeJsonAtomic(path.join(DATA_DIR, 'seen.json'), encryptSeen(data))
}

export async function readHistory(yearMonth: string): Promise<HistoryFile> {
  const raw = await readJson<Record<string, string>>(
    path.join(HISTORY_DIR, `${yearMonth}.json`), {}
  )
  return decryptHistory(raw)
}

export async function writeHistory(yearMonth: string, data: HistoryFile): Promise<void> {
  return writeJsonAtomic(path.join(HISTORY_DIR, `${yearMonth}.json`), encryptHistory(data))
}

export async function readAllHistory(): Promise<Record<string, HistoryFile>> {
  try {
    const files = await fs.readdir(HISTORY_DIR)
    const jsonFiles = files.filter(f => f.endsWith('.json'))
    const entries = await Promise.all(
      jsonFiles.map(async (f) => {
        const key = f.replace('.json', '')
        const raw = await readJson<Record<string, string>>(path.join(HISTORY_DIR, f), {})
        return [key, decryptHistory(raw)] as [string, HistoryFile]
      })
    )
    return Object.fromEntries(entries.sort((a, b) => a[0].localeCompare(b[0])))
  } catch {
    return {}
  }
}
