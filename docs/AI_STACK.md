# Arkhe AI Stack

Arkhe routes every request to the **cheapest model that can successfully complete the task**. No single model does everything.

## Layer 1 — Local First (Free Runtime)

**Apple Foundation Models**

| Use case | Examples |
|----------|----------|
| Voice & UI | Commands, quick responses, UI assistance |
| Light tasks | Classification, form summarization, CRM notes, email drafts |

- **Cost:** $0 per request
- **Runs on:** User's Mac
- **Enable:** `ARKHE_APPLE_FOUNDATION_MODELS=1`

## Layer 2 — Local Heavy Model

**Ollama** — Qwen 3, DeepSeek-R1, Llama, Mistral Small

| Use case | Examples |
|----------|----------|
| Reasoning | Multi-step research, agent planning, workflow creation |
| Content | Draft reports, extract facts, SEO analysis |

- **Cost:** $0 after hardware
- **Enable:** Install Ollama; set `ARKHE_OLLAMA_MODEL` (default `qwen3:8b`)
- **M3 Pro:** Comfortable with 7B–14B; some larger quantized models

## Layer 3 — Persistent Specialist Agents

Dormant experts activated on demand (not rebuilt per request):

| Agent | Preferred model | Specialty |
|-------|-----------------|-----------|
| Scheduler Agent | Apple FM | Calendar, reminders |
| SEO Agent | Ollama Qwen3 | Technical SEO |
| CRM Agent | Apple FM | CRM notes, pipeline |
| Research Agent | Ollama DeepSeek-R1 | Competitive intel |
| Coding Agent | Cloud GPT-4.1 | Code gen & review |
| Ark Vault Agent | Ollama Llama | Memory & knowledge |
| Marketing Agent | Ollama Mistral | Brand voice, copy |
| Browser Agent | Ollama + Playwright | Evidence capture |
| Report Agent | Ollama Mistral | Draft & publish |

Implementation: `packages/orchestrator/src/agent-registry.ts`

## Layer 4 — Premium Cloud Escalation

Only when local confidence is low or task requires it.

```
Can Apple do it?     → YES → Layer 1
Can Ollama do it?    → YES → Layer 2
Activate specialist? → YES → Layer 3 (local preferred model)
Need cloud?          → YES → Layer 4
```

| Trigger | Cloud model |
|---------|-------------|
| Coding | `ARKHE_OPENAI_CODING_MODEL` (default gpt-4.1) |
| Deep reasoning | `ARKHE_OPENAI_MODEL` (default gpt-4.1-mini) |

- **Enable:** `ARKHE_PAID_CLOUD=1` + `ARKHE_OPENAI_API_KEY`

## Decision tree (code)

Implemented in `packages/model-router/src/stack.ts` → `planStackRoute()`.

## AI Resource Manager

macOS Activity Monitor for AI — Observatory tab shows per agent:

- Current model & layer
- CPU % / RAM (estimated)
- Tokens used & cost today
- Latency & confidence
- Network activity

Events: `telemetry.agent.sample` every 5s from `apps/local-daemon/src/telemetry/ai-resource-manager.ts`.

## Agent memory (Supabase)

Models stay stateless; agents appear persistent via Supabase:

- `agents` — resident expert registry
- `agent_memories` — per-agent recall
- `tasks` / `workflows` — mission state
- `knowledge_base` / `conversation_history` — vault

Schema stub: `infra/supabase/schema.sql`  
**Live project:** [Ark-playground](https://deoyyzrzoacyjeozwvek.supabase.co) (`deoyyzrzoacyjeozwvek`)

## Environment variables

| Variable | Purpose |
|----------|---------|
| `ARKHE_APPLE_FOUNDATION_MODELS=1` | Layer 1 (via macOS app WebSocket bridge) |
| `ARKHE_LOCAL_MODELS=1` | Layer 2 (default on) |
| `OLLAMA_HOST` | Ollama URL |
| `ARKHE_OLLAMA_MODEL` | Default Ollama model |
| `ARKHE_PAID_CLOUD=1` | Allow Layer 4 |
| `ARKHE_OPENAI_API_KEY` | OpenAI escalation |
| `ARKHE_OPENAI_MODEL` | General cloud model |
| `ARKHE_OPENAI_CODING_MODEL` | Coding cloud model |
| `SUPABASE_URL` | Supabase project URL (daemon sync) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (daemon only, never in app) |
| `ARKHE_WORKSPACE_ID` | Optional workspace scope for sync |

## Development vs runtime

| Context | Stack |
|---------|-------|
| **Customer runtime** | Apple → Ollama → OpenAI fallback |
| **Building Arkhe** | Cursor + Claude for large codegen + Copilot backup |
