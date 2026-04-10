import * as XLSX from 'xlsx'

export function xlsToRows(buffer: Buffer): string[][] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false })

  return raw
    .map(row => {
      if (!Array.isArray(row)) return []
      const cells = row.map(c => (c == null ? '' : String(c)))
      // Trim trailing empty cells so column-count detection stays accurate
      let end = cells.length
      while (end > 0 && !cells[end - 1].trim()) end--
      return cells.slice(0, end)
    })
    .filter(row => row.length > 0) // drop fully empty rows
}
