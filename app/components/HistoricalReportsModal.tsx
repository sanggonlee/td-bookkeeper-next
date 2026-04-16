'use client'

import React, { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import Chart from './Chart'
import type { HistoryFile } from '@/lib/types'

interface HistoricalReportsModalProps {
  open: boolean
  onClose: () => void
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 16px 48px;
  overflow-y: auto;
`

const Panel = styled.div`
  background: #fff;
  border-radius: 12px;
  max-width: 900px;
  width: 100%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 28px 24px 32px;
`

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
`

const Title = styled.h2`
  font-size: 1.35rem;
  font-weight: 600;
  color: #111;
  margin: 0;
`

const Subtitle = styled.p`
  color: #555;
  font-size: 0.9rem;
  margin: 0 0 20px;
`

const CloseBtn = styled.button`
  flex-shrink: 0;
  padding: 8px 14px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  &:hover {
    background: #f9fafb;
  }
`

const StatusMsg = styled.p`
  color: #888;
  font-size: 0.875rem;
`

const ErrorMsg = styled(StatusMsg)`
  color: #e11d48;
`

const ChartSection = styled.div`
  margin: 24px 0 32px;
`

const ChartTitle = styled.h3`
  font-size: 1.05rem;
  font-weight: 600;
  color: #111;
  margin: 0 0 14px;
`

const MonthBlock = styled.section`
  margin-bottom: 28px;
  &:last-child {
    margin-bottom: 0;
  }
`

const MonthTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #222;
  margin: 0 0 10px;
`

const SummaryTable = styled.table`
  width: 100%;
  border-collapse: collapse;
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

const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function formatYearMonth(ym: string): string {
  const [y, m] = ym.split('-')
  const mi = parseInt(m, 10)
  if (!y || isNaN(mi) || mi < 1 || mi > 12) return ym
  return `${MONTH_NAMES[mi]} ${y}`
}

export default function HistoricalReportsModal({ open, onClose }: HistoricalReportsModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Record<string, HistoryFile>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/history')
      if (!res.ok) throw new Error('Failed to load history')
      const data = (await res.json()) as Record<string, HistoryFile>
      setHistory(data)
    } catch {
      setError('Could not load saved reports.')
      setHistory({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const months = Object.keys(history).sort()
  const hasData = months.length > 0

  return (
    <Overlay
      role="dialog"
      aria-modal="true"
      aria-labelledby="historical-reports-title"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Panel onClick={e => e.stopPropagation()}>
        <Header>
          <Title id="historical-reports-title">All-time saved reports</Title>
          <CloseBtn type="button" onClick={onClose}>
            Close
          </CloseBtn>
        </Header>
        <Subtitle>
          Monthly totals from every finalized run. New months are added when you finish Step 4.
        </Subtitle>

        {loading && <StatusMsg>Loading…</StatusMsg>}
        {error && <ErrorMsg>{error}</ErrorMsg>}

        {!loading && !error && !hasData && (
          <StatusMsg>No saved reports yet. Complete a month through Step 4 to store history here.</StatusMsg>
        )}

        {!loading && hasData && (
          <>
            <ChartSection>
              <ChartTitle>Month-over-month spending</ChartTitle>
              <Chart history={history} />
            </ChartSection>

            {months.map(ym => {
              const totals = history[ym]
              const rows = Object.entries(totals).filter(([k]) => k !== 'Total')
              return (
                <MonthBlock key={ym}>
                  <MonthTitle>{formatYearMonth(ym)}</MonthTitle>
                  <SummaryTable>
                    <thead>
                      <tr>
                        <Th>Category</Th>
                        <Th style={{ textAlign: 'right' }}>Net spending</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(([cat, val]) => (
                        <tr key={cat}>
                          <Td>{cat}</Td>
                          <Td style={{ textAlign: 'right' }}>${val.toFixed(2)}</Td>
                        </tr>
                      ))}
                      <TotalRow>
                        <Td>Total</Td>
                        <Td style={{ textAlign: 'right' }}>
                          ${(totals['Total'] ?? 0).toFixed(2)}
                        </Td>
                      </TotalRow>
                    </tbody>
                  </SummaryTable>
                </MonthBlock>
              )
            })}
          </>
        )}
      </Panel>
    </Overlay>
  )
}
