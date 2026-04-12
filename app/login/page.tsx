'use client'

import React, { Suspense, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styled, { keyframes } from 'styled-components'

// --- Styled ---

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`

const Card = styled.div`
  width: 100%;
  max-width: 360px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 40px 32px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
`

const Logo = styled.h1`
  font-size: 1.1rem;
  font-weight: 700;
  color: #111;
  margin: 0 0 4px;
`

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: #888;
  margin: 0 0 28px;
`

const Label = styled.label`
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: #555;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
`

const CodeInput = styled.input<{ $error: boolean }>`
  width: 100%;
  padding: 11px 14px;
  border: 1.5px solid ${p => (p.$error ? '#e11d48' : '#d1d5db')};
  border-radius: 8px;
  font-size: 1.1rem;
  letter-spacing: 0.15em;
  background: white;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;
  animation: ${p => (p.$error ? shake : 'none')} 0.35s ease;

  &:focus {
    border-color: ${p => (p.$error ? '#e11d48' : '#0070f3')};
  }
`

const ErrorMsg = styled.p`
  font-size: 0.8rem;
  color: #e11d48;
  margin: 6px 0 0;
  min-height: 18px;
`

const SubmitButton = styled.button`
  margin-top: 20px;
  width: 100%;
  padding: 12px;
  background: #0070f3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;

  &:disabled {
    background: #d1d5db;
    cursor: not-allowed;
  }
  &:not(:disabled):hover {
    background: #005fd1;
  }
`

// --- Component ---

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      if (res.ok) {
        const from = searchParams.get('from') ?? '/'
        router.push(from)
      } else {
        setError('Incorrect code. Try again.')
        setCode('')
        setShake(true)
        setTimeout(() => setShake(false), 400)
        inputRef.current?.focus()
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page>
      <Card>
        <Logo>TD Bookkeeper</Logo>
        <Subtitle>Enter your access code to continue</Subtitle>

        <form onSubmit={handleSubmit}>
          <Label htmlFor="code-input">Access code</Label>
          <CodeInput
            id="code-input"
            ref={inputRef}
            type="password"
            value={code}
            $error={shake}
            autoComplete="current-password"
            autoFocus
            onChange={e => {
              setCode(e.target.value)
              setError('')
            }}
          />
          <ErrorMsg>{error}</ErrorMsg>

          <SubmitButton type="submit" disabled={!code || loading}>
            {loading ? 'Checking…' : 'Enter'}
          </SubmitButton>
        </form>
      </Card>
    </Page>
  )
}
