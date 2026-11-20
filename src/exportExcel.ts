import ExcelJS from 'exceljs'
import { typeLabel, type Transaction } from './data'

export async function createMonthlyWorkbook(month: string, transactions: readonly Transaction[]) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(`Thu chi ${month}`, { views: [{ state: 'frozen', ySplit: 1 }] })
  sheet.columns = [
    { header: 'Ngày', width: 15, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Loại', width: 12 },
    { header: 'Danh mục', width: 22 },
    { header: 'Số tiền (VND)', width: 21, style: { numFmt: '#,##0" ₫"' } },
    { header: 'Ghi chú', width: 52, style: { alignment: { wrapText: true, vertical: 'top' } } },
  ]
  const header = sheet.getRow(1)
  header.height = 22
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF115E59' } }
  header.alignment = { vertical: 'middle' }

  for (const row of transactions) {
    sheet.addRow([new Date(row.date + 'T00:00:00Z'), typeLabel[row.type], row.category, row.amount, row.note])
  }
  if (transactions.length) sheet.autoFilter = `A1:E${sheet.rowCount}`
  return workbook.xlsx.writeBuffer()
}

export async function downloadMonthlyExcel(month: string, transactions: readonly Transaction[]) {
  const buffer = await createMonthlyWorkbook(month, transactions)
  const file = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = `so-chi-tieu-${month}.xlsx`
  document.body.append(link)
  try {
    link.click()
  } finally {
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }
}
