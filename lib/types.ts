export type PatternEntry = {
  label: string
  patterns: string[]
}

export type PatternsFile = PatternEntry[]

/** On-disk / Redis shape: category labels plaintext; pattern substrings obfuscated. */
export type PatternsWireV1 = {
  format: 'enc-v1'
  items: { label: string; patterns: string[] }[]
}

// data/seen.json: exact description -> category label
export type SeenFile = Record<string, string>

// data/history/YYYY-MM.json: category label -> total amount
export type HistoryFile = Record<string, number>

export type Transaction = {
  date: string // ISO: YYYY-MM-DD
  description: string
  inflow: number
  outflow: number
  source: 'td' | 'amex' | 'scotia' | 'unknown'
}

// In-memory / decrypted archive row
export type TransactionArchiveEntry = {
  date: string
  description: string
  inflow: number
  outflow: number
  source: Transaction['source']
  category: string
}

/** On disk / Redis: `items[].description` is encryptString ciphertext. */
export type TransactionsArchiveWireV1 = {
  format: 'enc-v1'
  items: TransactionArchiveEntry[]
}

export type CategorizedTransaction = Transaction & {
  status: 'auto' | 'unknown' | 'ambiguous'
  category?: string     // set when status === 'auto'
  candidates?: string[] // set when status === 'ambiguous'
}

// Payload sent from Step 3 to the finalize API
export type FinalizePayload = {
  month: number
  year: number
  // Map from description -> chosen category label
  resolutions: Record<string, string>
  // Descriptions to save as exact matches in seen.json
  rememberDescriptions: string[]
  // Descriptions to save as literal patterns in patterns.json
  saveAsPatterns: Record<string, string>
  // All categorized transactions
  transactions: CategorizedTransaction[]
}
