# Arkhe AgentOS

The first native macOS Agent Operating System — a voice-first command center that creates, manages, audits, records, and supervises AI agents.

## Architecture

```
apps/macos          SwiftUI shell — Mission Control, browser, voice UX
apps/local-daemon   Node bootstrap, IPC bridge, worker supervisor
packages/*          Control plane — orchestration, tools, memory, observability
workers/*           Python/native sidecars — speech, vision, ML
infra/*             gRPC protos, dev scripts, packaging
```

Three-tier local architecture:

1. **Native Swift shell** — UI, permissions, capture, charts
2. **Node/TypeScript control plane** — Director, LangGraph, MCP gateway
3. **Specialist workers** — Python speech/vision, Playwright browser automation

## Quick start

```bash
pnpm install
pnpm dev:daemon
```

Open the native app:

```bash
open apps/macos/ArkheAgentOS.xcodeproj
```

Run a daemon smoke test after starting `pnpm dev:daemon`:

```bash
pnpm smoke:daemon
```

Or start the full private-alpha loop (build, daemon, smoke test, open Xcode):

```bash
pnpm start:alpha
```

## Docs

- [Event Schema](docs/EVENT_SCHEMA.md)
- [UI/UX Specification](docs/UI_UX_SPEC.md)
- [Private Alpha Checklist](docs/release/PRIVATE_ALPHA_CHECKLIST.md)

## Private alpha focus

- Voice/typed mission control through the Director.
- Agent playground runtime with visible collaboration and work-item handoffs.
- Free/local-first model routing with Apple Foundation Models integration path.
- Browser/tool/memory packages shaped for safe expansion.
- Mission Control as the operating surface for telemetry, model routing, agents, and replay.

## Product positioning

Not an AI assistant. An operating system for AI workers.

Users launch **missions**, not chats. The OS creates, manages, supervises, records, and improves the agents required to complete them.
