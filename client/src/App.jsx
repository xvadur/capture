import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PromptEditor } from './components/PromptEditor'
import { StatsPanel } from './components/StatsPanel'
import { Sidebar } from './components/layout/Sidebar'
import { AppLayout } from './components/layout/AppLayout'
import { useStats } from './hooks/useStats'
import { sounds } from './lib/sounds'

function XPFlash({ result, onDone }) {
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          className="fixed bottom-8 right-8 bg-zinc-800 border border-zinc-600 rounded-2xl px-6 py-4 shadow-2xl cursor-pointer z-50"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={onDone}
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">{'\u26A1'}</div>
            <div>
              <div className="text-xl font-bold text-zinc-100 font-mono">+{result.totalXP} XP</div>
              <div className="text-xs text-zinc-400">
                {result.wordCount} words
                {result.speedMultiplier > 1 && (
                  <span className="ml-2 text-emerald-400 font-semibold">
                    {result.speedMultiplier}x speed
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const { todayStats, streak, refetch } = useStats()

  async function handleSubmit({ text, cpm, cpmDuration }) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, cpm, cpmDuration })
      })
      const data = await res.json()
      if (res.ok) {
        setLastResult(data)
        sounds.send.play()
        if (data.speedMultiplier > 1) sounds.speedBoost.play()
        await refetch()
        setTimeout(() => setLastResult(null), 4000)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const sidebar = (
    <Sidebar
      totalXP={todayStats.total_xp || 0}
      streak={streak}
    />
  )

  return (
    <AppLayout sidebar={sidebar}>
      <motion.div
        className="max-w-3xl mx-auto flex flex-col gap-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* Header */}
        <div>
          <motion.h2
            className="text-xl font-semibold text-zinc-100"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            Mission Control
          </motion.h2>
          <p className="text-zinc-500 text-sm mt-0.5">Your prompt writing dashboard</p>
        </div>

        {/* Stats Grid */}
        <StatsPanel todayStats={todayStats} streak={streak} />

        {/* Editor */}
        <PromptEditor onSubmit={handleSubmit} isLoading={isLoading} />
      </motion.div>

      <XPFlash result={lastResult} onDone={() => setLastResult(null)} />
    </AppLayout>
  )
}
