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
