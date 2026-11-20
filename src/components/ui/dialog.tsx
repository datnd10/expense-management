import { Dialog as Primitive } from 'radix-ui'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Dialog({ title, description, children, onClose, busy }: {
  title: string
  description: string
  children: ReactNode
  onClose: () => void
  busy: boolean
}) {
  return (
    <Primitive.Root open onOpenChange={open => { if (!open && !busy) onClose() }}>
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-40 bg-slate-950/45" />
        <Primitive.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-7">
          <Primitive.Title className="pr-8 text-xl font-bold tracking-tight">{title}</Primitive.Title>
          <Primitive.Description className="mt-1 text-sm text-slate-600">{description}</Primitive.Description>
          <Primitive.Close disabled={busy} aria-label="Đóng" className="absolute top-4 right-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40">
            <X size={18} />
          </Primitive.Close>
          {children}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  )
}
