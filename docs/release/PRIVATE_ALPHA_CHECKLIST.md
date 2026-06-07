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

## Alpha Scope

- Voice/typed commands route through Director.
- Persistent resident agents activate on demand.
- Model router uses Apple FM bridge, Ollama, specialists, and cloud gates.
- Mission Control, Residents, Observatory, Approvals, Replay, Memory, and Browser are wired.
- Supabase Ark-playground stores agents and episodic memories.
- Local daemon can be bundled into the macOS app Resources with Node.

## Safety Defaults

- No destructive tools enabled.
- Orange/red actions require approval in Tool Gateway.
- Paid model usage is blocked unless `paidCloudEnabled` is set through Settings and cloud keys exist.
- Service secret stays in `.env` or `~/.arkhe/daemon.env`, never in the Swift app.
- Continuous recording is out of scope for private alpha.

## Tester Script

1. Launch the app.
2. Complete onboarding checks.
3. Open Residents and wake Research Agent.
4. Run: “Director, audit my website at arkhe.com”.
5. Approve publish when prompted.
6. Open Observatory and verify active AI resources.
7. Open Browser and inspect the captured page.
8. Open Missions → Replay.
9. Open Memory → Ark Vault and search “audit”.
10. Export audit JSON.
