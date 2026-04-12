import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, computeToken } from '@/lib/auth'

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  // No maxAge → session cookie, cleared when browser closes
}

export async function POST(request: Request) {
  const { code } = await request.json() as { code?: string }

  const expected = process.env.ACCESS_CODE
  if (!expected) {
    return NextResponse.json(
      { error: 'ACCESS_CODE is not configured on the server' },
      { status: 500 }
    )
  }

  if (!code || code !== expected) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
  }

  const token = await computeToken(code)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, COOKIE_OPTS)
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  return NextResponse.json({ ok: true })
}
