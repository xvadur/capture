import { cn } from '../../lib/utils'

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm shadow-sm', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn('text-sm font-semibold leading-none tracking-tight text-zinc-100', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('p-4 pt-0', className)} {...props}>
      {children}
    </div>
  )
}
