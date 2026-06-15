# QA Frictions — Tier 1 Ship Confidence (2026-06-07)

Logged during Phase 0 gate (`pnpm build`, `pnpm qa:alpha`, `xcodebuild Debug`).

## Fixed in this pass

| Friction | Resolution |
|----------|------------|
| `EmptyStateView.swift` used `.arkheMuted` on `ShapeStyle` | Switched to `Color.arkheMuted` / `Color.arkheInfo` — **BUILD SUCCEEDED** |
| `pnpm qa:alpha` timed out on `approval.granted` + `mission.completed` when daemon lacked `ARKHE_AUTO_APPROVE=1` | `scripts/qa-alpha.mjs` now auto-resolves `approval.requested` via `approval_resolve`; timeout raised to 45s |

## Remaining / environmental

| Friction | Notes |
|----------|-------|
| `pnpm qa:alpha` requires daemon on `ws://127.0.0.1:9470` | Run `ARKHE_AUTO_APPROVE=1 pnpm dev:daemon` or `pnpm start:alpha` first |
| Full audit mission can exceed 30s on cold Playwright + Ollama | 45s timeout helps; cold Mac may still need Ollama running |
| NATS JetStream offline | Expected in alpha — in-process event bus only; `eventBus: degraded` banner is informational |
| Supabase sync disabled without secrets | Onboarding shows configure-in-`~/.arkhe/daemon.env`; not blocking local missions |
| Duplicate `ArkheAgentOS 2.xcodeproj` in `apps/macos` | `xcodebuild` without `-project` fails — use `-project ArkheAgentOS.xcodeproj` or remove stale copy |

## Tier 1 deliverables verified

- Compliance ZIP export from Replay toolbar
- PDF summary export from Replay toolbar (`ReplayPDFExporter`)
- DaemonLauncher launch outcomes surfaced in onboarding + SystemStatusStrip
- Manual tester script: `docs/MANUAL_TESTER_SCRIPT.md` (daemon, onboarding, compliance ZIP, attention scan, support/privacy)
- In-app feedback: Settings + Help menu (`SupportConfig` — mailto, GitHub issues, privacy link)
- Privacy policy: `docs/PRIVACY.md`
- `pnpm build` — pass
- `xcodegen` + `xcodebuild Debug` — **BUILD SUCCEEDED**

## New in Priority A/B pass (2026-06-07)

| Item | Status |
|------|--------|
| `docs/MANUAL_TESTER_SCRIPT.md` | Added — clean-Mac validation with sign-off table |
| Settings **Support & Feedback** section | Shipped |
| Help menu (Send Feedback, Report Issue, Privacy) | Shipped |
| `docs/PRIVACY.md` | Shipped — local `~/.arkhe`, Playwright, Supabase, Attention keys, no alpha telemetry |
| Replay **Export PDF Summary** | Shipped |

## Remaining manual gate

- Full clean-machine run of `MANUAL_TESTER_SCRIPT.md` sign-off still requires a human tester (not automated in CI).
- Privacy link points to `https://arkhe.com/privacy` by default — host or set `ARKHE_PRIVACY_URL` before public beta.

---

## First live start — 2026-06-07

Automated + local smoke after Premium checklist pass (remaining programmatic items).

### Environment

| Item | Result |
|------|--------|
| Daemon | Already listening on `ws://127.0.0.1:9470` (pid 92067) — no restart required |
| `pnpm build` | **PASS** (local-daemon rebuilt with YouTube `videos.insert`) |
| `pnpm qa:alpha` | **PASS** — all 16 events + 11 IPC replies |
| `xcodegen` + `xcodebuild Debug` | **BUILD SUCCEEDED** |
| `pnpm package:app` | **PASS** — ad-hoc signed DMG created |

### WebSocket / IPC smoke (manual script subset)

| Check | Result |
|-------|--------|
| `health` | OK (`status: ok`) |
| `attention_scan` | OK |
| `vault_search` | OK |
| `memory_search` | OK |
| `runtime_snapshot` | OK |

### macOS app launch

| Item | Result |
|------|--------|
| Debug `.app` via `open` | **Launched** — pid 92732 |
| Path | `/Users/purduelaw/Library/Developer/Xcode/DerivedData/ArkheAgentOS-dejoxjgbvfjelmbqhaklzyccleiw/Build/Products/Debug/Arkhe AgentOS.app` |
| Release `.app` | `apps/macos/build/DerivedData/Build/Products/Release/Arkhe AgentOS.app` |
| DMG | `dist/ArkheAgentOS-0.1.0-alpha.dmg` (ad-hoc signed, **not notarized**) |

### What worked without human intervention

- Full daemon IPC chain (health, attention scan, vault search, runtime snapshot)
- Private alpha QA mission + Attention Cortex event chain
- SwiftUI Debug + Release builds
- DMG packaging pipeline end-to-end

### Needs human on clean Mac

- Onboarding UI sign-off (model readiness rows, first-launch bundled daemon)
- Voice / typed mission UX (not headless-automated)
- Pop-out Mission Control window (⌘⇧M) — verify on second display
- Notarized DMG install via Gatekeeper (`infra/dev/notarize.sh` + Apple Developer ID)
- YouTube real upload — requires OAuth credentials + `ARKHE_YOUTUBE_UPLOAD_PATH` or `video.localPath`
- Ollama + Playwright first-run on machine without dev toolchain
- Privacy URL hosting / Terms of service

### Blockers documented (credentials-only)

- Apple notarization: Developer ID + `notarytool` keychain profile
- YouTube upload: `YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN` + video file path
- Public privacy URL / GTM screenshots
