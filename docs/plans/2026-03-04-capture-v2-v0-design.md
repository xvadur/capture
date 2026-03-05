# Capture v2 — v0 Design Lock

Date: 2026-03-04
Status: Approved for implementation

## Tabs
1. Capture (default)
2. Agents
3. Dashboard

## Capture tab requirements
- Global full-width sticky metrics bar (visible on all tabs).
- In capture inbox, show live:
  - chars/min (no spaces), sliding 10s window
  - words in current capture draft
  - words in last 24h (rolling `now-24h`)
- Graphs/analytics section below inbox.

## Agent operations model
- Central control: `agent_orchestrator` in `#command-center`.
- Tasks are assigned as payloads to lane agents.
- Phase model: `queued -> in_progress -> blocked -> done`.
- `blocked` requires reason enum: `human|dependency|data|tech|approval`.
- Phase updates allowed by owner agent + command-center.
- `done` closure allowed only by command-center.

## Completion contract
To mark task `done`:
- `definition_of_done_checklist` complete (markdown checklist)
- minimum 1 evidence item in `Evidence` block

## Escalation and approvals
- If blocked >30 min: auto escalation to command-center.
- High-risk actions require:
  - `approval_required` (bool)
  - `approval_status` (`pending|approved|rejected`)
  - `Approval Log` section in issue description

## Linear-first dashboard integration
- Task truth remains in Linear only.
- Use per-lane templates (8 templates).
- Canonical templates file in runtime repo:
  - `workspace/projects/singularity/ops/LINEAR_TEMPLATES_V0.md`

## Sprint objective (14 days)
- Goal: 10 booked calls
- Source: vetted cold leads
- Channel: email
- CTA: short intro + reservation link
- Follow-ups: D+2, D+5
- Volume: 10 vetted cold emails/day
- ICP: dental clinics
- Onboarding cap: 1 new client/week
- If cap reached: stop booking and move to next week
- Final onboarding GO: Adam only
- Inbound response SLA: <=15 min during 08:00-18:00 CET
- Weekly review: Sunday 18:00 CET
