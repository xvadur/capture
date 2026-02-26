import { Router } from 'express'
import { supabase } from '../db/supabase.js'
import { calculateXP } from '../lib/xp.js'

const router = Router()

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function avgWordLength(text) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 0
  const totalChars = words.reduce((sum, w) => sum + w.length, 0)
  return totalChars / words.length
}

router.post('/', async (req, res) => {
  const { text, cpm = 0, cpmDuration = 0 } = req.body
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' })
  }

  const wordCount = countWords(text)
  const charCount = text.length
  const avgWL = parseFloat(avgWordLength(text).toFixed(2))
  const xp = calculateXP({ wordCount, avgWordLength: avgWL, cpm, cpmDuration })

  const { data: prompt, error } = await supabase
    .from('prompts')
    .insert({
      text,
      word_count: wordCount,
      char_count: charCount,
      avg_word_length: avgWL,
      base_xp: xp.baseXP,
      length_bonus: xp.lengthBonus,
      speed_multiplier: xp.speedMultiplier,
      total_xp: xp.totalXP,
      cpm
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // Upsert daily_stats (accumulate, don't replace)
  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('daily_stats')
    .select('total_words, total_prompts, total_xp')
    .eq('date', today)
    .single()

  if (existing) {
    await supabase.from('daily_stats').update({
      total_words: existing.total_words + wordCount,
      total_prompts: existing.total_prompts + 1,
      total_xp: existing.total_xp + xp.totalXP
    }).eq('date', today)
  } else {
    await supabase.from('daily_stats').insert({
      date: today,
      total_words: wordCount,
      total_prompts: 1,
      total_xp: xp.totalXP
    })
  }

  res.status(201).json({
    promptId: prompt.id,
    wordCount,
    charCount,
    ...xp
  })
})

export default router
