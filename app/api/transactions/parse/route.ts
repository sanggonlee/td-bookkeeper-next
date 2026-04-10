import { NextResponse } from 'next/server'
import { parseFiles } from '@/lib/parsers'
import { categorize } from '@/lib/categorize'
import { readPatterns, readSeen } from '@/lib/storage'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const month = parseInt(formData.get('month') as string, 10)
    const year = parseInt(formData.get('year') as string, 10)

    if (isNaN(month) || isNaN(year)) {
      return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 })
    }

    const files = formData.getAll('files') as File[]
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const transactions = await parseFiles(files, month, year)
    const patterns = await readPatterns()
    const seen = await readSeen()
    const categorized = categorize(transactions, patterns, seen)

    return NextResponse.json({ transactions: categorized, month, year })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to parse files' }, { status: 500 })
  }
}
