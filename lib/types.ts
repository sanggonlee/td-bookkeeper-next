export type PatternEntry = {
  label: string
  patterns: string[]
}

export type PatternsFile = PatternEntry[]

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
