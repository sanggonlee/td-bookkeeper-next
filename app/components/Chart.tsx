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

interface ChartProps {
  history: Record<string, HistoryFile>
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

export default function Chart({ history }: ChartProps) {
  const { data, categories } = useMemo(() => {
    const monthKeys = Object.keys(history).filter(k => parseYm(k) !== null).sort()
    if (monthKeys.length === 0) {
      return { data: [] as Record<string, string | number>[], categories: [] as string[] }
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
    const categories = Array.from(catSet).sort((a, b) => a.localeCompare(b))

    const data = windowKeys.map(ym => {
      const row = history[ym] ?? {}
      const entry: Record<string, string | number> = {
        monthKey: ym,
        monthLabel: formatMonthLabel(ym),
      }
      for (const cat of categories) {
        entry[cat] = row[cat] ?? 0
      }
      return entry
    })

    return { data, categories }
  }, [history])

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
          tickFormatter={v => `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          width={56}
        />
        <Tooltip
          formatter={(value) =>
            typeof value === 'number' ? `$${value.toFixed(2)}` : String(value)
          }
          labelFormatter={(label) => String(label ?? '')}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
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
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
