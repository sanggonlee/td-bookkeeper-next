import { NextResponse } from 'next/server'
import { readPatterns, writePatterns } from '@/lib/storage'
import type { PatternsFile } from '@/lib/types'

export async function GET() {
  const data = await readPatterns()
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json() as PatternsFile
  await writePatterns(body)
  return NextResponse.json({ ok: true })
}
