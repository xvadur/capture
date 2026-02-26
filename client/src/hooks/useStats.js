import { useState, useEffect, useCallback } from 'react'

export function useStats() {
  const [todayStats, setTodayStats] = useState({ total_words: 0, total_prompts: 0, total_xp: 0 })
  const [streak, setStreak] = useState(0)

  const fetchStats = useCallback(async () => {
    try {
      const [todayRes, streakRes] = await Promise.all([
        fetch('/api/stats/today'),
        fetch('/api/stats/streak')
      ])
      const today = await todayRes.json()
      const streakData = await streakRes.json()
      setTodayStats(today)
      setStreak(streakData.streak)
    } catch (e) {
      console.error('Failed to fetch stats:', e)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  return { todayStats, streak, refetch: fetchStats }
}
