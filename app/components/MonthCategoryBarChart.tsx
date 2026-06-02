'use client'

import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import type { HistoryFile } from '@/lib/types'

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#0ea5e9', '#a855f7', '#eab308', '#64748b',
]

interface MonthCategoryBarChartProps {
  totals: HistoryFile
  categoryOrder: string[]
  selectedCategories?: Set<string>
  onCategoryToggle?: (category: string) => void
}

export default function MonthCategoryBarChart({
  totals,
  categoryOrder,
  selectedCategories,
  onCategoryToggle,
}: MonthCategoryBarChartProps) {
  const data = useMemo(() => {
    const extra = Object.keys(totals).filter(
      k => k !== 'Total' && !categoryOrder.includes(k)
    )
    const ordered = [...categoryOrder, ...extra.sort((a, b) => a.localeCompare(b))]
    return ordered
      .filter(cat => (totals[cat] ?? 0) !== 0)
      .map(cat => ({
        category: cat,
        // Stored as outflow − inflow; negate so inflow is positive, outflow negative.
        amount: -(totals[cat] ?? 0),
      }))
  }, [totals, categoryOrder])

  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={Math.min(520, 120 + data.length * 36)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          tickFormatter={v => {
            const n = Number(v)
            const abs = Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
            return n < 0 ? `-$${abs}` : `$${abs}`
          }}
        />
        <YAxis
          type="category"
          dataKey="category"
          width={168}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(value: unknown) => {
            if (typeof value !== 'number') return String(value ?? '')
            return value < 0 ? `-$${Math.abs(value).toFixed(2)}` : `$${value.toFixed(2)}`
          }}
          labelFormatter={label => String(label)}
        />
        <Bar
          dataKey="amount"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
          cursor={onCategoryToggle ? 'pointer' : undefined}
          onClick={(barData) => onCategoryToggle?.((barData as unknown as { category: string }).category)}
        >
          {data.map((entry, i) => {
            const active = !selectedCategories || selectedCategories.has(entry.category)
            return (
              <Cell
                key={i}
                fill={COLORS[i % COLORS.length]}
                opacity={active ? 1 : 0.25}
              />
            )
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
