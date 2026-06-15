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

## Neural Agent Layer — Arkhe Neural Mesh

Arkhe resident agents are not disposable workers. They are persistent neurons connected by replayable, weighted synapses.

Runtime layers:

1. **Voice Layer** — user intent and conversational control
2. **Director Layer** — mission planning and orchestration
3. **Agent Runtime** — resident and mission agents
4. **Tool Layer** — browser, MCP, files, APIs
5. **Memory Layer** — `MEMORIES.md`, pgvector recall, activation ranking, dreaming
6. **Neural Agent Layer** — learned agent-to-agent relationships
7. **Security Layer** — approval gates and permission envelopes
8. **Observability Layer** — telemetry, replay, cost, and health

### Agent Synapses

Agents do not directly call each other. Collaboration flows through the Synapse Engine:

```
SEO Agent -> Agent Synapse -> Content Agent
```

Every synapse is:

- Logged as a `synapse.*` event
- Inspectable in Mission Control / Residents
- Replayable through mission history
- Persisted to Supabase as `agent_synapses`
- Strengthened or weakened based on collaboration outcomes

### Cortices

Resident agents are grouped into cortices:

| Cortex | Agents |
|--------|--------|
| Core Cortex | Director, Ark Vault, Security, Voice, Observability |
| Business Cortex | CRM, SEO, Report (general business) |
| Personal Cortex | Scheduler, Email, Browser, Research |
| Development Cortex | Coding, QA, Architecture |
| **Attention Cortex** (Autonomous Media Company) | Trend Intelligence, Opportunity, Content, Video Production (Veo/Runway/Kling/Hailuo), YouTube, Marketing, Analytics, Dreaming (Media) |

**Attention Cortex** is the closed-loop system that wakes up, finds attention opportunities, manufactures valuable + meta content, produces video, publishes, measures, dreams on the results, and evolves the Neural Mesh. It turns Arkhe from "voice assistant for agents" into a self-improving media company inside the OS. 80% valuable content (AI news, productivity, SaaS, marketing) + 20% "how the system made this" meta storytelling creates a powerful flywheel.

Core Cortex agents are always warm. Other cortices wake on demand.

### Dynamic Synapse Strength

The Neural Mesh learns collaboration patterns:

```
SEO Agent <-> Content Agent      weight 0.92
Content Agent <-> Social Agent   weight 0.88
SEO Agent <-> Scheduler Agent    weight 0.07
```

Weights combine message traffic, mission success, failure penalties, and trust thresholds. Strong trusted synapses can later influence agent planning: "when SEO wakes, Content usually wakes too."

### Agent Evolution

When repeated successful collaboration crosses a threshold, Arkhe proposes emergent experts:

```
SEO Agent + Content Agent -> SEO Strategy Agent
Coding Agent + QA Agent   -> Release Engineering Agent
Trend Intelligence + Opportunity + Video Prod -> Viral Content Strategist
```

The system proposes these agents; the user approves installation.

### Attention Cortex — Autonomous Media Company (the bigger opportunity)

Instead of agents that merely "market the product," the Attention Cortex learns what captures attention and then manufactures it at scale.

Daily autonomous loop (or voice-triggered "Director, scan for attention opportunities today"):

1. **Trend Intelligence Agent** watches YouTube/Shorts/TikTok/X/Reddit/Google Trends/Search Console for velocity, keyword growth, engagement rate, competition.
2. **Opportunity Agent** scores and ranks (e.g. +400% search growth + low competition = 92 score). Only winners advance.
3. **Content Agent** produces hook, script, storyboard, CTA, description, hashtags (80% high-value: AI tools, productivity, SaaS insights; 20% meta: "How Alfred spotted this trend and made the video").
4. **Video Production Agent** calls the right model: Veo (best realism/story), Runway (production/iteration), Kling (fast social ROI), Hailuo (character consistency). Adds voiceover, captions, motion graphics, sound design.
5. **YouTube Agent** handles upload, metadata, chapters, thumbnail, scheduling, Shorts cross-post.
6. **Marketing Agent** amplifies: X/LinkedIn/Reddit/blog/email strategies derived from real performance.
7. **Analytics Agent** ingests views/CTR/watch-time/retention/sub deltas and feeds the loop.
8. **Dreaming Agent (Media)** reflects every night (or on demand): "Why did this work? Why did that fail?" Writes to `MEMORIES.md`, stores high-importance neural memories, and calls back into the SynapseEngine to strengthen/weaken attention-cortex relationships. This is what enables true evolution of better content creators over time.

All collaboration happens through the Synapse Engine (`agent.message` + mission outcome → `synapse.strengthened` etc.). Performance data becomes first-class training signal for the Neural Mesh.

Video model policy (do not default to Grok for generation):
- Ideation/scripting: Grok / strong local model
- Actual video: Veo (top tier realism), Runway (pipeline), Kling (value), Hailuo (stylized/characters)

### Attention Cortex Adapters (attn-big scaffolding)

Clean adapter interfaces live under `apps/local-daemon/src/attention/adapters/`:

- `TrendSource` — `poll(): Promise<TrendSignal[]>` (YouTubeTrendsAdapter, XTrendsAdapter, ...)
- `VideoGenerator` — `generate(params): Promise<VideoAsset>` (KlingVideoGenerator, RunwayVideoGenerator, VeoVideoGenerator, HailuoVideoGenerator; provider recorded in `video.produced`)
- `Publisher` — `publishToYouTube(video, metadata): Promise<PublishResult>`
- `AnalyticsIngestor` — `fetchPerformance(externalId): Promise<MediaPerformance>`

**Current status (Tier 2 — Attention Cortex goes real)**:
- **YouTube trends** — live when `YOUTUBE_API_KEY` is set (`YouTubeTrendsAdapter`: Data API v3 `search` + `videos.list`; curated fallback on miss/fail).
- **X trends** — live when `X_BEARER_TOKEN` is set (`XTrendsAdapter`: API v2 `tweets/search/recent` + `public_metrics` heuristics; curated fallback on miss/fail).
- **Video** — `KlingVideoGenerator` + `RunwayVideoGenerator` issue real create-task HTTP calls when `KLING_API_KEY` / `RUNWAY_API_KEY` are set; `VeoVideoGenerator` + `HailuoVideoGenerator` remain stubbed.
- **YouTube publish** — OAuth scaffold: refresh access token (`YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET` + `YOUTUBE_REFRESH_TOKEN`), validate via `channels.list`, return scaffold upload URL (no `videos.insert` yet).
- **Analytics** — still stubbed.

Flip to the adapter path with `attention.scan({ realSources: true })` (or via the autonomous scheduler). The core `AttentionOrchestrator` has zero knowledge of specific SDKs — just calls the injected/picked adapter.

**Settings UI**: macOS **Settings → Attention Cortex / YouTube** saves `youtubeApiKey`, `youtubeRefreshToken`, and `youtubeTrendQuery`; **Attention Cortex / X** saves `xBearerToken` and `xTrendQuery` — all to `~/.arkhe/attention-config.json` via daemon IPC. On boot the daemon loads that file and applies values to `process.env` (overriding `.env` when present). The UI never receives or stores full secrets — only masked prefix/suffix for status. Poll status (`lastPollAt`/`lastPollOk` for YouTube, `xLastPollAt`/`xLastPollOk` for X) is recorded after each adapter poll.

**Env vars for real providers (documented in .env.example)**:
- `YOUTUBE_API_KEY` (trends — **live**)
- `YOUTUBE_TREND_QUERY` (optional, default `AI agents automation`)
- `X_BEARER_TOKEN` (trends — **live**)
- `X_TREND_QUERY` (optional recent-search query)
- `KLING_API_KEY` (video create-task — **live**), `RUNWAY_API_KEY` (video create-task — **live**)
- `GOOGLE_GENAI_API_KEY` or `VEO_API_KEY` (stub), `HAILUO_API_KEY` or `MINIMAX_API_KEY` (stub)
- `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` (publish OAuth scaffold — **live refresh + validation**)
- `ARKHE_ATTENTION_SCAN_INTERVAL_MS` (default 4h; autonomous scheduler in daemon index)

The 80/20 rule and full event chain (`attention.*`, `trend.*`, `opportunity.*`, `content.*`, `video.*`, `analytics.media.*`) remain unchanged so UI, dreaming (media), and synapses continue to work.

This architecture sits on the Neural Agent Layer and uses the existing DNI memory stack + DreamingService.

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
- `agent_synapses` — weighted agent relationships for Arkhe Neural Mesh
- `tasks` / `workflows` — mission state
- `knowledge_base` / `conversation_history` — vault
- `media_trends`, `media_opportunities`, `media_content`, `media_videos`, `media_performances`, `media_reflections` — Attention Cortex persistent state (future tables; currently lean on `agent_memories` + events)

See `docs/PREMIUM_CHECKLIST.md` for the full Premium & Go plan (interactive DNA visualization, live synapses in Mission Control, **Attention Cortex / Autonomous Media Company**, video production, 80/20 content flywheel, etc.).

Schema: `infra/supabase/schema.sql`  
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
|| `ARKHE_ATTENTION_SCAN_INTERVAL_MS` | Autonomous Attention Cortex scan interval (default ~4h) |
|| `YOUTUBE_API_KEY` / provider keys | For real adapter implementations (adapters/*.ts + .env.example) | |

## Development vs runtime

| Context | Stack |
|---------|-------|
| **Customer runtime** | Apple → Ollama → OpenAI fallback |
| **Building Arkhe** | Cursor + Claude for large codegen + Copilot backup |
