# Arkhe AgentOS — Manual Tester Script (Premium Pre-Alpha)

Use this script on a **relatively clean Mac** (fresh user account or cleared `~/.arkhe`) to validate the pre-alpha ship gate. Record frictions in `docs/QA_FRICTIONS.md`.

**Time:** ~20–30 minutes for the full pass.

---

## 0. Prerequisites (developer setup only)

Skip if testing a packaged DMG from `pnpm package:app`.

```bash
# From repo root
pnpm install
cp .env.example .env   # optional: Supabase + cloud keys
pnpm bundle:daemon     # required before testing bundled app
```

Optional env for smoother QA (daemon host, not the Swift app):

```bash
ARKHE_AUTO_APPROVE=1
ARKHE_LOCAL_MODELS=1
OLLAMA_HOST=http://127.0.0.1:11434
```

Install **Ollama** and pull a model (`qwen3:8b` or similar) before onboarding — Layer 2 is required.

---

## 1. Daemon launch & first connect

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1.1 | Launch **Arkhe AgentOS** (Xcode Run or packaged `.app`) | App opens without crash |
| 1.2 | Observe **System Status** strip / onboarding | Daemon connects to `ws://127.0.0.1:9470` or shows actionable launch error |
| 1.3 | If dev: run `ARKHE_AUTO_APPROVE=1 pnpm dev:daemon` or `pnpm start:alpha` | Status moves to connected; no persistent red banner |
| 1.4 | Bundled app only: confirm **DaemonLauncher** outcome in onboarding | Message is clear (Node/Playwright found or recovery hint) |

**Friction log:** daemon timeout, missing bundled Node, Playwright not found.

---

## 2. Onboarding checklist

| Step | Action | Pass criteria |
|------|--------|---------------|
| 2.1 | Complete **Welcome / model readiness** checklist | Each row shows green or honest optional/fallback state |
| 2.2 | Verify **Ollama** row | Green when Ollama is running; otherwise clear remediation text |
| 2.3 | Verify **YouTube API key** row | Optional for audit missions; configure in Settings if testing Attention Cortex |
| 2.4 | Verify **Playwright / browser** row | Green or warning with hint — not a silent failure |
| 2.5 | Tap **Enter Mission Control** when allowed | No red error states on first main window |

**Friction log:** confusing optional vs required, misleading greens, blocked continue button.

---

## 3. Core mission — website audit

| Step | Action | Pass criteria |
|------|--------|---------------|
| 3.1 | Open **Residents** → wake **Research Agent** (or equivalent expert) | Expert shows active / warm state |
| 3.2 | Mission Control: run typed or voice command | *"Director, audit my website at arkhe.com"* |
| 3.3 | Handle **approval** when prompted (or auto if `ARKHE_AUTO_APPROVE=1`) | Approval banner/modal is clear; mission continues |
| 3.4 | Watch **event stream** / mission card | `mission.created`, `browser.*`, `agent.*` events appear |
| 3.5 | Open **Observatory** | Active AI resources / model routes visible |

**Friction log:** mission hang, approval stuck, empty event stream.

---

## 4. Browser & artifacts

| Step | Action | Pass criteria |
|------|--------|---------------|
| 4.1 | Open **Browser** tab / live preview | Captured page or artifact preview loads |
| 4.2 | Confirm artifact on disk (optional) | `~/.arkhe/artifacts/<missionId>/` contains screenshot or DOM snapshot |

---

## 5. Replay & compliance export (smoke)

| Step | Action | Pass criteria |
|------|--------|---------------|
| 5.1 | **Missions** → select completed mission → **Replay** | Timeline loads with steps |
| 5.2 | Toggle **Educational** narration | Step narration text appears |
| 5.3 | **Export JSON** | Save panel writes valid JSON |
| 5.4 | **Export Compliance Package** | ZIP saves; contains `mission-events.json`, `forensics-evidence.json`, `README.txt` |
| 5.5 | **Export PDF Summary** (if present) | PDF opens with mission summary and key steps |
| 5.6 | Unzip compliance package | `artifacts/` folder present when browser step ran |

**Friction log:** empty replay, ZIP error, missing README.

---

## 6. Attention Cortex scan (smoke)

| Step | Action | Pass criteria |
|------|--------|---------------|
| 6.1 | **AgentOS** menu → **Scan for Attention Opportunities** (or ⌘⇧A / Command Palette) | Scan triggers without crash |
| 6.2 | Watch Mission Control / events | `attention.scan.*`, `trend.detected`, or graceful fallback message |
| 6.3 | Settings → **Attention Cortex / YouTube** | Save API key smoke (optional); status dot updates |

**Friction log:** scan silent failure, cryptic API errors.

---

## 7. Memory, mesh & safety

| Step | Action | Pass criteria |
|------|--------|---------------|
| 7.1 | **Memory** → Ark Vault search `"audit"` | Results or clean empty state |
| 7.2 | **Residents** → Neural Mesh section | Synapse list or proposals visible after multi-agent mission |
| 7.3 | **Settings** → **Kill Switch** | Daemon stops missions gracefully; app remains usable |

---

## 8. Support & privacy (GTM smoke)

| Step | Action | Pass criteria |
|------|--------|---------------|
| 8.1 | **Settings** → **Support & Feedback** | Mail or issues link opens |
| 8.2 | **Settings** → **Privacy Policy** link | Opens `docs/PRIVACY.md` content or bundled policy URL |

---

## 9. Automated QA (same machine)

With daemon running:

```bash
pnpm build
pnpm qa:alpha
```

Dev loop from repo root:

```bash
pnpm start:alpha   # starts daemon + watchers
# separate terminal:
pnpm qa:alpha
```

macOS build:

```bash
cd apps/macos && xcodegen && xcodebuild -scheme ArkheAgentOS -configuration Debug build
```

**Pass:** `pnpm build` exit 0, `pnpm qa:alpha` exit 0, `** BUILD SUCCEEDED **`.

---

## 10. Session soak (optional)

Run one realistic 20–30 minute session (audit + attention scan + memory browse).

**Watch for:** memory growth in Activity Monitor, reconnect failures after daemon restart, UI jank.

---

## Sign-off

| Gate | Status | Date | Tester |
|------|--------|------|--------|
| Onboarding clean | ☐ | | |
| Audit mission E2E | ☐ | | |
| Compliance ZIP export | ☐ | | |
| Attention scan smoke | ☐ | | |
| `pnpm qa:alpha` | ☐ | | |
| `xcodebuild Debug` | ☐ | | |

Log all frictions in `docs/QA_FRICTIONS.md` and update `docs/PREMIUM_CHECKLIST.md`.
