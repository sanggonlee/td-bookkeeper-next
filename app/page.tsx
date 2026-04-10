'use client'

import React, { useState } from 'react'
import styled from 'styled-components'
import StepUpload from './components/StepUpload'
import StepMonth from './components/StepMonth'
import StepReview from './components/StepReview'
import StepResults from './components/StepResults'
import type { CategorizedTransaction } from '@/lib/types'

type Step = 1 | 2 | 3 | 4

const Shell = styled.div`
  min-height: 100vh;
  background: #f9fafb;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`

const Header = styled.header`
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
`

const Logo = styled.h1`
  font-size: 1.1rem;
  font-weight: 700;
  color: #111;
  margin: 0;
`

const StepIndicator = styled.div`
  display: flex;
  gap: 6px;
  margin-left: auto;
`

const StepDot = styled.div<{ $active: boolean; $done: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${p => (p.$done ? '#22c55e' : p.$active ? '#0070f3' : '#e5e7eb')};
  color: ${p => (p.$done || p.$active ? 'white' : '#9ca3af')};
`

const Main = styled.main`
  padding: 24px 0;
`

type WizardState = {
  step: Step
  files: File[]
  transactions: CategorizedTransaction[]
  month: number
  year: number
  resolutions: Record<string, string>
  rememberDescriptions: string[]
  saveAsPatterns: Record<string, string>
}

const INITIAL: WizardState = {
  step: 1,
  files: [],
  transactions: [],
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  resolutions: {},
  rememberDescriptions: [],
  saveAsPatterns: {},
}

export default function Home() {
  const [state, setState] = useState<WizardState>(INITIAL)

  function handleUploadNext(files: File[]) {
    setState(s => ({ ...s, files, step: 2 }))
  }

  function handleMonthNext(
    transactions: CategorizedTransaction[],
    month: number,
    year: number
  ) {
    const hasUnresolved = transactions.some(
      t => t.status === 'unknown' || t.status === 'ambiguous'
    )
    setState(s => ({
      ...s,
      transactions,
      month,
      year,
      step: hasUnresolved ? 3 : 4,
    }))
  }

  function handleReviewNext(
    resolutions: Record<string, string>,
    rememberDescriptions: string[],
    saveAsPatterns: Record<string, string>
  ) {
    setState(s => ({ ...s, resolutions, rememberDescriptions, saveAsPatterns, step: 4 }))
  }

  function handleStartOver() {
    setState(INITIAL)
  }

  const { step } = state

  return (
    <Shell>
      <Header>
        <Logo>J&S Bookkeeper</Logo>
        <StepIndicator>
          {([1, 2, 3, 4] as Step[]).map(n => (
            <StepDot key={n} $active={step === n} $done={step > n}>
              {step > n ? '✓' : n}
            </StepDot>
          ))}
        </StepIndicator>
      </Header>
      <Main>
        {step === 1 && <StepUpload onNext={handleUploadNext} />}
        {step === 2 && (
          <StepMonth
            files={state.files}
            onNext={handleMonthNext}
            onBack={() => setState(s => ({ ...s, step: 1 }))}
          />
        )}
        {step === 3 && (
          <StepReview
            transactions={state.transactions}
            onNext={handleReviewNext}
            onBack={() => setState(s => ({ ...s, step: 2 }))}
          />
        )}
        {step === 4 && (
          <StepResults
            transactions={state.transactions}
            resolutions={state.resolutions}
            rememberDescriptions={state.rememberDescriptions}
            saveAsPatterns={state.saveAsPatterns}
            month={state.month}
            year={state.year}
            onStartOver={handleStartOver}
          />
        )}
      </Main>
    </Shell>
  )
}
