import { NextResponse } from 'next/server'
import { readSeen, writeSeen } from '@/lib/storage'
import type { SeenFile } from '@/lib/types'

export async function GET() {
  const data = await readSeen()
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json() as SeenFile
  await writeSeen(body)
  return NextResponse.json({ ok: true })
}
