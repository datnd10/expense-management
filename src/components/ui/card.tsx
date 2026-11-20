import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

// Adapted from the shadcn/ui New York Card.
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card" className={twMerge('flex flex-col gap-6 rounded-2xl border border-slate-200/80 bg-white py-6 shadow-sm', className)} {...props} />
}
