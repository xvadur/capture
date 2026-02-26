import { cn } from '../../lib/utils'
import { motion } from 'framer-motion'

export function Progress({ value = 0, className, indicatorClassName }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-zinc-800', className)}>
      <motion.div
        className={cn('h-full rounded-full bg-zinc-100', indicatorClassName)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ type: 'spring', stiffness: 80, damping: 15 }}
      />
    </div>
  )
}
