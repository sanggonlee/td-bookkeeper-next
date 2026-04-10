'use client'

import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import Chart from './Chart'
import type { CategorizedTransaction, FinalizePayload, HistoryFile, PatternEntry } from '@/lib/types'

interface StepResultsProps {
  transactions: CategorizedTransaction[]
  resolutions: Record<string, string>
  rememberDescriptions: string[]
  saveAsPatterns: Record<string, string>
  month: number
  year: number
  onStartOver: () => void
}

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px;
`

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #111;
  margin-bottom: 4px;
`

const MonthLabel = styled.p`
  color: #555;
  margin-bottom: 28px;
  font-size: 0.95rem;
`

const SummaryTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 24px;
  font-size: 0.9rem;
`

const Th = styled.th`
  text-align: left;
  padding: 8px 12px;
  color: #666;
  border-bottom: 2px solid #e5e7eb;
  font-weight: 500;
`

const Td = styled.td`
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
  color: #333;
`

const TotalRow = styled.tr`
  font-weight: 600;
  background: #f9fafb;
`

const CsvRow = styled.div`
  font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 0.85rem;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px 16px;
  color: #1e293b;
  word-break: break-all;
  margin-bottom: 28px;
  user-select: all;
`

const CsvHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`

const CsvLabel = styled.p`
  font-size: 0.8rem;
  color: #888;
  margin: 0;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const CopyButton = styled.button<{ $copied: boolean }>`
  padding: 4px 12px;
  font-size: 0.8rem;
  border-radius: 6px;
  border: 1px solid ${p => (p.$copied ? '#22c55e' : '#d1d5db')};
  background: ${p => (p.$copied ? '#f0fdf4' : 'white')};
  color: ${p => (p.$copied ? '#16a34a' : '#555')};
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  &:hover {
    border-color: ${p => (p.$copied ? '#22c55e' : '#0070f3')};
    color: ${p => (p.$copied ? '#16a34a' : '#0070f3')};
  }
`

const ActionRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 36px;
`

const StartOverButton = styled.button`
  padding: 10px 20px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  &:hover { background: #f9fafb; }
`

const ChartSection = styled.div`
  margin-top: 40px;
`

const ChartTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #111;
  margin-bottom: 16px;
`

const StatusMsg = styled.p`
  color: #888;
  font-size: 0.875rem;
`

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function StepResults({
  transactions,
  resolutions,
  rememberDescriptions,
  saveAsPatterns,
  month,
  year,
  onStartOver,
}: StepResultsProps) {
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [history, setHistory] = useState<Record<string, HistoryFile>>({})
  const [currentTotals, setCurrentTotals] = useState<HistoryFile>({})
  const [patternOrder, setPatternOrder] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function finalize() {
      try {
        const payload: FinalizePayload = {
          month,
          year,
          resolutions,
          rememberDescriptions,
          saveAsPatterns,
          transactions,
        }
        await fetch('/api/transactions/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const [histRes, patternsRes] = await Promise.all([
          fetch('/api/history'),
          fetch('/api/patterns'),
        ])
        const histData = await histRes.json() as Record<string, HistoryFile>
        const patternsData = await patternsRes.json() as PatternEntry[]

        setHistory(histData)
        setPatternOrder(patternsData.map(e => e.label))

        const yearMonth = `${year}-${String(month).padStart(2, '0')}`
        setCurrentTotals(histData[yearMonth] ?? {})
        setStatus('done')
      } catch {
        setStatus('error')
      }
    }
    finalize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Build ordered CSV values: ALL patterns.json categories (0.00 if no transactions),
  // then any extra categories not in patterns.json, then Total.
  function buildCsvRow(): string {
    const extra = Object.keys(currentTotals).filter(
      k => k !== 'Total' && !patternOrder.includes(k)
    )
    const ordered = [...patternOrder, ...extra]
    const values = ordered.map(k => (currentTotals[k] ?? 0).toFixed(2))
    values.push((currentTotals['Total'] ?? 0).toFixed(2))
    return values.join(',')
  }

  const monthName = `${MONTH_NAMES[month]} ${year}`

  return (
    <Container>
      <Title>Step 4 — Results</Title>
      <MonthLabel>{monthName}</MonthLabel>

      {status === 'loading' && <StatusMsg>Saving results…</StatusMsg>}
      {status === 'error' && <StatusMsg style={{ color: '#e11d48' }}>Failed to save results.</StatusMsg>}

      {status === 'done' && (
        <>
          <SummaryTable>
            <thead>
              <tr>
                <Th>Category</Th>
                <Th style={{ textAlign: 'right' }}>Net Spending</Th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(currentTotals)
                .filter(([k]) => k !== 'Total')
                .map(([cat, val]) => (
                  <tr key={cat}>
                    <Td>{cat}</Td>
                    <Td style={{ textAlign: 'right' }}>${val.toFixed(2)}</Td>
                  </tr>
                ))}
              <TotalRow>
                <Td>Total</Td>
                <Td style={{ textAlign: 'right' }}>${(currentTotals['Total'] ?? 0).toFixed(2)}</Td>
              </TotalRow>
            </tbody>
          </SummaryTable>

          <CsvHeader>
            <CsvLabel>CSV row</CsvLabel>
            <CopyButton
              $copied={copied}
              onClick={() => {
                navigator.clipboard.writeText(buildCsvRow())
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? 'Copied!' : 'Copy row'}
            </CopyButton>
          </CsvHeader>
          <CsvRow>{buildCsvRow()}</CsvRow>

          <ActionRow>
            <StartOverButton onClick={onStartOver}>Start over</StartOverButton>
          </ActionRow>

          {Object.keys(history).length > 0 && (
            <ChartSection>
              <ChartTitle>Month-over-month spending</ChartTitle>
              <Chart history={history} />
            </ChartSection>
          )}
        </>
      )}
    </Container>
  )
}
