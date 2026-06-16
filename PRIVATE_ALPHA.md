# Arkhe AgentOS — Private Alpha

The macOS-native Agent Operating System that powers Forecast Wars debates behind the scenes. This is the **private founder console** — not a public product.

## What it is

> Not an AI assistant. An operating system for AI workers.
> Users launch **missions**, not chats. The OS creates, manages, supervises, records, and improves the agents required to complete them.

## Services

```
apps/macos          SwiftUI shell — Mission Control, browser, voice UX
apps/local-daemon   Node bootstrap, IPC bridge, worker supervisor
apps/hermes         NestJS message routing service (Hermes)
packages/*          Control plane — orchestration, tools, memory, observability
workers/*           Python/native sidecars — speech, vision, ML
infra/*             Supabase migrations, dev scripts, packaging
```

## Service topology

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

## Start order (private alpha loop)

```bash
# 1. Install dependencies
pnpm install

# 2. NATS JetStream (optional — in-process bus used as fallback)
nats-server -js

# 3. Hermes routing service
pnpm dev:hermes

# 4. Local daemon
pnpm dev:daemon

# 5. Open native app in Xcode
open apps/macos/ArkheAgentOS.xcodeproj
```

Or run the full private-alpha loop in one command:

```bash
pnpm start:alpha
```

## Smoke tests

```bash
pnpm smoke:daemon   # daemon end-to-end
pnpm smoke:hermes   # Hermes REST + WebSocket
```

## Private alpha focus

- Voice/typed mission control through the Director
- Agent playground runtime with visible collaboration and work-item handoffs
- Free/local-first model routing with Apple Foundation Models integration path
- Browser/tool/memory packages shaped for safe expansion
- Mission Control as the operating surface for telemetry, model routing, agents, and replay

## Docs

- [Event Schema](docs/EVENT_SCHEMA.md)
- [UI/UX Specification](docs/UI_UX_SPEC.md)
- [Private Alpha Checklist](docs/release/PRIVATE_ALPHA_CHECKLIST.md)
