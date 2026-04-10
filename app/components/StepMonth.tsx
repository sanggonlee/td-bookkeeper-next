'use client'

import React, { useState } from 'react'
import styled from 'styled-components'
import type { CategorizedTransaction } from '@/lib/types'

interface StepMonthProps {
  files: File[]
  onNext: (transactions: CategorizedTransaction[], month: number, year: number) => void
  onBack: () => void
}

const Container = styled.div`
  max-width: 480px;
  margin: 0 auto;
  padding: 40px 24px;
`

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: #111;
`

const Subtitle = styled.p`
  color: #555;
  margin-bottom: 28px;
  font-size: 0.95rem;
`

const Row = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 500;
  color: #444;
  margin-bottom: 6px;
`

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  background: white;
  cursor: pointer;
  &:focus { outline: none; border-color: #0070f3; }
`

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  &:focus { outline: none; border-color: #0070f3; }
`

const ErrorMsg = styled.p`
  color: #e11d48;
  font-size: 0.875rem;
  margin-bottom: 12px;
`

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
`

const BackButton = styled.button`
  flex: 0 0 auto;
  padding: 12px 20px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  &:hover { background: #f9fafb; }
`

const AnalyzeButton = styled.button`
  flex: 1;
  padding: 12px;
  background: #0070f3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  &:disabled { background: #d1d5db; cursor: not-allowed; }
  &:not(:disabled):hover { background: #005fd1; }
`

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function StepMonth({ files, onNext, onBack }: StepMonthProps) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze() {
    setError(null)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.set('month', String(month))
      formData.set('year', String(year))
      for (const file of files) {
        formData.append('files', file)
      }
      const res = await fetch('/api/transactions/parse', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Failed to parse files')
      }
      const data = await res.json() as { transactions: CategorizedTransaction[] }
      onNext(data.transactions, month, year)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <Title>Step 2 — Select month</Title>
      <Subtitle>
        Choose the month and year to categorize. Only transactions from that
        period will be analyzed.
      </Subtitle>

      <Row>
        <Field>
          <Label htmlFor="month-select">Month</Label>
          <Select
            id="month-select"
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>{name}</option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="year-input">Year</Label>
          <Input
            id="year-input"
            type="number"
            value={year}
            min={2000}
            max={2100}
            onChange={e => setYear(Number(e.target.value))}
          />
        </Field>
      </Row>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <ButtonRow>
        <BackButton onClick={onBack} disabled={loading}>← Back</BackButton>
        <AnalyzeButton onClick={handleAnalyze} disabled={loading}>
          {loading ? 'Analyzing…' : 'Analyze →'}
        </AnalyzeButton>
      </ButtonRow>
    </Container>
  )
}
