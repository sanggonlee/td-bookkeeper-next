import type {
  PatternsFile,
  PatternsWireV1,
  TransactionArchiveEntry,
  TransactionsArchiveWireV1,
} from './types'

// XOR-based obfuscation for storing numeric amounts in history files.
// Encrypt before writing to disk, decrypt after reading.
// The same token must be used for both — mismatched tokens produce NaN on decrypt.

function getToken(): string {
  return process.env.OBFUSCATOR_TOKEN ?? 'VERY_SECRET'
}

function xor(text: string, key: string): string {
  return Array.from(text)
    .map((ch, i) => String.fromCharCode(ch.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
    .join('')
}

export function encryptAmount(value: number): string {
  const raw = xor(String(value), getToken())
  return Buffer.from(raw, 'binary').toString('base64url')
}

export function decryptAmount(encoded: string): number {
  try {
    const raw = Buffer.from(encoded, 'base64url').toString('binary')
    return parseFloat(xor(raw, getToken()))
  } catch {
    return NaN
  }
}

// Encrypt/decrypt an entire HistoryFile (Record<category, amount>)
export function encryptHistory(data: Record<string, number>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, encryptAmount(v)])
  )
}

export function decryptHistory(data: Record<string, string>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, decryptAmount(v)])
  )
}

// Encrypt/decrypt a plain string (e.g. transaction descriptions)
export function encryptString(value: string): string {
  const raw = xor(value, getToken())
  return Buffer.from(raw, 'binary').toString('base64url')
}

export function decryptString(encoded: string): string {
  try {
    const raw = Buffer.from(encoded, 'base64url').toString('binary')
    return xor(raw, getToken())
  } catch {
    return ''
  }
}

// Encrypt/decrypt a SeenFile (Record<description, categoryLabel>).
// Only the keys (descriptions) are sensitive — category labels stay plaintext.
export function encryptSeen(data: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data).map(([desc, cat]) => [encryptString(desc), cat])
  )
}

export function decryptSeen(data: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data).map(([enc, cat]) => [decryptString(enc), cat])
  )
}

const PATTERNS_FORMAT_V1 = 'enc-v1' as const

export function encryptPatternsWire(data: PatternsFile): PatternsWireV1 {
  return {
    format: PATTERNS_FORMAT_V1,
    items: data.map(e => ({
      label: e.label,
      patterns: e.patterns.map(p => encryptString(p)),
    })),
  }
}

/** Accepts legacy plaintext `PatternEntry[]` or `{ format: 'enc-v1', items }`. */
const TRANSACTIONS_ARCHIVE_FORMAT_V1 = 'enc-v1' as const

export function encryptTransactionArchiveWire(
  entries: TransactionArchiveEntry[]
): TransactionsArchiveWireV1 {
  return {
    format: TRANSACTIONS_ARCHIVE_FORMAT_V1,
    items: entries.map(e => ({
      ...e,
      description: encryptString(e.description),
    })),
  }
}

/** Legacy: plaintext `TransactionArchiveEntry[]`. Current: `{ format: 'enc-v1', items }`. */
export function decryptTransactionArchiveWire(raw: unknown): TransactionArchiveEntry[] {
  if (Array.isArray(raw)) {
    return raw as TransactionArchiveEntry[]
  }
  if (
    raw &&
    typeof raw === 'object' &&
    (raw as TransactionsArchiveWireV1).format === TRANSACTIONS_ARCHIVE_FORMAT_V1 &&
    Array.isArray((raw as TransactionsArchiveWireV1).items)
  ) {
    return (raw as TransactionsArchiveWireV1).items.map(e => ({
      ...e,
      description: decryptString(e.description),
    }))
  }
  return []
}

export function decryptPatternsWire(wire: unknown): PatternsFile {
  if (Array.isArray(wire)) {
    return wire as PatternsFile
  }
  if (
    wire &&
    typeof wire === 'object' &&
    (wire as PatternsWireV1).format === PATTERNS_FORMAT_V1 &&
    Array.isArray((wire as PatternsWireV1).items)
  ) {
    return (wire as PatternsWireV1).items.map(e => ({
      label: e.label,
      patterns: e.patterns.map(p => decryptString(p)).filter(p => p.length > 0),
    }))
  }
  return []
}
