import { useState, type ChangeEvent, type FormEvent } from 'react'
import { AlertDialog } from 'radix-ui'
import { Button } from './ui/button'
import { Dialog } from './ui/dialog'
import { categories, dateLabel, maxAmount, money, today, type Draft, type ExpenseCategory, type Kind, type Transaction } from '../data'

const amountFormatter = new Intl.NumberFormat('vi-VN')

function formatAmountInput(event: ChangeEvent<HTMLInputElement>) {
  const input = event.currentTarget
  const digits = input.value.replace(/\D/g, '')
  const digitsBeforeCaret = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, '').length
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (input.value === formatted) return

  input.value = formatted
  let caret = 0
  let digitsSeen = 0
  while (caret < formatted.length && digitsSeen < digitsBeforeCaret) {
    if (formatted[caret] !== '.') digitsSeen++
    caret++
  }
  input.setSelectionRange(caret, caret)
}

export type EditorState =
  | { mode: 'transaction'; transaction?: Transaction }
  | { mode: 'duplicate'; transaction: Transaction }
  | { mode: 'budget' }
  | { mode: 'categoryBudget'; category: ExpenseCategory }
  | { mode: 'delete'; transaction: Transaction }

export function Editor({ editor, month, budget, onClose, onSave, onBudget, onCategoryBudget, onDelete }: {
  editor: EditorState
  month: string
  budget: number | null
  onClose: () => void
  onSave: (draft: Draft, id?: string) => Promise<void>
  onBudget: (amount: number) => Promise<void>
  onCategoryBudget: (category: ExpenseCategory, amount: number | null) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const transaction = 'transaction' in editor ? editor.transaction : undefined
  const [type, setType] = useState<Kind>(transaction?.type ?? 'expense')
  const [category, setCategory] = useState(transaction?.category ?? categories.expense[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
      onClose()
    } catch {
      setError('Không lưu được thay đổi. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  if (editor.mode === 'delete') {
    return (
      <AlertDialog.Root open onOpenChange={open => { if (!open && !busy) onClose() }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-slate-950/45" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-1/2 rounded-2xl bg-white p-6 shadow-xl">
            <AlertDialog.Title className="text-xl font-bold">Xóa giao dịch?</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-slate-600">
              Khoản {money(editor.transaction.amount)} · {editor.transaction.category} ngày {dateLabel(editor.transaction.date)} sẽ bị xóa.
            </AlertDialog.Description>
            {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialog.Cancel asChild><Button variant="outline" disabled={busy}>Hủy</Button></AlertDialog.Cancel>
              <Button variant="destructive" disabled={busy} onClick={() => void run(() => onDelete(editor.transaction.id))}>
                {busy ? 'Đang xóa…' : 'Xóa giao dịch'}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    )
  }

  const categoryBudget = editor.mode === 'categoryBudget' ? editor.category : undefined
  const isBudget = editor.mode === 'budget' || editor.mode === 'categoryBudget'
  const duplicate = editor.mode === 'duplicate'
  const initialAmount = isBudget ? budget : transaction?.amount
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const digits = String(fields.get('amount') ?? '').replaceAll('.', '')
    const amount = Number(digits)
    if (!/^\d+$/.test(digits) || !Number.isSafeInteger(amount) || amount < (isBudget ? 0 : 1) || amount > maxAmount) {
      setError('Vui lòng nhập số tiền bằng số nguyên hợp lệ.')
      return
    }
    if (categoryBudget) {
      void run(() => onCategoryBudget(categoryBudget, amount))
      return
    }
    if (isBudget) {
      void run(() => onBudget(amount))
      return
    }
    const date = String(fields.get('date'))
    const note = String(fields.get('note')).trim()
    void run(() => onSave({ type, category, amount, date, note }, duplicate ? undefined : transaction?.id))
  }

  return (
    <Dialog title={categoryBudget ? `Ngân sách · ${categoryBudget}` : isBudget ? 'Ngân sách tháng' : duplicate ? 'Nhân bản giao dịch' : transaction ? 'Sửa giao dịch' : 'Thêm giao dịch'}
      description={isBudget ? `Đặt hạn mức chi tiêu cho tháng ${month.split('-').reverse().join('/')}.` : 'Nhập thông tin khoản thu hoặc khoản chi.'}
      onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="mt-5 space-y-4">
        {!isBudget && <div className="grid grid-cols-2 gap-2" aria-label="Loại giao dịch" role="group">
          {(['expense', 'income'] as const).map(kind => (
            <Button key={kind} aria-pressed={type === kind} variant={type === kind ? 'default' : 'outline'}
              onClick={() => {
                if (kind === type) return
                setType(kind)
                setCategory(categories[kind][0])
              }}>
              {kind === 'expense' ? 'Khoản chi' : 'Khoản thu'}
            </Button>
          ))}
        </div>}
        <label className="field">Số tiền (₫)
          <span className="relative">
            <input name="amount" type="text" inputMode="numeric" required onChange={formatAmountInput}
              className="w-full pr-9! tabular-nums"
              defaultValue={initialAmount == null ? '' : amountFormatter.format(initialAmount)} placeholder="VD 35.000" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-600">₫</span>
          </span>
        </label>
        {!isBudget && <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field">Danh mục
              <select value={category} onChange={event => setCategory(event.target.value)}>
                {categories[type].map(item => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="field">Ngày
              <input name="date" type="date" required defaultValue={duplicate ? today() : transaction?.date ?? today()} min="1900-01-01" max="9999-12-31" />
            </label>
          </div>
          <label className="field">Ghi chú <span className="sr-only">(tùy chọn)</span>
            <textarea name="note" rows={3} maxLength={500} placeholder="Ví dụ: Cà phê với bạn" defaultValue={transaction?.note} />
          </label>
        </>}
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          {categoryBudget && budget !== null && <Button variant="ghost" className="mr-auto text-red-700" disabled={busy}
            onClick={() => void run(() => onCategoryBudget(categoryBudget, null))}>Bỏ hạn mức</Button>}
          <Button variant="outline" disabled={busy} onClick={onClose}>Hủy</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</Button>
        </div>
      </form>
    </Dialog>
  )
}
