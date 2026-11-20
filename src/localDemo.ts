import { today, type CategoryBudgets, type Transaction } from './data'

export async function loadLocalDemo(month: string) {
  const date = today()
  const earlierDate = `${month}-${String(Math.max(1, Number(date.slice(-2)) - 1)).padStart(2, '0')}`
  const created_at = date + 'T00:00:00Z'
  const transactions: Transaction[] = month === date.slice(0, 7) ? [
    { id: 'demo-coffee', type: 'expense', category: 'Ăn uống', amount: 35000, date, note: 'Cà phê sáng', created_at },
    { id: 'demo-travel', type: 'expense', category: 'Đi lại', amount: 120000, date, note: 'Đổ xăng', created_at },
    { id: 'demo-lunch', type: 'expense', category: 'Ăn uống', amount: 85000, date: earlierDate, note: 'Ăn trưa', created_at },
    { id: 'demo-income', type: 'income', category: 'Lương', amount: 8500000, date: month + '-01', note: 'Lương tháng', created_at },
  ] : []
  const categoryBudgets: CategoryBudgets = transactions.length ? { 'Ăn uống': 1000000, 'Đi lại': 100000 } : {}
  return { transactions, budget: transactions.length ? 4000000 : null, categoryBudgets }
}
