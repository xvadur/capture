# Capture v2

Capture v2 is the active workspace for writing + agent execution.

## What is included
- `Capture` tab (default): inbox + live typing telemetry + 24h metrics
- `Agents` tab: lane agents, task payload creation, command-center control panel
- `Dashboard` tab: phase distribution, blockers, escalation view
- Global sticky metrics bar across all tabs

## Core control rules
- Source of truth for tasks: Linear
- Phase model: `queued -> in_progress -> blocked -> done`
- `blocked` requires `blocked_reason` (`human|dependency|data|tech|approval`)
- `done` gate requires:
  - complete DoD checklist (`- [x]` lines)
  - at least 1 Evidence item
  - approved status when `approval_required = true`

## Local setup
1. Install deps:
```bash
npm install
```

2. Create env file:
```bash
cp .env.example .env.local
```

3. Fill `.env.local`:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_KEY`
- `LINEAR_API_KEY`
- `LINEAR_DEFAULT_TEAM`

4. Run dev:
```bash
npm run dev
```

## Supabase SQL
Run:
- `supabase/sql/001_capture_v2_core.sql`
- `supabase/sql/002_capture_v2_linguistic_metrics.sql`

Table created:
- `public.capture_entries`
- `public.capture_daily_metrics`

## Verification commands
```bash
npm run lint
npm run build
```

## Cloudflare deployment (Workers via OpenNext)
1. Add Cloudflare envs in shell:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

2. Build worker bundle:
```bash
npm run build:cf
```

3. Deploy:
```bash
npm run deploy:cf
```

Wrangler config:
- `wrangler.toml`

## Repo map
- runtime: `xvadur/chat`
- landing: `xvadur/Jozef`
- active capture: `xvadur/capture`
- legacy capture POC: `xvadur/capturePOC`
