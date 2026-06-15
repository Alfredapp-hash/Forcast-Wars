# Arkhe AgentOS Private Alpha Checklist

## Install

1. Install Xcode, XcodeGen, Node 22+, pnpm, and optionally Ollama.
2. Copy `.env.example` to `.env` and keep secrets local.
3. Run `pnpm install`.
4. Run `pnpm start:alpha` for the dev loop.
5. Run `pnpm bundle:daemon` before testing the bundled macOS app.

## Required Environment

```bash
SUPABASE_URL=https://deoyyzrzoacyjeozwvek.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_pncUT-hVFXTgt063uBeZZA_RTUOGt4F
SUPABASE_SECRET_KEY=...
ARKHE_WORKSPACE_ID=ark-playground
ARKHE_AUTO_APPROVE=1
ARKHE_LOCAL_MODELS=1
```

Optional:

```bash
ARKHE_APPLE_FOUNDATION_MODELS=1
OLLAMA_HOST=http://127.0.0.1:11434
ARKHE_OLLAMA_MODEL=qwen3:8b
ARKHE_EMBED_MODEL=nomic-embed-text
```

## Smoke And QA

With the daemon running:

```bash
pnpm smoke:daemon
pnpm qa:alpha
```

Expected:

- Mission, model-route, agent, browser, approval, and completion events appear.
- Residents can wake/sleep and sync to Supabase.
- Ark Vault search returns Supabase memories or falls back cleanly.
- Runtime settings return budget/cloud gates.

## Alpha Scope (Baseline — now complete)

- Voice/typed commands route through Director.
- Persistent resident agents (with cortices) activate on demand; Core Cortex (Director, Security, Voice, Observability, Ark Vault) starts warm.
- 4-layer model router (Apple FM bridge, Ollama, specialists, cloud gates) with full telemetry.
- Neural Agent Layer / Arkhe Neural Mesh: SynapseEngine produces weighted, replayable `synapse.*` events; `agent_synapses` persisted to Supabase.
- Memory stack complete for alpha (L1 editable `MEMORIES.md` + reflections, L2/L3 pgvector activation ranking, Dreaming service).
- Mission Control, Residents (with Neural Mesh list + proposals), Observatory (AI Resource Manager), Approvals (banner + list), Replay (events + screenshots), Memory (local + Ark Vault + human), Browser (artifacts + live WKWebView preview), Agents, Missions, Settings all wired.
- Supabase Ark-playground stores agents, episodic memories, and agent synapses.
- Local daemon bundles into the macOS app (portable Node + pnpm deploy) and `pnpm package:app` produces a DMG.

See `docs/PREMIUM_CHECKLIST.md` for the full plan to take this to Premium & Go (interactive DNA visualization, live dual-mode Agent Browser, rich Replay exports, automated notarization, polish, distribution, etc.).

## Safety Defaults

- No destructive tools enabled.
- Orange/red actions require approval in Tool Gateway.
- Paid model usage is blocked unless `paidCloudEnabled` is set through Settings and cloud keys exist.
- Service secret stays in `.env` or `~/.arkhe/daemon.env`, never in the Swift app.
- Continuous recording is out of scope for private alpha.

## Tester Script

Full premium pre-alpha script: **`docs/MANUAL_TESTER_SCRIPT.md`** (daemon launch, onboarding, compliance ZIP, attention scan, support/privacy smoke).

Quick pass:

1. Launch the app (bundled: `pnpm bundle:daemon` first; dev: `pnpm start:alpha` or `ARKHE_AUTO_APPROVE=1 pnpm dev:daemon`).
2. Complete onboarding checks (Ollama + Playwright required; YouTube optional).
3. Open Residents and wake Research Agent.
4. Run: “Director, audit my website at arkhe.com”.
5. Approve publish when prompted.
6. Open Observatory and verify active AI resources.
7. Open Browser and inspect the captured page.
8. Open Missions → Replay → Export Compliance Package + PDF Summary.
9. AgentOS menu → Scan for Attention Opportunities.
10. Open Memory → Ark Vault and search “audit”.
11. Settings → Send Feedback + Privacy Policy links.
12. Kill switch smoke.
