import { NextResponse } from 'next/server'
import { readTransactionArchive } from '@/lib/storage'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ yearMonth: string }> }
) {
  const { yearMonth } = await params
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return NextResponse.json({ error: 'Invalid year-month format' }, { status: 400 })
  }
  const entries = await readTransactionArchive(yearMonth)
  return NextResponse.json(entries)
}
