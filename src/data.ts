import { createClient } from '@supabase/supabase-js'

export const categories = {
  expense: ['Ăn uống', 'Đi lại', 'Mua sắm', 'Nhà ở', 'Hóa đơn', 'Sức khỏe', 'Giải trí', 'Chi khác'],
  income: ['Lương', 'Thưởng', 'Thu khác'],
} as const

export type Kind = keyof typeof categories
export type Draft = { type: Kind; category: string; amount: number; date: string; note: string }
export type Transaction = Draft & { id: string; created_at: string }

export const maxAmount = 999_999_999_999
export const typeLabel = { expense: 'Chi', income: 'Thu' } as const
const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
export const money = (amount: number) => formatter.format(amount)
export const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })
export const dateLabel = (date: string) => date.split('-').reverse().join('/')

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key) : null

type Ledger = { transactions: Transaction[]; budget: number | null }
function requireSupabase() {
  if (!supabase) throw new Error('Chưa kết nối Supabase.')
  return supabase
}

function nextMonth(month: string) {
  const [year, number] = month.split('-').map(Number)
  return `${number === 12 ? year + 1 : year}-${String(number === 12 ? 1 : number + 1).padStart(2, '0')}-01`
}

export async function loadLedger(month: string): Promise<Ledger> {
  const client = requireSupabase()
  const start = month + '-01'
  async function transactionsForMonth() {
    const rows: Transaction[] = []
    const pageSize = 500
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client.from('transactions')
        .select('id, type, category, amount, date, note, created_at')
        .gte('date', start).lt('date', nextMonth(month))
        .order('date', { ascending: false }).order('created_at', { ascending: false })
        .order('id').range(offset, offset + pageSize - 1)
      if (error) throw error
      rows.push(...data)
      if (data.length < pageSize) return rows
    }
  }

  const [transactions, budget] = await Promise.all([
    transactionsForMonth(),
    client.from('budgets').select('amount').eq('month', start).maybeSingle(),
  ])
  if (budget.error) throw budget.error
  return { transactions, budget: budget.data?.amount ?? null }
}

export async function saveTransaction(draft: Draft, id?: string) {
  const client = requireSupabase()
  const { error } = id
    ? await client.from('transactions').update(draft).eq('id', id)
    : await client.from('transactions').insert(draft)
  if (error) throw error
}

export async function deleteTransaction(id: string) {
  const { error } = await requireSupabase().from('transactions').delete().eq('id', id)
  if (error) throw error
}

export async function saveBudget(month: string, amount: number) {
  const { error } = await requireSupabase().from('budgets').upsert({ month: month + '-01', amount }, { onConflict: 'user_id,month' })
  if (error) throw error
}
