'use client'

import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import type { CategorizedTransaction, PatternEntry } from '@/lib/types'

interface StepReviewProps {
  transactions: CategorizedTransaction[]
  onNext: (
    resolutions: Record<string, string>,
    rememberDescriptions: string[],
    saveAsPatterns: Record<string, string>
  ) => void
  onBack: () => void
}

// --- Styled ---

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

const Progress = styled.p`
  color: #555;
  font-size: 0.9rem;
  margin-bottom: 24px;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
`

const Th = styled.th`
  text-align: left;
  padding: 10px 12px;
  color: #555;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 500;
  white-space: nowrap;
`

const Td = styled.td<{ $firstInGroup?: boolean; $ambiguous?: boolean }>`
  padding: 8px 12px;
  color: #333;
  border-bottom: 1px solid #f3f4f6;
  border-top: ${p => (p.$firstInGroup ? '2px solid #e5e7eb' : 'none')};
  background: ${p => (p.$ambiguous ? '#fffbeb' : 'transparent')};
  vertical-align: middle;
`

const DescCell = styled(Td)`
  font-weight: 500;
  color: #111;
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const SourceBadge = styled.span<{ $source: string }>`
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${p =>
    p.$source === 'td' ? '#dbeafe' :
    p.$source === 'amex' ? '#fef3c7' :
    p.$source === 'scotia' ? '#dcfce7' : '#f3f4f6'};
  color: ${p =>
    p.$source === 'td' ? '#1e40af' :
    p.$source === 'amex' ? '#92400e' :
    p.$source === 'scotia' ? '#166534' : '#374151'};
`

const AmbiguousDot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f59e0b;
  margin-right: 6px;
  flex-shrink: 0;
  vertical-align: middle;
`

const CategorySelect = styled.select<{ $unset: boolean }>`
  width: 100%;
  min-width: 140px;
  padding: 5px 8px;
  border: 1px solid ${p => (p.$unset ? '#fbbf24' : '#d1d5db')};
  border-radius: 6px;
  font-size: 0.85rem;
  background: white;
  cursor: pointer;
  &:focus { outline: none; border-color: #0070f3; }
`

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`

const BackButton = styled.button`
  flex: 0 0 auto;
  padding: 10px 20px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
  &:hover { background: #f9fafb; }
`

const ConfirmButton = styled.button`
  flex: 1;
  padding: 10px;
  background: #0070f3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  &:disabled { background: #d1d5db; cursor: not-allowed; }
  &:not(:disabled):hover { background: #005fd1; }
`

// --- Helpers ---

function fmt(n: number) {
  return n === 0 ? '—' : `$${n.toFixed(2)}`
}

type Group = {
  description: string
  items: CategorizedTransaction[]
  candidates: string[] // ambiguous matches, if any
}

// --- Component ---

export default function StepReview({ transactions, onNext, onBack }: StepReviewProps) {
  const [allCategories, setAllCategories] = useState<string[]>([])

  // Load all category labels from patterns.json
  useEffect(() => {
    fetch('/api/patterns')
      .then(r => r.json())
      .then((data: PatternEntry[]) => setAllCategories(data.map(e => e.label)))
      .catch(() => {})
  }, [])

  const needsReview = useMemo(
    () => transactions.filter(t => t.status === 'unknown' || t.status === 'ambiguous'),
    [transactions]
  )

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const t of needsReview) {
      const existing = map.get(t.description)
      if (existing) {
        existing.items.push(t)
      } else {
        map.set(t.description, {
          description: t.description,
          items: [t],
          candidates: t.candidates ?? [],
        })
      }
    }
    return Array.from(map.values())
  }, [needsReview])

  // Map: description -> chosen category
  const [resolutions, setResolutions] = useState<Record<string, string>>(() =>
    Object.fromEntries(groups.map(g => [g.description, g.candidates[0] ?? '']))
  )

  const resolvedCount = Object.values(resolutions).filter(v => v.trim()).length
  const allResolved = resolvedCount === groups.length

  function setCategory(desc: string, cat: string) {
    setResolutions(prev => ({ ...prev, [desc]: cat }))
  }

  function handleConfirm() {
    // Always remember and save as pattern for every resolution
    const rememberDescriptions = Object.keys(resolutions)
    const saveAsPatterns = Object.fromEntries(
      Object.entries(resolutions).map(([desc, cat]) => [desc, cat])
    )
    onNext(resolutions, rememberDescriptions, saveAsPatterns)
  }

  if (groups.length === 0) return null

  // Flatten groups into table rows, tracking first-row-of-group for rowspan
  type FlatRow = {
    group: Group
    item: CategorizedTransaction
    isFirst: boolean
    rowSpan: number
  }

  const rows: FlatRow[] = []
  for (const group of groups) {
    group.items.forEach((item, i) => {
      rows.push({ group, item, isFirst: i === 0, rowSpan: group.items.length })
    })
  }

  // Merge allCategories with any candidates not already in the list
  const categoriesForGroup = (g: Group): string[] => {
    const extra = g.candidates.filter(c => !allCategories.includes(c))
    return [...allCategories, ...extra]
  }

  return (
    <Container>
      <Title>Step 3 — Categorize new transactions</Title>
      <Progress>
        {resolvedCount} of {groups.length} description{groups.length !== 1 ? 's' : ''} resolved
      </Progress>

      <Table>
        <thead>
          <tr>
            <Th>Description</Th>
            <Th>Date</Th>
            <Th>Source</Th>
            <Th>Inflow</Th>
            <Th>Outflow</Th>
            <Th>Category</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ group, item, isFirst, rowSpan }, i) => {
            const isAmbiguous = group.items.some(t => t.status === 'ambiguous')
            const chosen = resolutions[group.description] ?? ''
            return (
              <tr key={i}>
                <DescCell $firstInGroup={isFirst} $ambiguous={isAmbiguous} title={group.description}>
                  {isAmbiguous && <AmbiguousDot title="Multiple pattern matches" />}
                  {group.description}
                </DescCell>
                <Td $firstInGroup={isFirst}>{item.date}</Td>
                <Td $firstInGroup={isFirst}>
                  <SourceBadge $source={item.source}>{item.source.toUpperCase()}</SourceBadge>
                </Td>
                <Td $firstInGroup={isFirst}>{fmt(item.inflow)}</Td>
                <Td $firstInGroup={isFirst}>{fmt(item.outflow)}</Td>

                {isFirst && (
                  <Td $firstInGroup rowSpan={rowSpan} style={{ minWidth: 160 }}>
                    <CategorySelect
                      $unset={!chosen}
                      value={chosen}
                      onChange={e => setCategory(group.description, e.target.value)}
                    >
                      <option value="">— select —</option>
                      {categoriesForGroup(group).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </CategorySelect>
                  </Td>
                )}
              </tr>
            )
          })}
        </tbody>
      </Table>

      <ButtonRow>
        <BackButton onClick={onBack}>← Back</BackButton>
        <ConfirmButton disabled={!allResolved} onClick={handleConfirm}>
          Confirm all →
        </ConfirmButton>
      </ButtonRow>
    </Container>
  )
}
