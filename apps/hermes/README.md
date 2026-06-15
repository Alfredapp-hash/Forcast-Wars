# @arkhe/hermes

Hermes is the message routing and delivery layer for Arkhe AgentOS. It receives inbound envelopes from the daemon, voice UI, dashboard, and webhooks; makes routing decisions; dispatches to the correct agent or tool; manages approval holds; and fires notifications.

## Stack

- **NestJS 10** — HTTP service framework
- **Supabase/Postgres** — persistence (threads, messages, decisions, capabilities, notifications, approvals)
- **NATS JetStream** — event streaming bridge to the local-daemon
- **BullMQ + Redis** — async notification dispatch (Phase 5)

## Directory layout

```
src/
  main.ts                        # Bootstrap
  hermes.types.ts                # Shared type definitions
  modules/
    app.module.ts                # Root module
    health.module.ts             # /health endpoint
    capabilities.module.ts       # Capability registry
    gateway.module.ts            # Inbound routing gateway
  providers/
    configuration.ts             # Config via @nestjs/config
    supabase.provider.ts         # Supabase client singleton
  rest/
    health.controller.ts         # GET /health
    capabilities.controller.ts   # CRUD /capabilities
    gateway.controller.ts        # POST /gateway/ingest
  services/
    capabilities.service.ts      # Register / query capabilities
    gateway.service.ts           # Route inbound envelopes
infra/supabase/migrations/
  20260613_hermes.sql            # Initial Hermes schema migration
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `HERMES_HOST` | `0.0.0.0` | Bind address |
| `HERMES_PORT` | `4000` | HTTP port |
| `NATS_URL` | `nats://127.0.0.1:4222` | NATS JetStream URL |
| `SUPABASE_URL` | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Service-role key (required for writes) |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis URL (Phase 5 workers) |

Copy `.env.example` → `.env` and fill in real values.

## Getting started

```bash
# From repo root
pnpm install

# Apply Hermes schema to Supabase
# (paste infra/supabase/migrations/20260613_hermes.sql into the Supabase SQL editor
#  or run via supabase CLI: supabase db push)

# Start Hermes dev server
pnpm dev:hermes
# or, from this directory:
pnpm dev
```

## Key REST endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/capabilities` | List all registered capabilities |
| `GET` | `/capabilities/role/:role` | Find capabilities by role |
| `POST` | `/capabilities` | Register a capability |
| `POST` | `/capabilities/:id/heartbeat` | Refresh last-seen timestamp |
| `DELETE` | `/capabilities/:id` | Deregister a capability |
| `POST` | `/gateway/ingest` | Submit a message envelope for routing |

### Ingest envelope shape

```jsonc
{
  "source": "agent",          // voice | dashboard | agent | webhook | system
  "role": "user",             // user | agent | system | hermes
  "payload": { ... },         // arbitrary message body
  "context": { ... },         // optional context hints
  "missionId": "msn_abc",     // optional — ties to a mission thread
  "routingHint": "research"   // optional — preferred role/action hint
}
```

Hermes returns `{ messageId, decision }` with a `202 Accepted`.
