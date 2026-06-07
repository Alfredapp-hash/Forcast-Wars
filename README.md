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

Open `apps/macos` in Xcode (project scaffold pending).

## Docs

- [Event Schema](docs/EVENT_SCHEMA.md)
- [UI/UX Specification](docs/UI_UX_SPEC.md)

## Product positioning

Not an AI assistant. An operating system for AI workers.

Users launch **missions**, not chats. The OS creates, manages, supervises, records, and improves the agents required to complete them.
