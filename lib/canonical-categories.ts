import type { PatternsFile } from './types'

/**
 * Single source of truth for category labels in patterns, seen, history, and archives.
 * Anything not in this list (after legacy remapping) is folded into "Etc".
 */
export const CANONICAL_CATEGORY_ORDER = [
  'Pay',
  'Tax',
  'Transfer',
  'Home',
  'Food',
  'Car/Transportation',
  'Travel',
  'Telecom/Subscriptions',
  'Charity',
  'Medical',
  'Bank',
  'Dog',
  'Etc',
] as const

export type CanonicalCategory = (typeof CANONICAL_CATEGORY_ORDER)[number]

const CANONICAL_SET = new Set<string>(CANONICAL_CATEGORY_ORDER)

/** Legacy labels from older versions of the app → current canonical name. */
const LEGACY_LABEL_MAP: Record<string, string> = {
  'Mort/Maint': 'Home',
  'Cash Withdrawl': 'Bank',
  'Cash Withdrawal': 'Bank',
  'E-Transfer': 'Transfer',
  'Transportation': 'Car/Transportation',
  'Internet/Phone': 'Telecom/Subscriptions',
  'Amazon': 'Etc',
  'OSAP': 'Tax',
  'Learning': 'Etc',
  Uncategorized: 'Etc',
}

/**
 * Map persisted category strings to a canonical label for storage and UI.
 */
export function normalizeCategoryLabel(label: string): string {
  const trimmed = label.trim()
  const mapped = LEGACY_LABEL_MAP[trimmed] ?? trimmed
  if (CANONICAL_SET.has(mapped)) return mapped
  return 'Etc'
}

function dedupeSortedPatterns(patterns: string[]): string[] {
  return [...new Set(patterns)].sort((a, b) => a.localeCompare(b))
}

/**
 * Merge pattern rows by canonical label and emit exactly one row per canonical category
 * (in canonical order). Used after reading patterns from disk or Redis.
 */
export function normalizePatternsFile(entries: PatternsFile): PatternsFile {
  const merged = new Map<string, string[]>()
  for (const e of entries) {
    const label = normalizeCategoryLabel(e.label)
    const cur = merged.get(label) ?? []
    cur.push(...e.patterns)
    merged.set(label, cur)
  }
  return CANONICAL_CATEGORY_ORDER.map(label => ({
    label,
    patterns: dedupeSortedPatterns(merged.get(label) ?? []),
  }))
}

/** True if `entries` is already the normalized shape (labels, order, merged pattern lists). */
export function isCanonicalPatternsForm(entries: PatternsFile): boolean {
  const n = normalizePatternsFile(entries)
  if (entries.length !== n.length) return false
  for (let i = 0; i < n.length; i++) {
    if (entries[i].label !== n[i].label) return false
    const a = [...entries[i].patterns].sort()
    const b = [...n[i].patterns].sort()
    if (a.length !== b.length || a.some((x, j) => x !== b[j])) return false
  }
  return true
}
