import { useState } from 'react'
import { PromptEditor } from './components/PromptEditor'
import { StatsPanel } from './components/StatsPanel'
import { useStats } from './hooks/useStats'
import { sounds } from './lib/sounds'

function XPFlash({ result, onDone }) {
  if (!result) return null
  return (
    <div
      className="fixed bottom-8 right-8 bg-zinc-800 border border-zinc-600 rounded-2xl px-6 py-4 shadow-2xl animate-fade-in-up cursor-pointer z-50"
      onClick={onDone}
    >
      <div className="text-2xl font-bold text-zinc-100">+{result.totalXP} XP</div>
      <div className="text-sm text-zinc-400">
        {result.wordCount} words
        {result.speedMultiplier > 1 && (
          <span className="ml-2 text-green-400 font-semibold">
            {result.speedMultiplier}x speed boost
          </span>
        )}
      </div>
    </div>
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col gap-6 max-w-2xl mx-auto">
      <header>
        <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Prompt Hub</h1>
        <p className="text-zinc-500 text-sm">Write. Track. Level up.</p>
      </header>

      <StatsPanel todayStats={todayStats} streak={streak} totalXP={todayStats.total_xp || 0} />

      <main className="flex-1">
        <PromptEditor onSubmit={handleSubmit} isLoading={isLoading} />
      </main>

      <XPFlash result={lastResult} onDone={() => setLastResult(null)} />
    </div>
  )
}
