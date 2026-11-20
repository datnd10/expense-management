import { Fragment, useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Copy, Download, List, LogOut, Pencil, Plus, ReceiptText, Trash2, Wallet } from 'lucide-react'
import { CategoryBreakdown } from './components/CategoryBreakdown'
import { Editor, type EditorState } from './components/Editor'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { categories, dateLabel, deleteTransaction, loadLedger, money, saveBudget, saveCategoryBudget, saveTransaction, supabase, today, type Kind } from './data'

const allCategories = [...categories.expense, ...categories.income]

function Brand() {
  return <div className="flex items-center gap-3">
    <div className="grid size-10 place-items-center rounded-xl bg-teal-800 text-white"><Wallet size={21} /></div>
    <div className="text-lg font-extrabold tracking-tight">Sổ chi tiêu</div>
  </div>
}

function Login() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy) return
    const fields = new FormData(event.currentTarget)
    const email = String(fields.get('email')).trim()
    const password = String(fields.get('password'))
    setBusy(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (reason) {
      setError(reason instanceof Error && reason.message === 'Invalid login credentials'
        ? 'Email hoặc mật khẩu chưa đúng.'
        : 'Không thể hoàn tất yêu cầu. Kiểm tra kết nối và thông tin đã nhập rồi thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="grid min-h-dvh place-items-center px-4 py-10">
    <section className="panel w-full max-w-md p-6 sm:p-9">
      <Brand />
      <h1 className="mt-8 text-2xl font-extrabold tracking-tight">Đăng nhập</h1>
      <p className="mt-1 text-slate-600">Xem và cập nhật sổ thu chi trên các thiết bị của bạn.</p>
      {!supabase && <p role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        Chưa kết nối Supabase. Kiểm tra URL và Publishable Key trong cấu hình dự án, rồi chạy lại bản build hoặc khởi động lại máy chủ phát triển.
      </p>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <fieldset disabled={!supabase || busy} className="space-y-4 disabled:opacity-60">
        <label className="field">Email<input type="email" name="email" autoComplete="email" required /></label>
        <label className="field">Mật khẩu
          <input type="password" name="password" autoComplete="current-password" required />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button type="submit" className="w-full">
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
        </fieldset>
      </form>
    </section>
  </main>
}

function Dashboard({ session }: { session: Session | null }) {
  const [month, setMonth] = useState(() => today().slice(0, 7))
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [type, setType] = useState<Kind | ''>('')
  const [category, setCategory] = useState('')
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [version, setVersion] = useState(0)
  const [snapshot, setSnapshot] = useState<{ key: string; data?: Awaited<ReturnType<typeof loadLedger>> }>({ key: '' })
  const [signOutError, setSignOutError] = useState(false)
  const loadKey = month + ':' + version
  const current = snapshot.key === loadKey ? snapshot : undefined
  const rows = current?.data?.transactions ?? []
  const budget = current?.data?.budget ?? null
  const income = rows.reduce((sum, row) => sum + (row.type === 'income' ? row.amount : 0), 0)
  const expense = rows.reduce((sum, row) => sum + (row.type === 'expense' ? row.amount : 0), 0)
  const now = today()
  const dailyExpense = rows.reduce((sum, row) => sum + (row.type === 'expense' && row.date === now ? row.amount : 0), 0)
  const visibleRows = rows.filter(row => (!type || row.type === type) && (!category || row.category === category))
  const percent = budget === null ? 0 : budget === 0 ? (expense > 0 ? 100 : 0) : Math.min(100, expense / budget * 100)
  const exceeded = budget !== null && expense > budget

  async function exportMonth() {
    if (!current?.data || exporting) return
    setExporting(true)
    setExportError('')
    try {
      const { downloadMonthlyExcel } = await import('./exportExcel')
      await downloadMonthlyExcel(month, rows)
    } catch {
      setExportError('Không thể xuất Excel. Vui lòng thử lại.')
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    let active = true
    const ledger = import.meta.env.DEV && !session
      ? import('./localDemo').then(({ loadLocalDemo }) => loadLocalDemo(month))
      : loadLedger(month)
    ledger.then(
      data => { if (active) setSnapshot({ key: loadKey, data }) },
      () => { if (active) setSnapshot({ key: loadKey }) },
    )
    return () => { active = false }
  }, [loadKey, month, session])

  useEffect(() => {
    function refreshOnReturn() {
      if (document.visibilityState === 'visible') setVersion(value => value + 1)
    }
    document.addEventListener('visibilitychange', refreshOnReturn)
    return () => document.removeEventListener('visibilitychange', refreshOnReturn)
  }, [])

  const refresh = () => setVersion(value => value + 1)
  const add = () => setEditor({ mode: 'transaction' })

  return <>
    <header className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <Brand />
        {session && <div className="flex min-w-0 items-center gap-2">
          <span className="hidden max-w-64 truncate text-sm text-slate-600 sm:block">{session.user.email}</span>
          <Button variant="ghost" onClick={async () => {
            setSignOutError(false)
            try {
              const result = await supabase?.auth.signOut()
              if (result?.error) setSignOutError(true)
            } catch { setSignOutError(true) }
          }}><LogOut size={16} /> Đăng xuất</Button>
        </div>}
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-4 pt-7 pb-24 sm:px-8 sm:pt-10 sm:pb-12">
      {!session && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">Dữ liệu mẫu trên localhost. Bạn có thể lọc và xuất Excel.</p>}
      {signOutError && <p role="alert" className="mb-4 text-sm text-red-700">Không thể đăng xuất. Vui lòng thử lại.</p>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Tổng quan</h1>
          <p className="mt-1.5 text-slate-600">Theo dõi thu chi và ngân sách theo tháng.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="month-control">
            <CalendarDays size={17} className="pointer-events-none shrink-0 text-teal-800" />
            <span className="sr-only">Tháng báo cáo</span>
            <input type="month" min="1900-01" max="9999-12" value={month}
              onChange={event => { if (/^\d{4}-\d{2}$/.test(event.target.value)) setMonth(event.target.value) }} />
          </label>
          {session && <Button onClick={add} className="fixed right-4 bottom-5 z-30 min-h-12 shadow-lg sm:static sm:min-h-10 sm:shadow-none"><Plus size={18} /> Thêm giao dịch</Button>}
        </div>
      </div>

      <section aria-label="Tóm tắt thu chi" className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: 'Tổng thu', value: income, icon: ArrowDownLeft, tone: 'bg-emerald-100 text-emerald-800', amountColor: 'text-emerald-800' },
          { label: 'Tổng chi', value: expense, icon: ArrowUpRight, tone: 'bg-orange-100 text-orange-800', amountColor: 'text-orange-800' },
          { label: 'Thu trừ chi', value: income - expense, icon: Wallet, tone: 'bg-teal-100 text-teal-800', amountColor: income < expense ? 'text-red-700' : 'text-teal-800' },
          { label: 'Chi hôm nay', value: month === now.slice(0, 7) ? dailyExpense : null, icon: CalendarDays, tone: 'bg-indigo-100 text-indigo-800', amountColor: 'text-indigo-800' },
        ].map(({ label, value, icon: Icon, tone, amountColor }) => (
          <Card key={label} className="block min-w-0 p-3.5 sm:p-5">
            <span className={`grid size-9 place-items-center rounded-xl ${tone}`}><Icon size={18} /></span>
            <p className="mt-3 text-sm font-medium text-slate-600">{label}</p>
            <p className={`mt-1 break-words text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl ${current?.data && value !== null ? amountColor : 'text-slate-500'}`}>
              {current?.data && value !== null ? money(value) : '—'}
            </p>
          </Card>
        ))}
      </section>

      <section className="panel mt-4 p-4 sm:p-6" aria-labelledby="budget-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="budget-heading" className="text-lg font-bold tracking-tight">Ngân sách tháng</h2>
            <p className="mt-1 text-sm text-slate-600">{!current?.data ? '—'
              : budget === null ? 'Chưa đặt hạn mức chi tiêu cho tháng này.'
              : <>{exceeded ? 'Vượt ngân sách' : 'Còn lại'}{' '}
                <strong className={`font-extrabold tabular-nums ${exceeded ? 'text-red-700' : 'text-teal-800'}`}>
                  {money(Math.abs(budget - expense))}
                </strong>
              </>}</p>
          </div>
          {session && <Button variant="outline" disabled={!current?.data} onClick={() => setEditor({ mode: 'budget' })}>
            <Pencil size={15} /> {budget === null ? 'Đặt ngân sách' : 'Sửa ngân sách'}
          </Button>}
        </div>
        {budget !== null && <div className="mt-4">
          <div role="progressbar" aria-label="Ngân sách đã sử dụng" aria-valuenow={Math.round(percent)}
            aria-valuetext={`${money(expense)} trên ${money(budget)}`} className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${exceeded ? 'bg-red-600' : 'bg-teal-600'}`} style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-slate-600">
            <span>Đã chi <strong className={`font-bold tabular-nums ${exceeded ? 'text-red-700' : 'text-orange-800'}`}>{money(expense)}</strong></span>
            <span>Hạn mức <strong className="font-bold text-teal-800 tabular-nums">{money(budget)}</strong></span>
          </div>
        </div>}
      </section>

      {current?.data && <CategoryBreakdown transactions={rows} total={expense} budgets={current.data.categoryBudgets}
        onFilter={selected => {
          setType('expense')
          setCategory(selected)
          document.getElementById('history-heading')?.focus()
        }}
        onEdit={session ? category => setEditor({ mode: 'categoryBudget', category }) : undefined} />}

      <section className="panel mt-6" aria-labelledby="history-heading">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6">
          <div>
            <h2 id="history-heading" tabIndex={-1} className="flex items-center gap-2 text-xl font-bold tracking-tight"><List size={19} className="text-teal-800" /> Lịch sử giao dịch</h2>
            {current?.data && <p className="mt-1 text-sm text-slate-600">{visibleRows.length} giao dịch</p>}
            {exportError && <p role="alert" className="mt-1 text-sm text-red-700">{exportError}</p>}
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-[auto_auto_auto]">
            <Button variant="outline" className="col-span-2 sm:col-span-1" disabled={!current?.data || exporting}
              onClick={() => void exportMonth()}>
              <Download size={16} /> {exporting ? 'Đang xuất…' : 'Xuất Excel tháng'}
            </Button>
            <select className="control" aria-label="Lọc theo loại" value={type} onChange={event => {
              setType(event.target.value as Kind | '')
              setCategory('')
            }}>
              <option value="">Tất cả loại</option><option value="expense">Khoản chi</option><option value="income">Khoản thu</option>
            </select>
            <select className="control" aria-label="Lọc theo danh mục" value={category} onChange={event => setCategory(event.target.value)}>
              <option value="">Tất cả danh mục</option>
              {(type ? categories[type] : allCategories).map(item => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>
        {!current ? <p className="border-t border-slate-100 px-4 py-10 text-center text-slate-600" role="status">Đang tải giao dịch…</p>
          : !current.data ? <div className="border-t border-slate-100 px-4 py-8 text-center">
            <p className="mb-3 text-red-700" role="alert">Không tải được dữ liệu.</p>
            <Button variant="outline" onClick={refresh}>Thử lại</Button>
          </div>
          : visibleRows.length === 0 ? <div className="grid justify-items-center border-t border-slate-100 px-4 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-800"><ReceiptText size={24} /></span>
            <p className="mt-3 font-bold">{rows.length ? 'Không có kết quả phù hợp' : 'Chưa có giao dịch trong tháng này'}</p>
            {rows.length ? <Button className="mt-2" variant="ghost" onClick={() => { setCategory(''); setType('') }}>Xóa bộ lọc</Button>
              : session && <Button className="mt-3" variant="outline" onClick={add}><Plus size={16} /> Thêm giao dịch</Button>}
          </div>
          : <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {visibleRows.map((row, index) => {
              const isIncome = row.type === 'income'
              const Icon = isIncome ? ArrowDownLeft : ArrowUpRight
              return <Fragment key={row.id}>
                {row.date !== visibleRows[index - 1]?.date && <li className="border-t border-slate-200 bg-slate-50 px-3.5 py-2 sm:px-6">
                  <h3 className="flex items-center gap-2 text-sm font-semibold tabular-nums text-slate-700">
                    <CalendarDays size={15} aria-hidden="true" />
                    <time dateTime={row.date}>{dateLabel(row.date)}</time>
                  </h3>
                </li>}
                <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-3.5 sm:flex-nowrap sm:px-6">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${isIncome ? 'bg-emerald-50 text-emerald-800' : 'bg-orange-50 text-orange-800'}`}><Icon size={18} /></span>
                  <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-auto">
                    <div className="font-semibold">{row.category}</div>
                    <div className="break-words text-sm text-slate-600">{dateLabel(row.date)}{row.note ? ` · ${row.note}` : ''}</div>
                  </div>
                  <div className={`ml-12 min-w-0 flex-1 break-words text-sm font-bold tabular-nums sm:ml-0 sm:flex-none sm:text-right sm:text-base ${isIncome ? 'text-emerald-800' : 'text-orange-800'}`}>
                    <span className="sr-only">{isIncome ? 'Thu' : 'Chi'}</span>{isIncome ? '+' : '−'}{money(row.amount)}
                  </div>
                  {session && <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" className="size-9 min-h-9 p-0" aria-label={`Nhân bản giao dịch ${row.category}`} title="Nhân bản giao dịch" onClick={() => setEditor({ mode: 'duplicate', transaction: row })}><Copy size={16} /></Button>
                    <Button variant="ghost" className="size-9 min-h-9 p-0" aria-label={`Sửa giao dịch ${row.category}`} onClick={() => setEditor({ mode: 'transaction', transaction: row })}><Pencil size={16} /></Button>
                    <Button variant="ghost" className="size-9 min-h-9 p-0 hover:text-red-700" aria-label={`Xóa giao dịch ${row.category}`} onClick={() => setEditor({ mode: 'delete', transaction: row })}><Trash2 size={16} /></Button>
                  </div>}
                </li>
              </Fragment>
            })}
          </ul>}
      </section>
    </main>
    {editor && <Editor editor={editor} month={month}
      budget={editor.mode === 'categoryBudget' ? current?.data?.categoryBudgets?.[editor.category] ?? null : budget}
      onClose={() => setEditor(null)}
      onSave={async (draft, id) => {
        await saveTransaction(draft, id)
        setMonth(draft.date.slice(0, 7))
        setCategory('')
        setType('')
        refresh()
      }}
      onBudget={async amount => { await saveBudget(month, amount); refresh() }}
      onCategoryBudget={async (category, amount) => { await saveCategoryBudget(month, category, amount); refresh() }}
      onDelete={async id => { await deleteTransaction(id); refresh() }} />}
  </>
}

export default function App() {
  const localDemo = import.meta.env.DEV && import.meta.env.VITE_LOCAL_DEMO === 'true' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)

  useEffect(() => {
    if (!supabase || localDemo) return
    const { data } = supabase.auth.onAuthStateChange((_event, currentSession) => setSession(currentSession))
    return () => data.subscription.unsubscribe()
  }, [localDemo])

  if (localDemo) return <Dashboard session={null} />
  if (session === undefined) return <main className="p-8 text-center" role="status">Đang kiểm tra đăng nhập…</main>
  if (!session) return <Login />
  return <Dashboard key={session.user.id} session={session} />
}
