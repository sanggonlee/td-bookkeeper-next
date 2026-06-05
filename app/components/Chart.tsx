'use client'

import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import type { HistoryFile } from '@/lib/types'

export type ChartMode = 'absolute' | 'lastMonth' | 'avgThree'

interface ChartProps {
  history: Record<string, HistoryFile>
  selectedCategories?: Set<string>
  onCategoryToggle?: (category: string) => void
  chartMode?: ChartMode
  categoryOrder?: string[]
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#0ea5e9', '#a855f7', '#eab308', '#64748b',
]

const MONTH_SHORT = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const LAST_MONTHS = 12

function parseYm(key: string): { y: number; m: number } | null {
  const m = key.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  const y = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10)
  if (mo < 1 || mo > 12) return null
  return { y, m: mo }
}

function ymKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`
}

/** Last `LAST_MONTHS` calendar months ending at `endYm` (inclusive), oldest first. */
function lastMonthWindow(endYm: string): string[] {
  const p = parseYm(endYm)
  if (!p) return []
  const end = new Date(p.y, p.m - 1, 1)
  const keys: string[] = []
  for (let i = LAST_MONTHS - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1)
    keys.push(ymKey(d.getFullYear(), d.getMonth() + 1))
  }
  return keys
}

function formatMonthLabel(ym: string): string {
  const p = parseYm(ym)
  if (!p) return ym
  return `${MONTH_SHORT[p.m]} ${p.y}`
}

/**
 * Formats a delta between two displayed (negated) values.
 * If both share the same sign, appends the percent change in parentheses.
 * Percent sign is determined by delta/base so that same-direction magnitude
 * growth always shows as positive (e.g. -$100 → -$110 gives -$10 (+10%)).
 */
function formatDelta(displayedDelta: number, displayedCurrent: number, displayedBase: number): string {
  const sameSign = (displayedCurrent > 0 && displayedBase > 0) || (displayedCurrent < 0 && displayedBase < 0)
  const absDelta = Math.abs(displayedDelta)
  const sign = displayedDelta >= 0 ? '+' : '-'
  const deltaStr = `${sign}$${absDelta.toFixed(2)}`
  if (sameSign && displayedBase !== 0) {
    const pctRatio = displayedDelta / displayedBase
    const pct = Math.abs(pctRatio * 100).toFixed(1)
    const pctSign = pctRatio >= 0 ? '+' : '-'
    return `${deltaStr} (${pctSign}${pct}%)`
  }
  return deltaStr
}

// tooltipLabels[monthKey][cat] = pre-formatted string shown in tooltip for delta modes
type TooltipLabels = Record<string, Record<string, string>>

export default function Chart({ history, selectedCategories, onCategoryToggle, chartMode = 'absolute', categoryOrder = [] }: ChartProps) {
  const { data, categories, tooltipLabels } = useMemo(() => {
    const monthKeys = Object.keys(history).filter(k => parseYm(k) !== null).sort()
    if (monthKeys.length === 0) {
      return { data: [] as Record<string, number | string>[], categories: [] as string[], tooltipLabels: {} as TooltipLabels }
    }

    const endYm = monthKeys[monthKeys.length - 1]!
    const windowKeys = lastMonthWindow(endYm)

    const catSet = new Set<string>()
    for (const ym of windowKeys) {
      const row = history[ym]
      if (!row) continue
      for (const key of Object.keys(row)) {
        if (key !== 'Total') catSet.add(key)
      }
    }
    const inOrder = categoryOrder.filter(c => catSet.has(c))
    const extra = Array.from(catSet).filter(c => !categoryOrder.includes(c)).sort((a, b) => a.localeCompare(b))
    const categories = [...inOrder, ...extra]

    // Raw stored values (negative = outflow, positive = inflow)
    const rawByYm: Record<string, Record<string, number>> = {}
    for (const ym of windowKeys) {
      const row = history[ym] ?? {}
      rawByYm[ym] = {}
      for (const cat of categories) {
        rawByYm[ym][cat] = row[cat] ?? 0
      }
    }

    const tooltipLabels: TooltipLabels = {}
    const data = windowKeys.map((ym, idx) => {
      const entry: Record<string, number | string> = {
        monthKey: ym,
        monthLabel: formatMonthLabel(ym),
      }
      tooltipLabels[ym] = {}
      for (const cat of categories) {
        const raw = rawByYm[ym]![cat] ?? 0
        if (chartMode === 'absolute') {
          // Negate: inflow positive, outflow negative on chart
          entry[cat] = -raw
        } else if (chartMode === 'lastMonth') {
          const prevYm = windowKeys[idx - 1]
          if (prevYm === undefined) {
            entry[cat] = 0
            tooltipLabels[ym]![cat] = '—'
          } else {
            const prevRaw = rawByYm[prevYm]![cat] ?? 0
            const displayed = -raw
            const prevDisplayed = -prevRaw
            const delta = displayed - prevDisplayed
            entry[cat] = delta
            tooltipLabels[ym]![cat] = formatDelta(delta, displayed, prevDisplayed)
          }
        } else {
          // avgThree: delta from average of up to 3 preceding months
          const prevSlice = windowKeys.slice(Math.max(0, idx - 3), idx)
          if (prevSlice.length === 0) {
            entry[cat] = 0
            tooltipLabels[ym]![cat] = '—'
          } else {
            const avgRaw = prevSlice.reduce((s, k) => s + (rawByYm[k]![cat] ?? 0), 0) / prevSlice.length
            const displayed = -raw
            const avgDisplayed = -avgRaw
            const delta = displayed - avgDisplayed
            entry[cat] = delta
            tooltipLabels[ym]![cat] = formatDelta(delta, displayed, avgDisplayed)
          }
        }
      }
      return entry
    })

    return { data, categories, tooltipLabels }
  }, [history, chartMode, categoryOrder])

  if (data.length === 0 || categories.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={440}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 72 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="monthLabel"
          tick={{ fontSize: 11 }}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={56}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={v => {
            if (chartMode !== 'absolute') return String(v)
            const n = Number(v)
            const abs = Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
            return n < 0 ? `-$${abs}` : `$${abs}`
          }}
          width={chartMode === 'absolute' ? 56 : 0}
          hide={chartMode !== 'absolute'}
        />
        <Tooltip
          wrapperStyle={{ zIndex: 10 }}
          formatter={(value, name, props) => {
            if (chartMode !== 'absolute') {
              const ym = props.payload?.monthKey as string | undefined
              if (ym && tooltipLabels[ym]) {
                return tooltipLabels[ym]![name as string] ?? String(value)
              }
            }
            if (typeof value !== 'number') return String(value)
            return value < 0 ? `-$${Math.abs(value).toFixed(2)}` : `$${value.toFixed(2)}`
          }}
          labelFormatter={(label) => String(label ?? '')}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12, cursor: 'pointer', zIndex: 1 }}
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          onClick={(payload) => onCategoryToggle?.(payload.dataKey as string)}
          formatter={(value) => (
            <span
              style={{
                opacity: !selectedCategories || selectedCategories.has(value) ? 1 : 0.35,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {value}
            </span>
          )}
        />
        {categories.map((cat, i) => (
          <Line
            key={cat}
            type="monotone"
            dataKey={cat}
            name={cat}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 1 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
            hide={selectedCategories !== undefined && !selectedCategories.has(cat)}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
