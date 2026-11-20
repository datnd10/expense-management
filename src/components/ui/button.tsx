import type { ComponentProps } from 'react'
import { cva } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'

const buttonVariants = cva(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-teal-800 text-white hover:bg-teal-900',
        outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        destructive: 'bg-red-700 text-white hover:bg-red-800',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Button({ className, variant, type = 'button', ...props }: ComponentProps<'button'> & {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
}) {
  return <button type={type} className={twMerge(buttonVariants({ variant }), className)} {...props} />
}
