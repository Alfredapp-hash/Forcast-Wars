# Arkhe AgentOS — Privacy Policy (Pre-Alpha)

**Last updated:** 2026-06-07  
**Applies to:** Arkhe AgentOS private alpha (macOS app + local daemon)

This document describes what data Arkhe stores, where it lives, and what may leave your machine. It is a pre-alpha policy — not legal advice. A formal Terms of Service and production privacy policy will follow before public release.

---

## Summary

- **Local-first:** Missions, events, artifacts, and most memory live on your Mac under `~/.arkhe`.
- **You control cloud:** Supabase sync and paid cloud models are optional and require explicit daemon configuration.
- **No silent telemetry:** The app does not send usage analytics unless you opt in to a future telemetry feature (not enabled in alpha).
- **Browser automation:** Playwright may fetch pages you direct agents to visit; captured artifacts stay local unless you export or sync them.
- **API keys:** Attention Cortex keys (YouTube, X, etc.) are stored locally in `~/.arkhe/attention-config.json` on the daemon host.

---

## Data stored locally

| Location | Contents |
|----------|----------|
| `~/.arkhe/events.json` | Append-only mission and agent event log |
| `~/.arkhe/artifacts/<missionId>/` | Browser screenshots, DOM snapshots, exports |
| `~/.arkhe/MEMORIES.md` | Human-editable L1 memory |
| `~/.arkhe/daemon.env` | Daemon secrets (Supabase service key, cloud keys) — **never in the app bundle** |
| `~/.arkhe/attention-config.json` | Attention Cortex API keys and poll settings |

The macOS app reads local replay data and artifacts for Mission Control, Replay, Forensics, and exports. It does not embed your service-role Supabase secret.

---

## Data that may leave your machine

### Supabase sync (optional)

When `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are configured in `.env` or `~/.arkhe/daemon.env`, the daemon may sync:

- Agent registry and resident state
- Episodic memories and embeddings (Ark Vault)
- Neural mesh synapse weights (`agent_synapses`)

Sync uses your configured Supabase project. Without secrets, sync is disabled and the app continues in local-only mode.

### Cloud model providers (optional)

If you enable **paid cloud escalation** in Settings and configure provider keys on the daemon, mission prompts and context needed for inference may be sent to those providers. Budget caps and approval gates apply before high-risk actions.

### Browser automation (Playwright)

When a mission navigates to a URL, Playwright loads that page like a browser. Page content may be summarized or stored as local artifacts. Arkhe does not operate a central browsing proxy in alpha.

### Attention Cortex integrations

With API keys configured, the daemon may call:

- **YouTube Data API** — trend search queries you configure
- **X API** — recent search queries you configure
- Future: video generation and upload endpoints (scaffold / planned)

Requests use your keys; responses inform local opportunity scoring and content pipelines.

---

## What we do not collect (alpha)

- No automatic upload of mission transcripts, vault memories, or artifacts to Arkhe-operated servers.
- No crash or usage telemetry pipeline in the current alpha build.
- No continuous microphone recording — voice uses Apple Speech on-device for command recognition; audio is not retained by Arkhe after transcription unless logged locally as a `voice.command` event.

---

## Exports you initiate

Replay **Export JSON**, **Compliance ZIP**, and **PDF Summary** write files you choose via the save panel. You are responsible for where those files are shared.

---

## Your controls

- **Kill Switch** (Settings): Stops active daemon missions.
- **Approvals:** Orange/red tool actions require explicit approval unless `ARKHE_AUTO_APPROVE=1` is set on the daemon (dev/QA only).
- **Cloud gates:** Disable paid cloud escalation in Settings.
- **Remove local data:** Quit the app and delete `~/.arkhe` to clear local state (back up first if needed).

---

## Bundled components

The packaged app may include portable **Node.js** and **Playwright** for the local daemon. Their licenses and security models apply to browser automation subprocesses. See project `docs/PACKAGING.md` for versions and update path.

---

## Contact

Questions or privacy requests: **support@arkhe.com** (or use **Send Feedback** in Settings).

Override contact URLs at build/run time with environment variables:

- `ARKHE_SUPPORT_EMAIL`
- `ARKHE_FEEDBACK_URL`
- `ARKHE_PRIVACY_URL`

---

## Changes

This policy will be updated as Premium & Go features ship (telemetry opt-in, notarization, auto-update). Check the in-app Settings link or this file in the repository for the latest version.
