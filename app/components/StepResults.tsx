'use client'

import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import Chart from './Chart'
import MonthCategoryBarChart from './MonthCategoryBarChart'
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

const ChartBlock = styled.div`
  margin-bottom: 36px;
  &:last-child {
    margin-bottom: 0;
  }
`

const ChartTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #111;
  margin-bottom: 16px;
`

const NetBalancePanel = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px 28px;
  align-items: baseline;
  padding: 16px 18px;
  margin-bottom: 24px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
`

const NetBalanceStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const NetBalanceLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const NetBalanceValue = styled.span`
  font-size: 1.05rem;
  font-weight: 600;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
`

const NetBalanceHighlight = styled(NetBalanceValue)<{ $tone: 'pos' | 'neg' | 'zero' }>`
  color: ${p =>
    p.$tone === 'pos' ? '#15803d' : p.$tone === 'neg' ? '#b91c1c' : '#0f172a'};
`

const BreakdownSection = styled.section`
  margin-bottom: 28px;
`

const BreakdownTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #111;
  margin: 0 0 12px;
`

const CategoryBlock = styled.details`
  margin-bottom: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;

  &[open] > summary::before {
    transform: rotate(90deg);
  }
`

const CategorySummary = styled.summary`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 8px 16px;
  padding: 12px 14px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  color: #111;
  background: #f9fafb;
  list-style: none;
  &::-webkit-details-marker {
    display: none;
  }
  &::before {
    content: '▸';
    display: inline-block;
    margin-right: 8px;
    color: #64748b;
    transition: transform 0.15s;
    flex-shrink: 0;
  }
`

const CategorySummaryLabel = styled.span`
  flex: 0 1 auto;
  align-self: flex-start;
  text-align: left;
  margin-right: auto;
  min-width: 0;
  padding-right: 8px;
`

const CategorySummaryMeta = styled.span`
  flex: 0 1 auto;
  margin-left: auto;
  text-align: right;
  font-weight: 500;
  color: #64748b;
  font-size: 0.85rem;
`

const DetailTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
`

const DetailTh = styled.th`
  text-align: left;
  padding: 8px 12px;
  color: #64748b;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 500;
  background: #fafafa;
`

const DetailTd = styled.td`
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
  color: #333;
  vertical-align: top;
`

const DetailFoot = styled.tr`
  font-weight: 600;
  background: #f9fafb;
`

const MismatchNote = styled.p`
  margin: 0 12px 8px;
  font-size: 0.8rem;
  color: #b45309;
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

  const resolvedTransactions = useMemo(
    () =>
      transactions.map(t => {
        if (t.status !== 'auto') {
          return { ...t, status: 'auto' as const, category: resolutions[t.description] }
        }
        return t
      }),
    [transactions, resolutions]
  )

  const { totalInflow, totalOutflow, netBalance } = useMemo(() => {
    let inflow = 0
    let outflow = 0
    for (const t of resolvedTransactions) {
      inflow += t.inflow
      outflow += t.outflow
    }
    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      netBalance: inflow - outflow,
    }
  }, [resolvedTransactions])

  const transactionsByCategory = useMemo(() => {
    const map = new Map<string, CategorizedTransaction[]>()
    for (const t of resolvedTransactions) {
      const cat = t.category ?? 'Uncategorized'
      const list = map.get(cat)
      if (list) list.push(t)
      else map.set(cat, [t])
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.description.localeCompare(b.description)
      )
    }
    return map
  }, [resolvedTransactions])

  const breakdownCategoryOrder = useMemo(() => {
    const extra = Object.keys(currentTotals)
      .filter(k => k !== 'Total' && !patternOrder.includes(k))
      .sort((a, b) => a.localeCompare(b))
    const ordered = [...patternOrder.filter(c => c !== 'Total'), ...extra]
    const seen = new Set<string>()
    const out: string[] = []
    for (const cat of ordered) {
      if (seen.has(cat)) continue
      seen.add(cat)
      const hasTx = (transactionsByCategory.get(cat)?.length ?? 0) > 0
      const hasTotal = (currentTotals[cat] ?? 0) !== 0
      if (hasTx || hasTotal) out.push(cat)
    }
    for (const cat of transactionsByCategory.keys()) {
      if (!seen.has(cat)) {
        seen.add(cat)
        out.push(cat)
      }
    }
    return out
  }, [patternOrder, currentTotals, transactionsByCategory])

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

  const hasMonthBarData =
    status === 'done' &&
    Object.keys(currentTotals).some(
      k => k !== 'Total' && (currentTotals[k] ?? 0) !== 0
    )
  const hasHistoryChart = status === 'done' && Object.keys(history).length > 0

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

          <NetBalancePanel>
            <NetBalanceStat>
              <NetBalanceLabel>Total inflows</NetBalanceLabel>
              <NetBalanceValue>${totalInflow.toFixed(2)}</NetBalanceValue>
            </NetBalanceStat>
            <NetBalanceStat>
              <NetBalanceLabel>Total outflows</NetBalanceLabel>
              <NetBalanceValue>${totalOutflow.toFixed(2)}</NetBalanceValue>
            </NetBalanceStat>
            <NetBalanceStat>
              <NetBalanceLabel>Net balance</NetBalanceLabel>
              <NetBalanceHighlight
                $tone={netBalance > 0 ? 'pos' : netBalance < 0 ? 'neg' : 'zero'}
              >
                {netBalance >= 0 ? '' : '−'}
                ${Math.abs(netBalance).toFixed(2)}
              </NetBalanceHighlight>
            </NetBalanceStat>
          </NetBalancePanel>

          <BreakdownSection>
            <BreakdownTitle>Transaction breakdown by category</BreakdownTitle>
            {breakdownCategoryOrder.map(cat => {
              const rows = transactionsByCategory.get(cat) ?? []
              const savedNet = currentTotals[cat] ?? 0
              const sumNet = rows.reduce((s, t) => s + (t.outflow - t.inflow), 0)
              const mismatch = rows.length > 0 && Math.abs(sumNet - savedNet) > 0.005
              return (
                <CategoryBlock key={cat}>
                  <CategorySummary>
                    <CategorySummaryLabel>{cat}</CategorySummaryLabel>
                    <CategorySummaryMeta>
                      {rows.length} line{rows.length === 1 ? '' : 's'} · Net{' '}
                      <strong style={{ color: '#111' }}>${savedNet.toFixed(2)}</strong>
                      {savedNet !== sumNet && rows.length > 0 && (
                        <span style={{ marginLeft: 8 }}>
                          (from lines: ${sumNet.toFixed(2)})
                        </span>
                      )}
                    </CategorySummaryMeta>
                  </CategorySummary>
                  {mismatch && (
                    <MismatchNote>
                      Line sum differs from saved category total by more than half a cent — check
                      rounding or duplicate descriptions.
                    </MismatchNote>
                  )}
                  {rows.length > 0 ? (
                    <DetailTable>
                      <thead>
                        <tr>
                          <DetailTh>Date</DetailTh>
                          <DetailTh>Description</DetailTh>
                          <DetailTh>Source</DetailTh>
                          <DetailTh style={{ textAlign: 'right' }}>In</DetailTh>
                          <DetailTh style={{ textAlign: 'right' }}>Out</DetailTh>
                          <DetailTh style={{ textAlign: 'right' }}>Net</DetailTh>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((t, i) => {
                          const net = t.outflow - t.inflow
                          return (
                            <tr key={`${t.date}-${t.description}-${i}`}>
                              <DetailTd>{t.date}</DetailTd>
                              <DetailTd>{t.description}</DetailTd>
                              <DetailTd style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>
                                {t.source}
                              </DetailTd>
                              <DetailTd style={{ textAlign: 'right' }}>
                                {t.inflow > 0 ? `$${t.inflow.toFixed(2)}` : '—'}
                              </DetailTd>
                              <DetailTd style={{ textAlign: 'right' }}>
                                {t.outflow > 0 ? `$${t.outflow.toFixed(2)}` : '—'}
                              </DetailTd>
                              <DetailTd style={{ textAlign: 'right' }}>${net.toFixed(2)}</DetailTd>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <DetailFoot>
                          <DetailTd colSpan={3}>Subtotal ({rows.length})</DetailTd>
                          <DetailTd style={{ textAlign: 'right' }}>
                            ${rows.reduce((s, t) => s + t.inflow, 0).toFixed(2)}
                          </DetailTd>
                          <DetailTd style={{ textAlign: 'right' }}>
                            ${rows.reduce((s, t) => s + t.outflow, 0).toFixed(2)}
                          </DetailTd>
                          <DetailTd style={{ textAlign: 'right' }}>${sumNet.toFixed(2)}</DetailTd>
                        </DetailFoot>
                      </tfoot>
                    </DetailTable>
                  ) : (
                    <p style={{ margin: '0 14px 12px', fontSize: '0.85rem', color: '#888' }}>
                      No transactions in this category for the selected month (total may be carried
                      forward from adjustments).
                    </p>
                  )}
                </CategoryBlock>
              )
            })}
          </BreakdownSection>

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

          {(hasMonthBarData || hasHistoryChart) && (
            <ChartSection>
              {hasMonthBarData && (
                <ChartBlock>
                  <ChartTitle>This month by category</ChartTitle>
                  <MonthCategoryBarChart totals={currentTotals} categoryOrder={patternOrder} />
                </ChartBlock>
              )}
              {hasHistoryChart && (
                <ChartBlock>
                  <ChartTitle>Spending by category (last 12 months)</ChartTitle>
                  <Chart history={history} />
                </ChartBlock>
              )}
            </ChartSection>
          )}
        </>
      )}
    </Container>
  )
}
