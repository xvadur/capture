function levelFromXP(xp) {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  return level
}

function xpForLevel(n) {
  return Math.round(100 * Math.pow(n, 1.6))
}

export function StatsPanel({ todayStats, streak, totalXP }) {
  const level = levelFromXP(totalXP)
  const currentLevelXP = xpForLevel(level)
  const nextLevelXP = xpForLevel(level + 1)
  const progress = nextLevelXP > currentLevelXP
    ? Math.min(((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100, 100)
    : 0

  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-2">
        <span className="text-xl">🔥</span>
        <div>
          <div className="text-zinc-500 text-xs">Streak</div>
          <div className="text-zinc-100 font-bold">{streak} {streak === 1 ? 'day' : 'days'}</div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
        <div className="text-zinc-500 text-xs mb-1">Today</div>
        <div className="text-zinc-100 font-bold">
          {todayStats.total_words.toLocaleString()} words
        </div>
        <div className="text-zinc-500 text-xs">
          {todayStats.total_prompts} prompts &middot; {todayStats.total_xp} XP
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 min-w-[180px]">
        <div className="flex justify-between text-xs text-zinc-500 mb-1">
          <span>Level {level}</span>
          <span>{totalXP.toLocaleString()} / {nextLevelXP.toLocaleString()} XP</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-zinc-100 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
