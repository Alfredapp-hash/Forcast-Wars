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

## Try it

In the voice bar at the bottom, send:

- `Director, audit my website`
- `Director, create a competitor research mission`
- `Director, create a proposal from today's findings`

Watch Mission Control populate with missions, agents, and the event stream.

## Stack

- SwiftUI + Swift Charts
- WKWebView (browser — coming soon)
- ScreenCaptureKit + AVFoundation (recording — coming soon)
- IPC via WebSocket to `apps/local-daemon`

## Directory layout

```
ArkheAgentOS/
├── ArkheAgentOSApp.swift
├── App/                    Navigation shell, AppState
├── Features/
│   └── MissionControl/     Hero dashboard
├── Core/
│   ├── IPC/                DaemonClient (WebSocket)
│   └── Models/             Event models mirroring @arkhe/contracts
└── Shared/
    └── Components/         Sidebar, VoiceBar
```

See [UI/UX Specification](../../docs/UI_UX_SPEC.md).
