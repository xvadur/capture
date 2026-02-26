import { motion } from 'framer-motion'
import { PenLine, BarChart3, Trophy, Flame, Zap } from 'lucide-react'
import { Progress } from '../ui/progress'

function levelFromXP(xp) {
  let level = 1
  while (Math.round(100 * Math.pow(level + 1, 1.6)) <= xp) level++
  return level
}

function xpForLevel(n) {
  return Math.round(100 * Math.pow(n, 1.6))
}

function getTierInfo(level) {
  if (level >= 50) return { name: 'Diamond', icon: '\u{1F48E}', color: 'text-purple-400' }
  if (level >= 30) return { name: 'Platinum', icon: '\u{1F451}', color: 'text-cyan-300' }
  if (level >= 15) return { name: 'Gold', icon: '\u{1F947}', color: 'text-yellow-400' }
  if (level >= 5) return { name: 'Silver', icon: '\u{1F948}', color: 'text-zinc-300' }
  return { name: 'Bronze', icon: '\u{1F949}', color: 'text-orange-400' }
}

const navItems = [
  { icon: PenLine, label: 'Write', id: 'write' },
  { icon: BarChart3, label: 'Stats', id: 'stats' },
  { icon: Trophy, label: 'Character', id: 'character' },
]

export function Sidebar({ totalXP = 0, streak = 0, activePage = 'write' }) {
  const level = levelFromXP(totalXP)
  const currentLevelXP = xpForLevel(level)
  const nextLevelXP = xpForLevel(level + 1)
  const progress = nextLevelXP > currentLevelXP
    ? ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
    : 0
  const tier = getTierInfo(level)

  return (
    <motion.aside
      className="w-[220px] min-h-screen bg-zinc-950 border-r border-zinc-800/50 flex flex-col py-5 px-3"
      initial={{ x: -220 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
    >
      {/* Logo */}
      <div className="px-3 mb-8">
        <h1 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Prompt Hub
        </h1>
        <p className="text-zinc-500 text-xs mt-0.5">Write. Track. Level up.</p>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 mb-auto">
        {navItems.map((item) => {
          const isActive = activePage === item.id
          return (
            <motion.button
              key={item.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </motion.button>
          )
        })}
      </nav>

      {/* Character Card */}
      <div className="mt-4 px-1">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          {/* Tier + Level */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{tier.icon}</span>
            <div>
              <div className="text-xs text-zinc-500">{tier.name}</div>
              <div className="text-sm font-bold text-zinc-100">Level {level}</div>
            </div>
          </div>

          {/* XP Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-[10px] text-zinc-500 mb-1 font-mono">
              <span>{totalXP.toLocaleString()} XP</span>
              <span>{nextLevelXP.toLocaleString()}</span>
            </div>
            <Progress value={progress} indicatorClassName="bg-gradient-to-r from-amber-500 to-orange-500" />
          </div>

          {/* Streak */}
          <div className="flex items-center gap-1.5 text-xs">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-zinc-300 font-medium">{streak} day streak</span>
          </div>
        </div>
      </div>
    </motion.aside>
  )
}
