# Arkhe AgentOS — Canonical Event Schema

Version **1.0** · Source of truth: `packages/contracts/src/events.ts` · Transport: `infra/proto/events.proto`

Every subsystem — voice, Director, agents, tools, browser, approvals, telemetry, recording, memory, audit — emits into this schema. Mission Control, replay, cost accounting, and compliance exports all read from it.

---

## Design principles

1. **Append-only** — events are never mutated; corrections emit new events
2. **Self-describing** — every event carries `schemaVersion`, typed `eventType`, and structured `payload`
3. **Correlatable** — `missionId`, `agentId`, `traceId`/`spanId` link cross-cutting flows
4. **Cost-aware** — optional `cost` block on any event that consumes model/API resources
5. **Resource-aware** — optional `resources` block for per-agent CPU/memory/network snapshots
6. **Artifact-linked** — browser screenshots, traces, video segments reference `ArtifactRef` URIs

---

## Entity IDs

| Prefix | Entity | Example |
|--------|--------|---------|
| `mis_` | Mission | `mis_k7xQ2mN9pL4v` |
| `agt_` | Agent | `agt_b3hR8wT1cJ6n` |
| `wsp_` | Workspace | `wsp_f9dM2kP5xQ8r` |
| `apr_` | Approval | `apr_n4jL7vB2hK9m` |
| `trc_` | Trace | `trc_p6wN3cR8tM1x` |
| `spn_` | Span | `spn_q2kH9fD4vL7n` |
| `evt_` | Event | `evt_r8mT5jP1cX6w` |
| `tcl_` | Tool call | `tcl_s3nK7hQ9bF2v` |

Generate via `@arkhe/contracts` helpers: `createMissionId()`, `createAgentId()`, etc.

---

## Base envelope

Every event extends `EventEnvelope`:

```json
{
  "id": "evt_r8mT5jP1cX6w",
  "ts": "2026-06-07T21:14:02.401Z",
  "schemaVersion": "1.0",
  "missionId": "mis_k7xQ2mN9pL4v",
  "workspaceId": "wsp_f9dM2kP5xQ8r",
  "agentId": "agt_b3hR8wT1cJ6n",
  "parentAgentId": "agt_director_01",
  "trace": {
    "traceId": "trc_p6wN3cR8tM1x",
    "spanId": "spn_q2kH9fD4vL7n",
    "parentSpanId": "spn_parent_01"
  },
  "resources": {
    "cpuPct": 16.2,
    "memMb": 412,
    "netTxKb": 88,
    "netRxKb": 141
  },
  "cost": {
    "inputTokens": 214,
    "outputTokens": 73,
    "costUsd": 0.0021,
    "model": "gpt-4.1"
  }
}
```

---

## Event domains

### 1. Voice (`voice.*`)

| Event | When emitted |
|-------|--------------|
| `voice.wake.detected` | Wake word spotted |
| `voice.session.started` | Duplex voice session opens |
| `voice.session.ended` | Session closes |
| `voice.transcript.partial` | Streaming STT partial |
| `voice.transcript.final` | Final utterance |
| `voice.command.recognized` | Director parsed intent |
| `voice.tts.started` / `voice.tts.completed` | Speech output lifecycle |
| `voice.barge_in` | User interrupted TTS |

**Example:**

```json
{
  "eventType": "voice.command.recognized",
  "payload": {
    "sessionId": "vsess_abc123",
    "transcript": "Director, audit my website",
    "confidence": 0.94,
    "intent": "mission.create.audit",
    "sttProvider": "apple"
  }
}
```

---

### 2. Mission (`mission.*`)

| Event | When emitted |
|-------|--------------|
| `mission.created` | Director or UI creates mission |
| `mission.planned` | Agent plan finalized |
| `mission.started` | Execution begins |
| `mission.paused` / `mission.resumed` | User or budget pause |
| `mission.completed` / `mission.failed` / `mission.cancelled` | Terminal states |
| `mission.budget.warning` | 25/50/80% thresholds |
| `mission.budget.exceeded` | Hard cap hit |

**Example:**

```json
{
  "eventType": "mission.started",
  "payload": {
    "missionId": "mis_k7xQ2mN9pL4v",
    "title": "Website SEO Audit",
    "status": "active",
    "objective": "Full technical and content audit of arkhe.com",
    "budgetUsd": 5.0,
    "budgetUsedUsd": 0.0,
    "completionPct": 0,
    "riskScore": 12,
    "spawnedAgentIds": ["agt_seo_01", "agt_browser_02"]
  }
}
```

---

### 3. Agent (`agent.*`)

| Event | When emitted |
|-------|--------------|
| `agent.spawned` | Dynamic Agent Factory creates agent |
| `agent.started` | Process/worker online |
| `agent.message` | Inter-agent or agent→Director message |
| `agent.tool_requested` | Agent requests tool (pre-gateway) |
| `agent.waiting_approval` | Blocked on orange/red action |
| `agent.paused` / `agent.completed` / `agent.failed` / `agent.terminated` | Lifecycle |
| `agent.health.updated` | Health score recalculated |

**Agent kinds:** `director` · `resident` · `mission` · `skill`

**Example:**

```json
{
  "eventType": "agent.spawned",
  "payload": {
    "agentId": "agt_seo_01",
    "kind": "mission",
    "role": "SEO Analyst",
    "status": "spawning",
    "parentAgentId": "agt_director_01",
    "permissions": {
      "riskClass": "green",
      "allowedTools": ["browser.read", "search", "screenshot"],
      "maxCostUsd": 1.50
    },
    "healthScore": 100
  }
}
```

---

### 4. Tool / MCP (`tool.*`)

| Event | When emitted |
|-------|--------------|
| `tool.invoked` | Tool Gateway accepted call |
| `tool.completed` / `tool.failed` | Result |
| `tool.blocked` | Policy denied |
| `tool.approval_required` | Orange/red gate triggered |

**Risk classes:** `green` (read) · `yellow` (edit) · `orange` (send/publish) · `red` (pay/deploy/delete)

**Example:**

```json
{
  "eventType": "tool.invoked",
  "payload": {
    "toolCallId": "tcl_s3nK7hQ9bF2v",
    "toolName": "browser.navigate",
    "mcpServer": "arkhe-browser",
    "riskClass": "green",
    "input": { "url": "https://arkhe.com" },
    "durationMs": 842
  }
}
```

---

### 5. Browser (`browser.*`)

Emitted by Playwright sidecar and WKWebView bridge.

| Event | When emitted |
|-------|--------------|
| `browser.navigate` / `browser.click` / `browser.type` / `browser.scroll` | User/agent actions |
| `browser.screenshot` | Capture for replay |
| `browser.dom_snapshot` | DOM state for step replay |
| `browser.network` / `browser.console` | Diagnostics |
| `browser.approval_required` | Form submit, login reuse, download |

**Artifact refs:**

- `pw_trace://2026-06-07/mis_k7xQ2mN9/step_41` — Playwright trace
- `screenshot://mis_k7xQ2mN9/step_41.png` — PNG capture
- `dom://mis_k7xQ2mN9/step_41.json` — DOM snapshot

---

### 6. Approval (`approval.*`)

| Event | When emitted |
|-------|--------------|
| `approval.requested` | Orange/red action pending |
| `approval.granted` / `approval.denied` / `approval.expired` | Resolution |

**Example:**

```json
{
  "eventType": "approval.requested",
  "payload": {
    "approvalId": "apr_n4jL7vB2hK9m",
    "status": "pending",
    "riskClass": "orange",
    "action": "browser.submit_form",
    "summary": "Submit contact form on competitor.com with extracted data",
    "evidenceRefs": ["screenshot://apr_evidence_01.png"],
    "requestedByAgentId": "agt_browser_02",
    "expiresAt": "2026-06-07T21:20:00.000Z"
  }
}
```

---

### 7. Telemetry (`telemetry.*`)

Sampled on fixed cadence (default 2s for dashboard, 30s for archival).

| Event | When emitted |
|-------|--------------|
| `telemetry.system.sample` | macOS system metrics |
| `telemetry.agent.sample` | Per-agent CPU/memory/task |
| `telemetry.mission.sample` | Mission rollup |

Feeds Mission Control charts and Agent Observatory.

---

### 8. Recording & replay (`recording.*`)

| Event | When emitted |
|-------|--------------|
| `recording.started` / `recording.stopped` | ScreenCaptureKit session |
| `recording.segment` | Chunk written |
| `replay.started` / `replay.step` / `replay.completed` | User replays mission |
| `export.requested` / `export.completed` | PDF, JSON, MP4, compliance package |

**Recording modes:** `off` · `mission` · `workspace` · `continuous`

**Replay modes:** `fast` · `realtime` · `step` · `educational`

---

### 9. Memory (`memory.*`)

| Event | When emitted |
|-------|--------------|
| `memory.chunk.stored` | New memory chunk indexed |
| `memory.chunk.retrieved` | Agent recalled context |
| `memory.search` | Lexical or semantic query |
| `memory.redacted` | Sensitive chunk removed |

**Memory types:** `conversation` · `project` · `workspace` · `screen` · `mission` · `vault`

---

### 10. Audit (`audit.entry`)

Append-only, hash-chained compliance log. Every significant action mirrors here.

```json
{
  "eventType": "audit.entry",
  "payload": {
    "sequence": 1842,
    "previousHash": "sha256:abc...",
    "entryHash": "sha256:def...",
    "action": "approval.granted",
    "actor": "user",
    "summary": "User approved form submission on competitor.com",
    "relatedEventId": "evt_r8mT5jP1cX6w",
    "complianceTags": ["SOC2", "action-review"]
  }
}
```

---

## Transport

### NATS JetStream topics

```
arkhe.events.voice
arkhe.events.mission
arkhe.events.agent
arkhe.events.tool
arkhe.events.browser
arkhe.events.approval
arkhe.events.telemetry
arkhe.events.recording
arkhe.events.memory
arkhe.events.audit
```

### IPC (macOS ↔ daemon)

`EventStreamMessage` wraps any `ArkheEvent`:

```json
{
  "topic": "arkhe.events.agent",
  "event": { "...": "..." },
  "emittedAt": "2026-06-07T21:14:02.401Z",
  "source": "daemon"
}
```

Sources: `macos` · `daemon` · `worker`

### gRPC

See `infra/proto/events.proto` — `EventService.Publish` and `EventService.Subscribe`.

---

## Storage layout (local)

| Store | Contents | Technology |
|-------|----------|------------|
| Event log | All events, FTS searchable | SQLCipher + FTS5 |
| Trace store | Spans, costs, latencies | SQLCipher (Langfuse-compatible) |
| Artifact store | Screenshots, traces, video | `~/.arkhe/artifacts/` |
| Audit chain | Hash-linked audit entries | SQLCipher append-only table |

Retention policies configurable per workspace. Video artifacts are the expensive layer (~3.6 GB/hr at 1080p H.264).

---

## Budget & cost rollup

Cost aggregates derive from events with `cost` blocks:

- **Per span** — single LLM/tool invocation
- **Per agent** — sum of agent's spans
- **Per mission** — sum across all mission agents
- **Per workspace** — sum across missions in billing period

Budget warnings emit at 25%, 50%, 80%. Hard cap emits `mission.budget.exceeded` and pauses all mission agents.

---

## Versioning

- Current: `1.0`
- Breaking changes increment major; daemon accepts N-1 for one release cycle
- Unknown `eventType` values are stored raw and flagged in Mission Control
