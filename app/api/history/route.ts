import { NextResponse } from 'next/server'
import { readAllHistory } from '@/lib/storage'

export async function GET() {
  const data = await readAllHistory()
  return NextResponse.json(data)
}
