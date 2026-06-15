# Arkhe AgentOS

The first native macOS Agent Operating System — a voice-first command center that creates, manages, audits, records, and supervises AI agents.

**Forecast Wars** (`apps/forecast-wars`) is the **public website** — an AI debate arena powered by Arkhe AgentOS. The macOS app remains the private founder console.

### Forecast Wars website (local)

```bash
pnpm sync:forecast-wars-env   # once — copies Supabase keys from root .env
pnpm start:forecast-wars      # website + Hermes + daemon
# or website only:
pnpm dev:forecast-wars        # http://localhost:3001
pnpm smoke:forecast-wars      # verify local stack
```

See [apps/forecast-wars/README.md](apps/forecast-wars/README.md).

## Products

| App | Path | Audience |
|-----|------|----------|
| Forecast Wars | `apps/forecast-wars` | Public — AI debate arena |
| Arkhe AgentOS | `apps/macos` | Private — founder console |
| Legacy web | `apps/web` | **FROZEN** — Media Engine |

## Architecture

```
apps/macos          SwiftUI shell — Mission Control, browser, voice UX
apps/local-daemon   Node bootstrap, IPC bridge, worker supervisor
apps/hermes         NestJS message routing service (Hermes)
packages/*          Control plane — orchestration, tools, memory, observability
workers/*           Python/native sidecars — speech, vision, ML
infra/*             Supabase migrations, dev scripts, packaging
```

### Service topology

```
macOS app (SwiftUI)
  │  WS :9470 (daemon IPC)          WS :4000/ws (Hermes live push)
  └──────────────┬────────────────────────────┘
                 │
         local-daemon (Node)
          │  NATS JetStream (arkhe.events.>)
          │  HTTP POST /gateway/ingest
          └──────────────┐
                         │
                   Hermes :4000 (NestJS)
                    ├── CapabilitiesModule   GET/POST /capabilities
                    ├── GatewayModule        POST /gateway/ingest
                    │    ├── RouterService   priority-score → dispatch
                    │    ├── NotificationService  channel adapters
                    │    └── ApprovalsService     hold / resolve
                    └── BridgeModule
                         ├── NatsBridgeService   arkhe.events.> subscriber
                         └── InboundWsGateway    ws://:4000/ws
```

Four-tier local architecture:

1. **Native Swift shell** — UI, permissions, voice capture, charts
2. **Hermes routing layer** — message envelope routing, approval flow, notification dispatch
3. **Node/TypeScript control plane** — Director, agent orchestration, MCP gateway
4. **Specialist workers** — Python speech/vision, Playwright browser automation

## Quick start

### Start order

```bash
# 1. Install dependencies (once)
pnpm install

# 2. NATS JetStream (optional — in-process bus used as fallback)
nats-server -js

# 3. Hermes routing service
pnpm dev:hermes

# 4. Local daemon
pnpm dev:daemon
```

Open the native app:

```bash
open apps/macos/ArkheAgentOS.xcodeproj
```

### Smoke tests

```bash
# Daemon end-to-end (requires running daemon)
pnpm smoke:daemon

# Hermes REST + WebSocket (requires running Hermes)
pnpm smoke:hermes
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
