# Capture V2 - Singularity Delivery OS

Capture V2 extends the existing Prompt Hub into a dual-surface product:
- Prompt Hub (existing XP/prompt/streak workflow)
- Delivery OS (new leads/pipeline/followup/evidence operational layer)

## V2 Overview

### Prompt Hub (preserved)
- Prompt editor and XP scoring
- Daily stats, streak, and history API
- Mission-control UI with sidebar/cards

### Delivery OS (new)
- Pipeline entities: `offers`, `leads`, `conversations`, `pilots`, `followups`, `daily_evidence`
- Blueprint stages: `lead_opened`, `fit_confirmed`, `pilot_proposed`, `pilot_active`, `retained`
- API namespace: `/api/os/*`
- Frontend views: delivery dashboard, leads pipeline, follow-up queue, daily evidence logger

## Tech Stack
- Backend: Express + Supabase JS
- Frontend: React + Vite + Tailwind + Framer Motion
- Tests: Jest + Supertest (server)

## Setup

1. Install root dependencies:

```bash
npm install
```

2. Install server/client dependencies (if needed):

```bash
npm install --prefix server
npm install --prefix client
```

3. Configure environment for server (`server/.env`):

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
PORT=3001
```

4. Apply database SQL in Supabase SQL editor (or migration tooling) in this order:
- `server/src/db/schema.sql`
- `server/src/db/20260304_delivery_os_v2.sql`

5. Run both apps:

```bash
npm run dev
```

- Client: `http://localhost:5173`
- Server: `http://localhost:3001`

## API Surfaces

### Existing
- `POST /api/prompts`
- `GET /api/stats/today`
- `GET /api/stats/streak`
- `GET /api/stats/history`

### New Delivery OS
- `GET /api/os/dashboard`
- `GET|POST|PATCH|DELETE /api/os/leads`
- `PATCH /api/os/leads/:id/stage`
- `GET|POST|PATCH|DELETE /api/os/conversations`
- `PATCH /api/os/conversations/:id/stage`
- `GET|POST|PATCH|DELETE /api/os/followups`
- `GET|POST /api/os/daily-evidence`
- `GET /api/os/meta`

## Tests

Run server tests (includes Delivery OS validation + metrics endpoint coverage):

```bash
npm test --prefix server
```

## Blueprint Mapping (Implemented vs Pending)

### Implemented now
- Pillar 4 (Outreach Engine): leads + conversation tracking with stage transitions
- Pillar 5 (Conversation Engine): next-step/reminder guardrails and follow-up queue
- Pillar 6 (Ops/Reporting Engine): dashboard metrics + today priorities
- Pillar 3 (Content Engine, partial): daily evidence logging endpoint + UI form

### Pending for next iterations
- Pillar 1 (Offer Engine): deeper ROI/offer management UX and pricing layers
- Pillar 2 (Delivery Engine): QA checklist runtime, n8n module orchestration, escalation automations
- Pillar 7 (Learning Loop): objection/error ingestion and automated weekly optimization loops

See [docs/V2_BACKLOG.md](docs/V2_BACKLOG.md) for concrete backlog slices.
