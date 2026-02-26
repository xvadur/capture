import { motion } from 'framer-motion'
import { Card, CardContent } from './ui/card'
import { PenLine, Zap, Target, Clock } from 'lucide-react'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } }
}

export function StatsPanel({ todayStats, streak }) {
  const stats = [
    {
      icon: PenLine,
      label: 'Words Today',
      value: todayStats.total_words.toLocaleString(),
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Target,
      label: 'Prompts',
      value: todayStats.total_prompts,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: Zap,
      label: 'XP Earned',
      value: `+${todayStats.total_xp}`,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: Clock,
      label: 'Avg Words/Prompt',
      value: todayStats.total_prompts > 0
        ? Math.round(todayStats.total_words / todayStats.total_prompts)
        : 0,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ]

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {stats.map((stat) => (
        <motion.div key={stat.label} variants={item}>
          <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 cursor-default">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`${stat.bgColor} rounded-lg p-1.5`}>
                  <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                </div>
                <span className="text-xs text-zinc-500 font-medium">{stat.label}</span>
              </div>
              <div className="text-xl font-bold text-zinc-100 font-mono tracking-tight">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
