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
