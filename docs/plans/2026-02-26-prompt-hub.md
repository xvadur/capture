# Prompt Hub Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a gamified web app where the user writes AI prompts, tracks writing speed/word count, earns XP, and sees streaks — backed by Supabase.

**Architecture:** React/Vite frontend talks to a Node.js/Express backend via REST. Backend handles XP calculation and persists prompts + daily stats to Supabase. OpenClaw agent connects directly to Supabase DB.

**Tech Stack:** React, Vite, Tailwind CSS, Node.js, Express, Supabase JS client, Howler.js (sounds), Vitest (frontend tests), Jest + Supertest (backend tests)

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json` (root — monorepo scripts)
- Create: `client/` (Vite + React)
- Create: `server/` (Node.js + Express)

**Step 1: Scaffold monorepo root**

```bash
cd /Users/_xvadur/capture
cat > package.json << 'EOF'
{
  "name": "prompt-hub",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
    "test": "npm test --prefix server && npm test --prefix client"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
EOF
npm install
```

**Step 2: Scaffold Vite + React client**

```bash
npm create vite@latest client -- --template react
cd client
npm install
npm install tailwindcss @tailwindcss/vite howler
```

**Step 3: Configure Tailwind in client**

In `client/vite.config.js` add the Tailwind plugin:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': 'http://localhost:3001' } }
})
```

In `client/src/index.css` replace content with:
```css
@import "tailwindcss";
```

**Step 4: Scaffold Express server**

```bash
mkdir -p /Users/_xvadur/capture/server/src
cd /Users/_xvadur/capture/server
cat > package.json << 'EOF'
{
  "name": "prompt-hub-server",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "test": "node --experimental-vm-modules node_modules/.bin/jest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.0"
  },
  "jest": {
    "transform": {},
    "testEnvironment": "node"
  }
}
EOF
npm install
```

**Step 5: Create `.env` in server**

```bash
cat > /Users/_xvadur/capture/server/.env << 'EOF'
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
PORT=3001
EOF
```

Fill in real values from Supabase dashboard → Settings → API.

**Step 6: Commit**

```bash
cd /Users/_xvadur/capture
git init
git add .
git commit -m "chore: scaffold monorepo client + server"
```

---

## Task 2: Supabase Schema

**Files:**
- Create: `server/src/db/schema.sql`

**Step 1: Write schema file**

```sql
-- server/src/db/schema.sql

CREATE TABLE IF NOT EXISTS prompts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text              text NOT NULL,
  word_count        int NOT NULL DEFAULT 0,
  char_count        int NOT NULL DEFAULT 0,
  avg_word_length   float NOT NULL DEFAULT 0,
  base_xp           int NOT NULL DEFAULT 0,
  length_bonus      int NOT NULL DEFAULT 0,
  speed_multiplier  float NOT NULL DEFAULT 1.0,
  total_xp          int NOT NULL DEFAULT 0,
  cpm               float NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_stats (
  date            date PRIMARY KEY,
  total_words     int NOT NULL DEFAULT 0,
  total_prompts   int NOT NULL DEFAULT 0,
  total_xp        int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS prompts_created_at_idx ON prompts(created_at);
CREATE INDEX IF NOT EXISTS daily_stats_date_idx ON daily_stats(date DESC);
```

**Step 2: Run in Supabase SQL editor**

Open Supabase dashboard → SQL Editor → paste and run schema.sql.

**Step 3: Verify tables exist**

In Supabase → Table Editor, confirm `prompts` and `daily_stats` tables appear.

**Step 4: Commit**

```bash
git add server/src/db/schema.sql
git commit -m "feat: add supabase schema for prompts and daily_stats"
```

---

## Task 3: XP Calculation Logic (with tests)

**Files:**
- Create: `server/src/lib/xp.js`
- Create: `server/src/lib/xp.test.js`

**Step 1: Write the failing tests**

```js
// server/src/lib/xp.test.js
import { calculateXP } from './xp.js'

describe('calculateXP', () => {
  test('returns 0 for fewer than 10 words', () => {
    expect(calculateXP({ wordCount: 9, avgWordLength: 5, cpm: 0, cpmDuration: 0 })).toEqual({
      baseXP: 0, lengthBonus: 0, speedMultiplier: 1.0, totalXP: 0
    })
  })

  test('returns 100 base XP for 5000+ words', () => {
    const result = calculateXP({ wordCount: 5000, avgWordLength: 5, cpm: 0, cpmDuration: 0 })
    expect(result.baseXP).toBe(100)
  })

  test('scales linearly between 10 and 5000 words', () => {
    const result = calculateXP({ wordCount: 2500, avgWordLength: 5, cpm: 0, cpmDuration: 0 })
    expect(result.baseXP).toBe(50)
  })

  test('length bonus = round(avgWordLength * 2)', () => {
    const result = calculateXP({ wordCount: 100, avgWordLength: 8, cpm: 0, cpmDuration: 0 })
    expect(result.lengthBonus).toBe(16)
  })

  test('speed multiplier 1.2 for cpm >= 45 sustained > 10s', () => {
    const result = calculateXP({ wordCount: 100, avgWordLength: 5, cpm: 50, cpmDuration: 15 })
    expect(result.speedMultiplier).toBe(1.2)
  })

  test('speed multiplier 1.4 for cpm >= 60 sustained > 10s', () => {
    const result = calculateXP({ wordCount: 100, avgWordLength: 5, cpm: 65, cpmDuration: 15 })
    expect(result.speedMultiplier).toBe(1.4)
  })

  test('speed multiplier 1.5 for cpm >= 70 sustained > 10s', () => {
    const result = calculateXP({ wordCount: 100, avgWordLength: 5, cpm: 75, cpmDuration: 15 })
    expect(result.speedMultiplier).toBe(1.5)
  })

  test('no speed multiplier if duration <= 10s', () => {
    const result = calculateXP({ wordCount: 100, avgWordLength: 5, cpm: 80, cpmDuration: 9 })
    expect(result.speedMultiplier).toBe(1.0)
  })

  test('total XP = round((baseXP + lengthBonus) * speedMultiplier)', () => {
    const result = calculateXP({ wordCount: 100, avgWordLength: 5, cpm: 70, cpmDuration: 15 })
    // baseXP = round(100/5000 * 100) = 2, lengthBonus = 10, multiplier = 1.5
    // total = round((2 + 10) * 1.5) = round(18) = 18
    expect(result.totalXP).toBe(18)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
cd /Users/_xvadur/capture/server
npm test -- --testPathPattern=xp.test.js
```

Expected: FAIL — `Cannot find module './xp.js'`

**Step 3: Implement xp.js**

```js
// server/src/lib/xp.js

export function calculateXP({ wordCount, avgWordLength, cpm, cpmDuration }) {
  // Base XP: 0-100 based on word count
  let baseXP = 0
  if (wordCount >= 10) {
    baseXP = Math.min(Math.round((wordCount / 5000) * 100), 100)
  }

  // Length bonus: longer avg word = more XP
  const lengthBonus = Math.round(avgWordLength * 2)

  // Speed multiplier: only if sustained > 10 seconds
  let speedMultiplier = 1.0
  if (cpmDuration > 10) {
    if (cpm >= 70) speedMultiplier = 1.5
    else if (cpm >= 60) speedMultiplier = 1.4
    else if (cpm >= 45) speedMultiplier = 1.2
  }

  const totalXP = Math.round((baseXP + lengthBonus) * speedMultiplier)

  return { baseXP, lengthBonus, speedMultiplier, totalXP }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=xp.test.js
```

Expected: All PASS

**Step 5: Commit**

```bash
git add server/src/lib/xp.js server/src/lib/xp.test.js
git commit -m "feat: add XP calculation logic with tests"
```

---

## Task 4: Supabase Client + Express App

**Files:**
- Create: `server/src/db/supabase.js`
- Create: `server/src/app.js`
- Create: `server/src/index.js`

**Step 1: Create Supabase client**

```js
// server/src/db/supabase.js
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)
```

**Step 2: Create Express app**

```js
// server/src/app.js
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))

export default app
```

**Step 3: Create entry point**

```js
// server/src/index.js
import 'dotenv/config'
import app from './app.js'

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
```

**Step 4: Verify server starts**

```bash
cd /Users/_xvadur/capture/server && npm run dev
# In another terminal:
curl http://localhost:3001/api/health
# Expected: {"ok":true}
```

**Step 5: Commit**

```bash
git add server/src/
git commit -m "feat: add express app with supabase client"
```

---

## Task 5: POST /api/prompts Endpoint (with tests)

**Files:**
- Create: `server/src/routes/prompts.js`
- Create: `server/src/routes/prompts.test.js`
- Modify: `server/src/app.js`

**Step 1: Write failing test**

```js
// server/src/routes/prompts.test.js
import request from 'supertest'
import app from '../app.js'

// Mock supabase
jest.mock('../db/supabase.js', () => ({
  supabase: {
    from: () => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'test-id', total_xp: 18 }, error: null }) }) }),
      upsert: async () => ({ error: null })
    })
  }
}))

describe('POST /api/prompts', () => {
  test('returns 400 if text is missing', async () => {
    const res = await request(app).post('/api/prompts').send({})
    expect(res.status).toBe(400)
  })

  test('returns 201 with xp data on valid prompt', async () => {
    const res = await request(app)
      .post('/api/prompts')
      .send({ text: 'Hello world this is a test prompt with enough words to earn XP', cpm: 50, cpmDuration: 15 })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('totalXP')
    expect(res.body).toHaveProperty('promptId')
  })
})
```

**Step 2: Run to verify fail**

```bash
npm test -- --testPathPattern=prompts.test.js
```

Expected: FAIL — route not found

**Step 3: Implement prompts route**

```js
// server/src/routes/prompts.js
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

  // Upsert daily_stats
  const today = new Date().toISOString().split('T')[0]
  await supabase.from('daily_stats').upsert(
    { date: today, total_words: wordCount, total_prompts: 1, total_xp: xp.totalXP },
    { onConflict: 'date', ignoreDuplicates: false }
  )

  res.status(201).json({
    promptId: prompt.id,
    wordCount,
    charCount,
    ...xp
  })
})

export default router
```

**Step 4: Register route in app.js**

Add to `server/src/app.js`:
```js
import promptsRouter from './routes/prompts.js'
// after middleware setup:
app.use('/api/prompts', promptsRouter)
```

**Step 5: Run tests to verify pass**

```bash
npm test -- --testPathPattern=prompts.test.js
```

Expected: All PASS

**Step 6: Commit**

```bash
git add server/src/routes/
git commit -m "feat: POST /api/prompts with XP calculation"
```

---

## Task 6: GET Stats Endpoints

**Files:**
- Create: `server/src/routes/stats.js`
- Modify: `server/src/app.js`

**Step 1: Implement stats routes**

```js
// server/src/routes/stats.js
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
    .order('date', { ascending: false })
    .limit(365)

  if (error) return res.status(500).json({ error: error.message })

  let streak = 0
  let current = new Date()
  current.setHours(0, 0, 0, 0)

  for (const row of (data || [])) {
    const rowDate = new Date(row.date)
    rowDate.setHours(0, 0, 0, 0)
    const diffDays = Math.round((current - rowDate) / 86400000)

    if (diffDays === 0 || diffDays === streak) {
      if (row.total_prompts > 0) {
        streak++
        current = rowDate
      } else {
        break
      }
    } else {
      break
    }
  }

  res.json({ streak })
})

// History: last 30 days for chart
router.get('/history', async (req, res) => {
  const { data, error } = await supabase
    .from('daily_stats')
    .select('date, total_words, total_prompts, total_xp')
    .order('date', { ascending: true })
    .limit(30)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

export default router
```

**Step 2: Register in app.js**

```js
import statsRouter from './routes/stats.js'
app.use('/api/stats', statsRouter)
```

**Step 3: Verify endpoints manually**

```bash
curl http://localhost:3001/api/stats/today
curl http://localhost:3001/api/stats/streak
curl http://localhost:3001/api/stats/history
```

Expected: JSON responses (empty/zero values on fresh DB)

**Step 4: Commit**

```bash
git add server/src/routes/stats.js
git commit -m "feat: GET /api/stats/today, streak, history"
```

---

## Task 7: Frontend — Writing Area with Live Metrics

**Files:**
- Create: `client/src/hooks/useTypingMetrics.js`
- Create: `client/src/hooks/useTypingMetrics.test.js`
- Create: `client/src/components/PromptEditor.jsx`

**Step 1: Write failing test for useTypingMetrics hook logic**

```js
// client/src/hooks/useTypingMetrics.test.js
import { computeMetrics } from './useTypingMetrics.js'

describe('computeMetrics', () => {
  test('counts words correctly', () => {
    expect(computeMetrics('hello world foo').wordCount).toBe(3)
  })

  test('counts chars', () => {
    expect(computeMetrics('hello').charCount).toBe(5)
  })

  test('calculates avgWordLength', () => {
    expect(computeMetrics('hi there').avgWordLength).toBe(3.5)
  })

  test('returns 0 for empty string', () => {
    const m = computeMetrics('')
    expect(m.wordCount).toBe(0)
    expect(m.charCount).toBe(0)
    expect(m.avgWordLength).toBe(0)
  })
})
```

**Step 2: Run to verify fail**

```bash
cd /Users/_xvadur/capture/client
npx vitest run --reporter=verbose hooks/useTypingMetrics.test.js
```

Expected: FAIL

**Step 3: Implement computeMetrics + hook**

```js
// client/src/hooks/useTypingMetrics.js
import { useState, useRef, useCallback } from 'react'

export function computeMetrics(text) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const charCount = text.length
  const avgWordLength = wordCount > 0
    ? parseFloat((words.reduce((s, w) => s + w.length, 0) / wordCount).toFixed(2))
    : 0
  return { wordCount, charCount, avgWordLength }
}

export function useTypingMetrics() {
  const [cpm, setCpm] = useState(0)
  const [cpmDuration, setCpmDuration] = useState(0)
  const typingStart = useRef(null)
  const charsAtStart = useRef(0)
  const pauseTimer = useRef(null)
  const cpmInterval = useRef(null)

  const onTextChange = useCallback((text) => {
    // Reset pause timer
    if (pauseTimer.current) clearTimeout(pauseTimer.current)

    // Start typing session if not started
    if (!typingStart.current) {
      typingStart.current = Date.now()
      charsAtStart.current = text.length

      cpmInterval.current = setInterval(() => {
        const elapsedMin = (Date.now() - typingStart.current) / 60000
        const charsTyped = text.length - charsAtStart.current
        if (elapsedMin > 0) {
          setCpm(Math.round(charsTyped / elapsedMin))
          setCpmDuration(Math.round((Date.now() - typingStart.current) / 1000))
        }
      }, 1000)
    }

    // Pause after 3 seconds of no typing
    pauseTimer.current = setTimeout(() => {
      if (cpmInterval.current) clearInterval(cpmInterval.current)
      typingStart.current = null
    }, 3000)
  }, [])

  const reset = useCallback(() => {
    setCpm(0)
    setCpmDuration(0)
    typingStart.current = null
    if (pauseTimer.current) clearTimeout(pauseTimer.current)
    if (cpmInterval.current) clearInterval(cpmInterval.current)
  }, [])

  return { cpm, cpmDuration, onTextChange, reset }
}
```

**Step 4: Run tests to verify pass**

```bash
npx vitest run hooks/useTypingMetrics.test.js
```

Expected: All PASS

**Step 5: Implement PromptEditor component**

```jsx
// client/src/components/PromptEditor.jsx
import { useState } from 'react'
import { computeMetrics, useTypingMetrics } from '../hooks/useTypingMetrics'

const SPEED_THRESHOLDS = [
  { min: 70, label: '1.5×', color: 'text-purple-400' },
  { min: 60, label: '1.4×', color: 'text-blue-400' },
  { min: 45, label: '1.2×', color: 'text-green-400' },
]

function getSpeedInfo(cpm, cpmDuration) {
  if (cpmDuration <= 10) return null
  return SPEED_THRESHOLDS.find(t => cpm >= t.min) || null
}

export function PromptEditor({ onSubmit, isLoading }) {
  const [text, setText] = useState('')
  const { cpm, cpmDuration, onTextChange, reset } = useTypingMetrics()

  const metrics = computeMetrics(text)
  const speedInfo = getSpeedInfo(cpm, cpmDuration)

  function handleChange(e) {
    setText(e.target.value)
    onTextChange(e.target.value)
  }

  function handleSubmit() {
    if (!text.trim() || isLoading) return
    onSubmit({ text, cpm, cpmDuration })
    setText('')
    reset()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        className="w-full min-h-[200px] bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-xl p-4 text-base resize-y focus:outline-none focus:border-zinc-500 font-mono"
        placeholder="Write your prompt here... (Ctrl+Enter to send)"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus
      />

      {/* Live metrics */}
      <div className="flex items-center gap-4 text-sm text-zinc-400 px-1">
        <span>Words: <strong className="text-zinc-200">{metrics.wordCount}</strong></span>
        <span>Chars/min: <strong className="text-zinc-200">{cpm}</strong></span>
        {speedInfo && (
          <span className={`font-bold ${speedInfo.color}`}>
            ⚡ {speedInfo.label} speed boost
          </span>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading || !text.trim()}
        className="self-end px-6 py-2 bg-zinc-100 text-zinc-900 rounded-lg font-semibold hover:bg-white disabled:opacity-40 transition-colors"
      >
        {isLoading ? 'Sending...' : 'Send prompt ↵'}
      </button>
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add client/src/
git commit -m "feat: PromptEditor with live word count and CPM tracking"
```

---

## Task 8: Sound Effects

**Files:**
- Create: `client/src/lib/sounds.js`

**Step 1: Create sounds module using Howler.js**

```js
// client/src/lib/sounds.js
import { Howl } from 'howler'

// Using simple Web Audio API tones instead of files — no assets needed
function createTone(frequency, duration, type = 'sine') {
  return {
    play() {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = type
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    }
  }
}

export const sounds = {
  send: createTone(880, 0.15),
  speedBoost: createTone(660, 0.2, 'triangle'),
  levelUp: createTone(1047, 0.4),
  streak: createTone(523, 0.5, 'triangle'),
}
```

**Step 2: Commit**

```bash
git add client/src/lib/sounds.js
git commit -m "feat: sound effects via Web Audio API"
```

---

## Task 9: Main App — Stats Panel + Submit Flow

**Files:**
- Create: `client/src/hooks/useStats.js`
- Create: `client/src/components/StatsPanel.jsx`
- Modify: `client/src/App.jsx`

**Step 1: Create useStats hook**

```js
// client/src/hooks/useStats.js
import { useState, useEffect, useCallback } from 'react'

export function useStats() {
  const [todayStats, setTodayStats] = useState({ total_words: 0, total_prompts: 0, total_xp: 0 })
  const [streak, setStreak] = useState(0)
  const [totalXP, setTotalXP] = useState(0)

  const fetchStats = useCallback(async () => {
    const [todayRes, streakRes] = await Promise.all([
      fetch('/api/stats/today'),
      fetch('/api/stats/streak')
    ])
    const today = await todayRes.json()
    const streakData = await streakRes.json()
    setTodayStats(today)
    setStreak(streakData.streak)
    setTotalXP(today.total_xp || 0)
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  return { todayStats, streak, totalXP, refetch: fetchStats }
}
```

**Step 2: Create StatsPanel**

```jsx
// client/src/components/StatsPanel.jsx
function levelFromXP(xp) {
  let level = 1
  while (Math.round(100 * Math.pow(level + 1, 1.6)) <= xp) level++
  return level
}

function xpForLevel(n) {
  return Math.round(100 * Math.pow(n, 1.6))
}

export function StatsPanel({ todayStats, streak, totalXP }) {
  const level = levelFromXP(totalXP)
  const currentLevelXP = xpForLevel(level)
  const nextLevelXP = xpForLevel(level + 1)
  const progress = Math.min(((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100, 100)

  return (
    <div className="flex flex-wrap gap-4 text-sm">
      {/* Streak */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-2">
        <span className="text-xl">🔥</span>
        <div>
          <div className="text-zinc-400 text-xs">Streak</div>
          <div className="text-zinc-100 font-bold">{streak} days</div>
        </div>
      </div>

      {/* Today */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
        <div className="text-zinc-400 text-xs mb-1">Today</div>
        <div className="text-zinc-100 font-bold">
          {todayStats.total_words.toLocaleString()} words
        </div>
        <div className="text-zinc-500 text-xs">
          {todayStats.total_prompts} prompts · {todayStats.total_xp} XP
        </div>
      </div>

      {/* Level */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 min-w-[160px]">
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Level {level}</span>
          <span>{totalXP} / {nextLevelXP} XP</span>
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
```

**Step 3: Rewrite App.jsx**

```jsx
// client/src/App.jsx
import { useState } from 'react'
import { PromptEditor } from './components/PromptEditor'
import { StatsPanel } from './components/StatsPanel'
import { useStats } from './hooks/useStats'
import { sounds } from './lib/sounds'

function XPFlash({ result, onDone }) {
  if (!result) return null
  return (
    <div
      className="fixed bottom-8 right-8 bg-zinc-800 border border-zinc-600 rounded-2xl px-6 py-4 shadow-2xl animate-fade-in-up cursor-pointer"
      onClick={onDone}
    >
      <div className="text-2xl font-bold text-zinc-100">+{result.totalXP} XP</div>
      <div className="text-sm text-zinc-400">
        {result.wordCount} words
        {result.speedMultiplier > 1 && (
          <span className="ml-2 text-green-400 font-semibold">
            {result.speedMultiplier}× speed boost
          </span>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const { todayStats, streak, totalXP, refetch } = useStats()

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

      <StatsPanel todayStats={todayStats} streak={streak} totalXP={totalXP} />

      <main>
        <PromptEditor onSubmit={handleSubmit} isLoading={isLoading} />
      </main>

      <XPFlash result={lastResult} onDone={() => setLastResult(null)} />
    </div>
  )
}
```

**Step 4: Add CSS animation to `client/src/index.css`**

```css
@import "tailwindcss";

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fadeInUp 0.2s ease-out;
}
```

**Step 5: Verify in browser**

```bash
cd /Users/_xvadur/capture
npm run dev
```

Open http://localhost:5173 — type a prompt, submit, see XP flash and stats update.

**Step 6: Commit**

```bash
git add client/src/
git commit -m "feat: stats panel, XP flash, full submit flow"
```

---

## Task 10: Daily Stats Upsert Fix

The `upsert` in Task 5 needs to accumulate (not replace) values. Fix server-side:

**Files:**
- Modify: `server/src/routes/prompts.js`

**Step 1: Replace the upsert with an RPC or raw SQL increment**

In `server/src/routes/prompts.js`, replace the `daily_stats` upsert block with:

```js
const today = new Date().toISOString().split('T')[0]

// First try to get existing row
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
```

**Step 2: Test manually**

Send 2 prompts. Check `/api/stats/today` — prompts count should be 2.

**Step 3: Commit**

```bash
git add server/src/routes/prompts.js
git commit -m "fix: accumulate daily_stats instead of replacing"
```

---

## Done — MVP Complete

Run the full app:

```bash
cd /Users/_xvadur/capture && npm run dev
```

Open http://localhost:5173

**What's working:**
- Write prompts → real-time word count + chars/min
- Speed multiplier activates after 10s sustained typing
- Submit → XP calculated and stored in Supabase
- Stats panel: streak, today's words/prompts/XP, level bar
- Sound effects on send and speed boost
- OpenClaw can read/write `prompts` and `daily_stats` tables directly

**Phase 2 (future):**
- Time-series charts (Recharts)
- Linguistic analysis (lexical diversity, TTR)
- User auth
