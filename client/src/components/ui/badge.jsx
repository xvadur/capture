import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-zinc-100 text-zinc-900',
  secondary: 'bg-zinc-800 text-zinc-300',
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  destructive: 'bg-red-500/15 text-red-400 border border-red-500/20',
  purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  blue: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
}

export function Badge({ className, variant = 'default', children, ...props }) {
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', variants[variant], className)} {...props}>
      {children}
    </span>
  )
}
