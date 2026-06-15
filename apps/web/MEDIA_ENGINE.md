# Arkhe Media Engine — FROZEN

> **Status: FROZEN** — No new development. Content approval patterns reframed for Forecast Wars (`apps/forecast-wars`).

**The Arkhe Project — Autonomous creation. Manual publication.**

Ark is the AI production staff. Brian is the editor-in-chief, publisher, and final approval authority.

---

## Core Production Rule

> Ark gets freedom to think, research, pitch, write, and produce.  
> Brian keeps publishing authority.  
> The system never auto-posts. Ever.

---

## Channels

| Channel | Purpose |
|---|---|
| **Ark Legal Signal** | Legal education based on current legal news. Never decides guilt, liability, or case outcomes. Only explains legal standards, procedure, and concepts. |
| **AgentOS Journey** | Documents Ark's development, costs, revenue, and progress toward financial self-sustainability. |

---

## Production Pipeline

```
Discovered → Selected → Drafting → Guardrail Review → Ready for Brian
    → Revision Requested → Approved → Exported → Posted Manually
```

**The most important status: `Ready for Brian`**  
This is the control gate. Nothing moves past it without your action.

---

## Modules

| Module | Route | Purpose |
|---|---|---|
| Dashboard | `/media-engine` | Pipeline overview + approval queue |
| Trend Scout | `/media-engine/trend-scout` | Enter topics manually |
| Ready for Brian | `/media-engine/approvals` | Review + approve/reject packages |
| Export Center | `/media-engine/export` | Get posting package for manual upload |
| Analytics | `/media-engine/analytics` | Enter performance data after you post |
| Mission Log | `/media-engine/mission-log` | Ark writes weekly transparency report |

---

## What Ark Can Do

- Find trends
- Select opportunities
- Create scripts (30s, 60s, 2min, blog)
- Generate thumbnail concepts
- Write captions and hashtags
- Score risk and virality
- Explain its reasoning
- Revise its own work
- Prepare complete upload packages

## What Ark Cannot Do

- Post to YouTube
- Post to TikTok
- Post to Instagram
- Post to X
- Publish a blog post
- Send anything public without approval
- Change channel branding without approval
- Use a person's name in a risky legal/factual way without review

---

## Setup

### 1. Install dependencies
```bash
cd apps/web
pnpm install
```

### 2. Create environment file
```bash
cp .env.example .env.local
# Fill in your Supabase URL, anon key, service key, and OpenAI API key
```

### 3. Run database migration
In Supabase SQL editor, run:
```
supabase/migrations/20260614_media_engine.sql
```

### 4. Start dev server
```bash
pnpm dev --port 3000
```

### 5. Open Media Engine
```
http://localhost:3000/media-engine
```

---

## First Live Test: Appeal Week

**Goal:** Ark finds high-attention legal topics → selects safe appeal-related angles → creates 10 short-form video packages → Brian approves, rejects, or revises each → Brian manually posts approved content → Ark tracks results.

### Appeal Week Checklist

- [ ] Add 10 appeal-related topics via Trend Scout
- [ ] Run legal issue classification on each
- [ ] Generate scripts for each (via API or AI button)
- [ ] Run guardrail check on each package
- [ ] Review all 10 in the Approvals dashboard
- [ ] Approve minimum 3 packages
- [ ] Export each approved package
- [ ] Post manually to YouTube Shorts + TikTok
- [ ] Record post URLs in Manual Posting Tracker
- [ ] Enter analytics at 1h, 24h, and 7d
- [ ] Generate Appeal Week mission log

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `OPENAI_API_KEY` | Yes | OpenAI API key for Ark AI calls |
| `OPENAI_MODEL` | No | Model to use (default: `gpt-4o`) |

---

## AI Prompt Templates

All prompts are in `lib/media-engine/prompts.ts`:

| Function | Purpose |
|---|---|
| `buildScriptGenerationPrompt(topic)` | Full video package generation |
| `buildGuardrailPrompt(topic, scripts)` | Legal safety review |
| `buildClassifierPrompt(title, summary)` | Legal issue classification |
| `buildOpportunitySelectorPrompt(topics)` | Opportunity ranking |
| `buildMissionLogPrompt(data)` | Weekly narrative report |

---

## Ark's Introduction Lines

**Ark Legal Signal:**
> "Hello, I am Ark, an autonomous legal education agent created by The Arkhe Project. I am not here to decide the facts. I am here to explain the legal rule."

**AgentOS Journey:**
> "Hello, I am Ark, an autonomous agent created by The Arkhe Project. I am documenting my journey toward becoming financially self-sustaining."

---

*The Arkhe Project. Autonomous creation. Manual publication.*
