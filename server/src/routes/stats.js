import { Router } from 'express'
import { supabase } from '../db/supabase.js'

const router = Router()

// Today's stats
router.get('/today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('date', today)
    .single()

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message })
  }

  res.json(data || { date: today, total_words: 0, total_prompts: 0, total_xp: 0 })
})

// Streak: count consecutive days backwards from today with at least 1 prompt
router.get('/streak', async (req, res) => {
  const { data, error } = await supabase
    .from('daily_stats')
    .select('date, total_prompts')
    .gt('total_prompts', 0)
    .order('date', { ascending: false })
    .limit(365)

  if (error) return res.status(500).json({ error: error.message })

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check if today has prompts — if not, start from yesterday
  let checkDate = new Date(today)

  for (const row of (data || [])) {
    const rowDate = new Date(row.date + 'T00:00:00')
    const expected = new Date(checkDate)
    expected.setDate(expected.getDate() - streak)
    expected.setHours(0, 0, 0, 0)

    const diffDays = Math.round((expected - rowDate) / 86400000)

    if (diffDays === 0) {
      streak++
    } else {
      break
    }
  }

  res.json({ streak })
})

// History: last 30 days
router.get('/history', async (req, res) => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('daily_stats')
    .select('date, total_words, total_prompts, total_xp')
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

export default router
