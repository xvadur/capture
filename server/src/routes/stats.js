import { Router } from 'express'
const router = Router()
router.get('/today', (req, res) => res.json({ date: new Date().toISOString().split('T')[0], total_words: 0, total_prompts: 0, total_xp: 0 }))
router.get('/streak', (req, res) => res.json({ streak: 0 }))
router.get('/history', (req, res) => res.json([]))
export default router
