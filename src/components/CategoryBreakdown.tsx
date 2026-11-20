import { Pencil } from 'lucide-react'
import { Button } from './ui/button'
import { categories, money, type CategoryBudgets, type ExpenseCategory, type Transaction } from '../data'

export function CategoryBreakdown({ transactions, total, budgets, onFilter, onEdit }: {
  transactions: readonly Transaction[]
  total: number
  budgets: CategoryBudgets | null
  onFilter: (category: ExpenseCategory) => void
  onEdit?: (category: ExpenseCategory) => void
}) {
  const spent = new Map<string, number>()
  for (const row of transactions) {
    if (row.type === 'expense') spent.set(row.category, (spent.get(row.category) ?? 0) + row.amount)
  }
  const breakdown = categories.expense.map(category => ({
    category,
    amount: spent.get(category) ?? 0,
    limit: budgets?.[category],
  })).sort((a, b) => b.amount - a.amount)

  return <section className="panel mt-6 p-4 sm:p-6" aria-labelledby="category-heading">
    <h2 id="category-heading" className="text-xl font-bold tracking-tight">Chi tiêu theo danh mục</h2>
    <p className="mt-1 text-sm text-slate-600">Chọn danh mục để xem các giao dịch trong tháng.</p>
    {budgets === null && <p className="mt-3 text-sm text-amber-900">Cần cập nhật cơ sở dữ liệu để đặt hạn mức theo danh mục.</p>}
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {breakdown.map(({ category, amount, limit }) => {
        const share = total ? amount / total * 100 : 0
        const exceeded = limit !== undefined && amount > limit
        return <li key={category} className="min-w-0 rounded-xl border border-slate-200 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <button type="button" className="rounded text-left font-semibold text-teal-800 hover:underline focus-visible:outline-2"
              onClick={() => onFilter(category)}>{category}</button>
            <span className="text-right text-sm font-bold text-orange-800 tabular-nums">{money(amount)}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div className="h-full rounded-full bg-teal-600" style={{ width: `${share}%` }} />
          </div>
          <p className="mt-1 text-sm text-slate-600">{share.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% tổng chi</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="text-sm text-slate-600">
              {limit === undefined ? 'Chưa đặt hạn mức' : <>
                <span>Hạn mức {money(limit)}</span>
                <strong className={`block ${exceeded ? 'text-red-700' : 'text-teal-800'}`}>
                  {exceeded ? 'Vượt' : 'Còn lại'} {money(Math.abs(limit - amount))}
                </strong>
              </>}
            </div>
            {onEdit && budgets !== null && <Button variant="ghost" className="min-h-8 px-2 py-1"
              aria-label={`${limit === undefined ? 'Đặt' : 'Sửa'} hạn mức ${category}`} onClick={() => onEdit(category)}>
              <Pencil size={14} /> {limit === undefined ? 'Đặt hạn mức' : 'Sửa hạn mức'}
            </Button>}
          </div>
        </li>
      })}
    </ul>
  </section>
}
