'use client'

import React, { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import Chart from './Chart'
import MonthCategoryBarChart from './MonthCategoryBarChart'
import type { HistoryFile, TransactionArchiveEntry } from '@/lib/types'

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

const MonthPickerSection = styled.div`
  margin-bottom: 24px;
`

const MonthPickerLabel = styled.p`
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 10px;
`

const MonthChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const MonthChip = styled.button<{ $active: boolean }>`
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid ${p => (p.$active ? '#0070f3' : '#d1d5db')};
  background: ${p => (p.$active ? '#eff6ff' : 'white')};
  color: ${p => (p.$active ? '#0070f3' : '#374151')};
  font-size: 0.85rem;
  font-weight: ${p => (p.$active ? '600' : '400')};
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  &:hover {
    border-color: #0070f3;
    color: #0070f3;
    background: #eff6ff;
  }
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

const MonthDetailSection = styled.section`
  margin-top: 8px;
`

const MonthDetailTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: #111;
  margin: 0 0 16px;
`

const NetBalancePanel = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px 28px;
  align-items: baseline;
  padding: 16px 18px;
  margin-bottom: 20px;
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

const SummaryTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  margin-bottom: 20px;
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

const BreakdownSection = styled.section`
  margin-bottom: 24px;
`

const BreakdownTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #111;
  margin: 0 0 10px;
`

const CategoryBlock = styled.details`
  margin-bottom: 6px;
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
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
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
  margin-right: auto;
  min-width: 0;
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
  font-size: 0.82rem;
`

const DetailTh = styled.th`
  text-align: left;
  padding: 7px 12px;
  color: #64748b;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 500;
  background: #fafafa;
`

const DetailTd = styled.td`
  padding: 7px 12px;
  border-bottom: 1px solid #f3f4f6;
  color: #333;
  vertical-align: top;
`

const DetailFoot = styled.tr`
  font-weight: 600;
  background: #f9fafb;
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
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<TransactionArchiveEntry[]>([])
  const [txLoading, setTxLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/history')
      if (!res.ok) throw new Error('Failed to load history')
      const data = (await res.json()) as Record<string, HistoryFile>
      setHistory(data)
      const months = Object.keys(data).sort()
      if (months.length > 0) {
        setSelectedMonth(months[months.length - 1])
      }
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

  useEffect(() => {
    if (!selectedMonth) {
      setTransactions([])
      return
    }
    setTxLoading(true)
    fetch(`/api/transactions/${selectedMonth}`)
      .then(r => r.json())
      .then((data: TransactionArchiveEntry[]) => setTransactions(data))
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false))
  }, [selectedMonth])

  if (!open) return null

  const months = Object.keys(history).sort()
  const hasData = months.length > 0

  const selectedTotals = selectedMonth ? (history[selectedMonth] ?? {}) : {}
  const categoryRows = Object.entries(selectedTotals).filter(([k]) => k !== 'Total')

  const txByCategory = new Map<string, TransactionArchiveEntry[]>()
  for (const tx of transactions) {
    const list = txByCategory.get(tx.category)
    if (list) list.push(tx)
    else txByCategory.set(tx.category, [tx])
  }

  const allCategories = Array.from(
    new Set([...categoryRows.map(([k]) => k), ...txByCategory.keys()])
  )

  const totalInflow = transactions.reduce((s, t) => s + t.inflow, 0)
  const totalOutflow = transactions.reduce((s, t) => s + t.outflow, 0)
  const netBalance = totalInflow - totalOutflow

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
          <Title id="historical-reports-title">Saved reports</Title>
          <CloseBtn type="button" onClick={onClose}>
            Close
          </CloseBtn>
        </Header>
        <Subtitle>
          Select a month to view detailed spending and transactions.
        </Subtitle>

        {loading && <StatusMsg>Loading…</StatusMsg>}
        {error && <ErrorMsg>{error}</ErrorMsg>}

        {!loading && !error && !hasData && (
          <StatusMsg>No saved reports yet. Complete a month through Step 4 to store history here.</StatusMsg>
        )}

        {!loading && hasData && (
          <>
            <MonthPickerSection>
              <MonthPickerLabel>Select month</MonthPickerLabel>
              <MonthChips>
                {months.map(ym => (
                  <MonthChip
                    key={ym}
                    type="button"
                    $active={selectedMonth === ym}
                    onClick={() => setSelectedMonth(ym)}
                  >
                    {formatYearMonth(ym)}
                  </MonthChip>
                ))}
              </MonthChips>
            </MonthPickerSection>

            <ChartSection>
              <ChartTitle>Spending by category (last 12 months)</ChartTitle>
              <Chart history={history} />
            </ChartSection>

            {selectedMonth && (
              <MonthDetailSection>
                <MonthDetailTitle>{formatYearMonth(selectedMonth)}</MonthDetailTitle>

                <SummaryTable>
                  <thead>
                    <tr>
                      <Th>Category</Th>
                      <Th style={{ textAlign: 'right' }}>Net spending</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryRows.map(([cat, val]) => (
                      <tr key={cat}>
                        <Td>{cat}</Td>
                        <Td style={{ textAlign: 'right' }}>${val.toFixed(2)}</Td>
                      </tr>
                    ))}
                    <TotalRow>
                      <Td>Total</Td>
                      <Td style={{ textAlign: 'right' }}>
                        ${(selectedTotals['Total'] ?? 0).toFixed(2)}
                      </Td>
                    </TotalRow>
                  </tbody>
                </SummaryTable>

                {transactions.length > 0 && (
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
                      <NetBalanceValue
                        style={{
                          color:
                            netBalance > 0
                              ? '#15803d'
                              : netBalance < 0
                              ? '#b91c1c'
                              : '#0f172a',
                        }}
                      >
                        {netBalance >= 0 ? '' : '−'}${Math.abs(netBalance).toFixed(2)}
                      </NetBalanceValue>
                    </NetBalanceStat>
                  </NetBalancePanel>
                )}

                {Object.keys(selectedTotals).some(
                  k => k !== 'Total' && (selectedTotals[k] ?? 0) !== 0
                ) && (
                  <ChartSection style={{ margin: '0 0 24px' }}>
                    <ChartTitle>This month by category</ChartTitle>
                    <MonthCategoryBarChart totals={selectedTotals} categoryOrder={[]} />
                  </ChartSection>
                )}

                {txLoading && <StatusMsg>Loading transactions…</StatusMsg>}

                {!txLoading && allCategories.length > 0 && (
                  <BreakdownSection>
                    <BreakdownTitle>Transaction breakdown by category</BreakdownTitle>
                    {allCategories.map(cat => {
                      const rows = (txByCategory.get(cat) ?? []).slice().sort(
                        (a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description)
                      )
                      const savedNet = selectedTotals[cat] ?? 0
                      return (
                        <CategoryBlock key={cat}>
                          <CategorySummary>
                            <CategorySummaryLabel>{cat}</CategorySummaryLabel>
                            <CategorySummaryMeta>
                              {rows.length} line{rows.length === 1 ? '' : 's'} · Net{' '}
                              <strong style={{ color: '#111' }}>${savedNet.toFixed(2)}</strong>
                            </CategorySummaryMeta>
                          </CategorySummary>
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
                                      <DetailTd
                                        style={{
                                          textTransform: 'uppercase',
                                          fontSize: '0.78rem',
                                        }}
                                      >
                                        {t.source}
                                      </DetailTd>
                                      <DetailTd style={{ textAlign: 'right' }}>
                                        {t.inflow > 0 ? `$${t.inflow.toFixed(2)}` : '—'}
                                      </DetailTd>
                                      <DetailTd style={{ textAlign: 'right' }}>
                                        {t.outflow > 0 ? `$${t.outflow.toFixed(2)}` : '—'}
                                      </DetailTd>
                                      <DetailTd style={{ textAlign: 'right' }}>
                                        ${net.toFixed(2)}
                                      </DetailTd>
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
                                  <DetailTd style={{ textAlign: 'right' }}>
                                    ${rows.reduce((s, t) => s + t.outflow - t.inflow, 0).toFixed(2)}
                                  </DetailTd>
                                </DetailFoot>
                              </tfoot>
                            </DetailTable>
                          ) : (
                            <p
                              style={{
                                margin: '0 14px 12px',
                                fontSize: '0.85rem',
                                color: '#888',
                              }}
                            >
                              No individual transactions recorded for this category.
                            </p>
                          )}
                        </CategoryBlock>
                      )
                    })}
                  </BreakdownSection>
                )}
              </MonthDetailSection>
            )}

            {!selectedMonth && (
              <>
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
          </>
        )}
      </Panel>
    </Overlay>
  )
}
