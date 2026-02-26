# Prompt Hub — MVP Design

**Date:** 2026-02-26
**Status:** Approved

## Overview

A gamified web application that serves as a centralized hub for writing AI prompts. The user writes all prompts in one interface, submits them, and the data is stored in Supabase. OpenClaw agent has direct DB access. The app provides deep writing analytics, XP progression, and streaks to motivate daily writing.

---

## Architecture

```
[Browser UI — React/Vite]
        ↓ REST API
[Node.js/Express Backend]
        ↓ Supabase JS client
[Supabase PostgreSQL DB] ← OpenClaw (direct DB access)
```

- **Frontend**: React + Vite (fast, lightweight)
- **Backend**: Node.js + Express (REST API, XP calculation logic)
- **Database**: Supabase (user already has 2M words in RAG here)
- **OpenClaw**: connects directly to Supabase DB — no UI access

---

## Database Schema

```sql
CREATE TABLE prompts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text          text NOT NULL,
  word_count    int,
  char_count    int,
  avg_word_length float,
  base_xp       int,
  length_bonus  int,
  speed_multiplier float DEFAULT 1.0,
  total_xp      int,
  wpm           float,        -- chars/min sustained during writing
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE daily_stats (
  date            date PRIMARY KEY,
  total_words     int DEFAULT 0,
  total_prompts   int DEFAULT 0,
  total_xp        int DEFAULT 0,
  streak_days     int DEFAULT 0
);
```

---

## XP Formula

### Base XP (0–100, based on word count)
```
if word_count < 10:     base_xp = 0
if word_count >= 5000:  base_xp = 100
else:                   base_xp = round((word_count / 5000) * 100)
```

### Length Bonus (avg word length reward)
```
length_bonus = round(avg_word_length * 2)
-- avg_word_length of 5 → +10 bonus
-- avg_word_length of 8 → +16 bonus
```

### Speed Multiplier (chars/min sustained for > 10 seconds)
```
< 45 chars/min   → multiplier = 1.0 (no bonus)
≥ 45 chars/min   → multiplier = 1.2
≥ 60 chars/min   → multiplier = 1.4
≥ 70 chars/min   → multiplier = 1.5
```

### Total XP
```
total_xp = round((base_xp + length_bonus) * speed_multiplier)
```

---

## API Endpoints

| Method | Endpoint              | Description                          |
|--------|-----------------------|--------------------------------------|
| POST   | `/api/prompts`        | Save prompt, calculate XP            |
| GET    | `/api/stats/today`    | Today's words, prompts, XP           |
| GET    | `/api/stats/streak`   | Current streak in days               |
| GET    | `/api/stats/history`  | Time-series data (words/day)         |

---

## Frontend UI

### Writing Area
- Large, distraction-free textarea
- Live metrics bar (updates every second while typing):
  - `Words: 142`  |  `Chars/min: 280`  |  `XP: ~38`
- Timer starts when user types, pauses after 3s of inactivity
- Speed indicator activates after 10s of sustained typing above threshold

### Post-Submit Panel (flash after send)
- XP gained this prompt: `+47 XP (1.4× speed bonus)`
- Today: `Prompts: 12  |  Words: 1,840  |  XP: 620`
- Streak: 🔥 `7 days`
- Level bar: `Level 12 — 4,200 / 5,000 XP`

### Sound Effects
- **Prompt sent**: soft ding
- **Speed multiplier active**: subtle whoosh
- **Streak milestone (7, 30, 100 days)**: fanfare
- **Level up**: distinct chime

---

## Level System

XP thresholds scale exponentially:
```
Level 1:    0 XP
Level 2:    100 XP
Level 3:    250 XP
Level 5:    700 XP
Level 10:   2,500 XP
Level 20:   8,000 XP
Level 50:   50,000 XP
...
formula: threshold(n) = round(100 * (n^1.6))
```

---

## Out of Scope for MVP

- Qualitative AI analysis of prompt content
- Time-series charts/graphs (Phase 2)
- Linguistic analysis (Phase 2)
- User authentication / multi-user (Phase 2)
- OpenClaw UI integration (OpenClaw reads DB directly)
