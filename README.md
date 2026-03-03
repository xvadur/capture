# Capture v2

Capture v2 is the new active build for writing capture + agent operations.

## Product v0 scope
- `Capture` tab (default): writing inbox with live metrics
- `Agents` tab: lane agents + active tasks + states
- `Dashboard` tab: cross-lane status, blockers, phases

## Core decisions (locked)
- Source of truth for tasks: Linear (Linear-first)
- Orchestration owner: `#command-center` / `agent_orchestrator`
- Phase model: `queued -> in_progress -> blocked -> done`
- `done` can be closed only by command-center
- `done` requires DoD checklist complete + at least 1 evidence item
- Blocked escalation: >30 min => escalate to command-center

## Repos map
- runtime: `xvadur/chat`
- landing: `xvadur/Jozef`
- active capture: `xvadur/capture`
- legacy capture poc: `xvadur/capturePOC`
