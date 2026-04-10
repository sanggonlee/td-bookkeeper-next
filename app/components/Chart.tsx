'use client'

import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
]

export default function Chart({ history }: ChartProps) {
  const { data, categories } = useMemo(() => {
    const months = Object.keys(history).sort()
    const catSet = new Set<string>()
    for (const month of months) {
      for (const key of Object.keys(history[month])) {
        if (key !== 'Total') catSet.add(key)
      }
    }
    const categories = Array.from(catSet)

    const data = months.map(month => {
      const entry: Record<string, string | number> = { month }
      for (const cat of categories) {
        entry[cat] = history[month][cat] ?? 0
      }
      return entry
    })

    return { data, categories }
  }, [history])

  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
        <Tooltip formatter={(value) => typeof value === 'number' ? `$${value.toFixed(2)}` : value} />
        <Legend />
        {categories.map((cat, i) => (
          <Bar key={cat} dataKey={cat} fill={COLORS[i % COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
