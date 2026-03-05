# Capture v2 Full Build Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build and deploy Capture v2 with Capture/Agents/Dashboard pages, Linear-first task control, Supabase writing storage, and 30-minute autosave heartbeat.

**Architecture:** Next.js App Router app with server route handlers for Linear and Supabase-backed capture data. Global sticky metrics bar rendered in root layout across all tabs. Capture tab is default and includes live writing telemetry + 24h aggregates + charts. Agents and Dashboard consume Linear APIs and enforce command-center control rules.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, React, Recharts, Supabase JS, plain Linear GraphQL API fetch.

---

### Task 1: Scaffold Next.js App Baseline

**Files:**
- Create: app scaffold files in repository root
- Keep: `docs/plans/*.md`

**Steps:**
1. Initialize Next.js + TS + Tailwind + App Router into repo.
2. Install runtime deps (`recharts`, `@supabase/supabase-js`, `zod`).
3. Create base env template and root config.
4. Verify `npm run lint` and `npm run build` pass.

### Task 2: Define Shared Domain Types and Config

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/config.ts`
- Create: `src/lib/utils.ts`

**Steps:**
1. Add lane/task/phase/approval enums and interfaces.
2. Add static lane map and Linear defaults.
3. Add helper formatters and metrics helpers.

### Task 3: Implement Supabase Capture Data Layer

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/capture-metrics.ts`
- Create: `src/app/api/capture/route.ts`
- Create: `src/app/api/capture/metrics/route.ts`
- Create: `supabase/sql/001_capture_v2_core.sql`

**Steps:**
1. Add client/server helpers for Supabase.
2. Add capture submit endpoint storing `content`, `word_count`, `char_count`, `char_count_no_spaces`, timestamps.
3. Add metrics endpoint returning rolling 24h words + chart points + latest entries.
4. Provide SQL migration for required table.

### Task 4: Implement Linear Data Layer and Task Control APIs

**Files:**
- Create: `src/lib/linear.ts`
- Create: `src/lib/linear-templates.ts`
- Create: `src/app/api/linear/agents/route.ts`
- Create: `src/app/api/linear/tasks/route.ts`
- Create: `src/app/api/linear/tasks/[id]/route.ts`

**Steps:**
1. Implement GraphQL fetch wrapper with API key.
2. Query parent issue and child lane issues.
3. Add task create/update endpoints with phase/blocked/approval fields in description format.
4. Enforce completion gate rules server-side for done transitions.

### Task 5: Build Global UI Shell + Sticky Metrics Bar

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/app-shell.tsx`
- Create: `src/components/sticky-metrics-bar.tsx`
- Create: `src/components/top-nav.tsx`
- Create: `src/components/ui/*` lightweight UI primitives

**Steps:**
1. Build global nav for Capture/Agents/Dashboard.
2. Implement full-width sticky bar visible on all tabs.
3. Show live/rolling/global KPIs from capture metrics API.

### Task 6: Build Capture Page (Default)

**Files:**
- Modify/Create: `src/app/page.tsx` (Capture default)
- Create: `src/components/capture/capture-editor.tsx`
- Create: `src/components/capture/capture-charts.tsx`
- Create: `src/components/capture/today-captures.tsx`

**Steps:**
1. Build writing inbox with submit and live telemetry.
2. Implement live chars/min no-spaces with 10-second sliding window.
3. Show words in current draft and 24h rolling words.
4. Render charts/sections below editor.

### Task 7: Build Agents Page

**Files:**
- Create: `src/app/agents/page.tsx`
- Create: `src/components/agents/agent-list.tsx`
- Create: `src/components/agents/task-control-panel.tsx`
- Create: `src/components/agents/task-payload-form.tsx`

**Steps:**
1. Show lane agents and active tasks from Linear.
2. Add full control panel (create/update phase/approval fields).
3. Enforce phase model and blocked reason enum.

### Task 8: Build Dashboard Page

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/dashboard/status-overview.tsx`
- Create: `src/components/dashboard/blockers-board.tsx`
- Create: `src/components/dashboard/phases-board.tsx`

**Steps:**
1. Aggregate task state across lanes.
2. Show counts by phase and blocked reason.
3. Highlight blockers and missing inputs.

### Task 9: Add Heartbeat Cron for capture Repo

**Files:**
- Use existing script: `/Users/_xvadur/.openclaw/workspace/systems/local-scripts/install_git_heartbeat_cron.sh`

**Steps:**
1. Install 30-minute autosave cron for `/Users/_xvadur/Documents/capture`.
2. Verify cron entry exists.
3. Run one manual autosave snapshot.

### Task 10: Configure Cloudflare and Deploy

**Files:**
- Create: `wrangler.toml`
- Create: `.env.example`
- Modify: README deploy section

**Steps:**
1. Read credentials from `/Users/_xvadur/.openclaw/credentials` and set env for deploy.
2. Build production output.
3. Create/deploy Cloudflare Pages project for `capture`.
4. Report final URL and deployment command set.

### Task 11: Verification, Commit, and Push

**Files:**
- Modify: README and docs with run instructions

**Steps:**
1. Run `npm run lint` and `npm run build` with passing output.
2. Verify critical UI routes and API responses.
3. Commit/push all capture repo changes.
4. Summarize status and next morning checklist.
