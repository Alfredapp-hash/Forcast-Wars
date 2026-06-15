# Forecast Wars Migration Map

> Phase 0 deliverable. Status: **ACTIVE** — `apps/web` Media Engine is **FROZEN**.

## Product Split

| Surface | Path | Audience | Status |
|---------|------|----------|--------|
| Forecast Wars | `apps/forecast-wars` | Public | **ACTIVE** |
| Arkhe AgentOS | `apps/macos/ArkheAgentOS` | Founder console (private) | **ACTIVE** |
| Legacy web | `apps/web` | Internal legacy | **FROZEN** |

## Keep and Extend

| Module | Path | Forecast Wars Use |
|--------|------|-------------------|
| Hermes gateway/router | `apps/hermes/src/services/` | Debate turn routing, content jobs, resolution |
| Director + mission DAG | `packages/orchestrator/src/director.ts` | `debate` mission template |
| Agent registry | `packages/orchestrator/src/agent-registry.ts` | `forecast` cortex + debate agents |
| Mission executor | `packages/orchestrator/src/mission-executor.ts` | Round execution pipeline |
| Model router | `packages/model-router/` | Cheap vs premium task routing |
| Approval gate | `apps/local-daemon/src/approvals/gate.ts` | Human review gates |
| Event contracts | `packages/contracts/src/events.ts` | `DebateEvent` family |
| Synapse engine | `packages/orchestrator/src/synapse-engine.ts` | Agent rivalry edges |
| Memory | `packages/memory/` | Persistent agent memory |
| Supabase sync | `packages/supabase-sync/` | Agent + debate state sync |

## Reframe

| Old | New |
|-----|-----|
| Media Engine approval pipeline | `content_jobs` + FW `/admin/content` |
| `GuardrailReport` | `evidence_items.verified_status` |
| `ready_for_brian` | `awaiting_review` |
| Agent DNA helix | Arena ring (FW) + Constellation (macOS) |
| Hermes approvals | Unified content + resolution queue |

## Isolate — Do Not Port

| Module | Path | Action |
|--------|------|--------|
| Media Engine | `apps/web/app/media-engine/` | **FROZEN** |
| Media Engine schema | `apps/web/supabase/migrations/20260614_media_engine.sql` | **FROZEN** |
| Attention Cortex | `apps/local-daemon/src/attention/` | Disabled from active paths |
| Documentary pipeline | `apps/local-daemon/src/documentary/` | Archived |
| Legal prompts | `apps/web/lib/media-engine/prompts.ts` | Do not reuse |

## New Modules

| Module | Path |
|--------|------|
| Forecast Wars app | `apps/forecast-wars/` |
| Debate orchestrator | `apps/local-daemon/src/forecast-wars/` |
| FW schema | `infra/supabase/migrations/20260615_forecast_wars.sql` |
| Debate events | `packages/contracts/src/events.ts` (extended) |
