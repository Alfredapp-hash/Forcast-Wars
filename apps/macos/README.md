# Arkhe AgentOS — macOS Application

Native SwiftUI shell for Mission Control, voice UX, agent browser, and replay.

## Generate Xcode project

```bash
# from repo root
bash infra/dev/scaffold-xcode.sh
```

Requires [xcodegen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`

## Open and run

```bash
open apps/macos/ArkheAgentOS.xcodeproj
```

Start the daemon first (separate terminal):

```bash
pnpm dev:daemon
```

Then run the app from Xcode. Mission Control connects to `ws://127.0.0.1:9470`.

The app also auto-starts a bundled daemon on launch (see `DaemonLauncher`). First-launch onboarding checks daemon WebSocket health, Playwright Chromium probe, Ollama, and Supabase. If the daemon fails to start, the System Status strip and onboarding sheet show actionable recovery hints (retry launch, `pnpm bundle:daemon`, or `npx playwright install chromium`).

## Try it

In the voice bar at the bottom, send:

- `Director, audit my website`
- `Director, create a competitor research mission`
- `Director, create a proposal from today's findings`

Watch Mission Control populate with missions, agents, and the event stream.

## Stack

- SwiftUI + Swift Charts
- WKWebView (live dual-mode agent browser + post-mission artifacts viewer; in-browser approval modals shipped)
- ScreenCaptureKit + AVFoundation (recording scoped to missions — on the Premium roadmap)
- IPC via WebSocket to `apps/local-daemon`
- Full Neural Mesh (SynapseEngine + `agent_synapses` in Supabase) surfaced in Residents + Mission Control

Current state reflects a strong private alpha with significant Premium features: Mission Control (comms feed, agent graph, Attention Cortex strip), Residents/Neural Mesh canvas, Observatory, Memory + Forensics panel, Replay v2 scrubber/narration/export, Live Agent Browser, Approvals, Command Palette (⌘K). See `docs/PREMIUM_CHECKLIST.md` for remaining ship-ready work.

## Directory layout

```
ArkheAgentOS/
├── ArkheAgentOSApp.swift
├── App/                    Navigation shell, AppState
├── Features/
│   ├── MissionControl/     Hero dashboard
│   ├── Forensics/          Evidence chain explainability panel
│   └── Replay/             Mission replay + scrubber
├── Core/
│   ├── IPC/                DaemonClient (WebSocket)
│   └── Models/             Event models mirroring @arkhe/contracts
└── Shared/
    └── Components/         Sidebar, VoiceBar
```

See [UI/UX Specification](../../docs/UI_UX_SPEC.md).
