# AgentOS Self-Documentary

**Status:** Foundations (Phase 1) — 2026-06-07

Autonomous content pipeline for the **Self-Documentary** YouTube channel: Arkhe AgentOS documenting its own development toward financial independence. DNA interface is the visual brand; episodes are 1–2 minutes of real work — not generic AI slop.

---

## Vision

After one-time setup, the system runs autonomously:

1. Find content idea
2. Research / verify
3. Mission fit check
4. Script
5. Record interface
6. Narration / visuals / captions / music
7. Render 1–2 min video
8. Title / description / thumbnail / tags
9. Compliance checks
10. YouTube upload
11. Blog post
12. Monitor & improve

**Series examples:** What I Learned Today, Inside My DNA, New Gene Added, Mission Postmortem, Financial Pulse.

**Publishing modes:**

| Mode | Behavior |
|------|----------|
| `shadow` | Full pipeline except publish — events + journal stub only |
| `supervised` | Private/unlisted + human approval before public |
| `autonomous` | Auto-publish when quality + financial gates pass |

**Quality gates (at least one required):** original experiment, milestone, analysis, measurable result, visualization, failure, demo, mission position.

**Financial sustainability gate (autonomous publish):**

- 3 consecutive months where Recurring Revenue ≥ 1.25 × Total Operating Cost
- 6-month operating reserve
- Public dashboard metrics when ready
- **Genesis chromosome** on DNA strand when gate passes

---

## Agent team

| Role | Stage ownership | Maps to existing |
|------|-----------------|------------------|
| Trend Scout | idea_discovery | Trend Intelligence Agent (attention cortex) |
| Mission Editor | mission_fit_check | Director / policy review |
| Research Agent | research_verify | Research Agent (personal + attention) |
| Script Agent | script_draft | Content Agent (attention) |
| Documentarian Agent | capture_plan | New — sanitization + moment selection |
| Capture Agent | interface_record | Recording events + browser screenshots |
| Visual Director | visuals_produce | Video Production Agent (attention) |
| Narrator Agent | narration_produce | Voice Agent + TTS |
| Video Editor Agent | video_render | Video Production Agent |
| Compliance Agent | compliance_check | Security Agent + sanitization layer |
| Publisher Agent | metadata, upload, blog | Marketing Agent + YouTubePublisher |
| Audience Agent | monitor_improve | Analytics Agent (attention) |
| Financial Governor | financial_gate | Observability Agent + cost telemetry |

Definitions: `apps/local-daemon/src/documentary/documentary-agents.ts`

Phase 2: register documentary specialists in `packages/orchestrator/src/agent-registry.ts` under `cortex: "attention"` or new `documentary` cortex key.

---

## Mapping to existing components

| Component | Path | Self-Documentary use |
|-----------|------|----------------------|
| Attention Cortex | `apps/local-daemon/src/attention/` | Trend sources, video gen adapters, YouTube publish scaffold |
| YouTube adapters | `attention/adapters/publishers.ts`, `trend-sources.ts` | OAuth upload, trend polling (reuse for external ideas + publish) |
| Media loop | `attention/trend-intelligence.ts` | Parallel loop — documentary focuses on *internal* OS development |
| Agent registry | `packages/orchestrator/src/agent-registry.ts` | 8 attention residents today; documentary team is separate definitions |
| DNA interface | `apps/macos/.../DNA/`, `docs/DNA_INTERFACE.md` | Visual brand, capture targets, Genesis chromosome (dormant) |
| Economics / settings | Settings → Economics, `getRuntimeSettings()` | Per-run budget caps; Financial Governor extends with RR/TOC |
| Dreaming | `memory/dreaming.ts` | Media reflections — documentary journal is complementary |
| Events | `packages/contracts/src/events.ts` | `documentary.*` event family |
| IPC | `apps/local-daemon/src/ipc/server.ts` | `documentary_config`, `documentary_run` |
| Config | `~/.arkhe/documentary-config.json` | Example: `apps/local-daemon/config/documentary-config.example.json` |

**Relationship to Attention Cortex:** Attention manufactures attention from *external* trends. Self-Documentary manufactures trust from *internal* development truth. They share adapters (YouTube, analytics) but different ideation sources and quality gates.

---

## Daemon module (Phase 1)

```
apps/local-daemon/src/documentary/
├── documentary-config.ts      # mission, beliefs, modes, budgets, gates
├── documentary-pipeline.ts    # 12-stage state machine stub
├── documentary-agents.ts      # 13 agent role definitions
├── sanitization-layer.ts      # pattern-based redaction before render
├── financial-governor.ts      # RR/TOC, reserve, readiness score
└── journal-writer.ts          # development journal entry stub
```

**Scheduler:** Mirrors Attention Cortex — `ARKHE_DOCUMENTARY_SCAN_INTERVAL_MS` (default 24h). Runs only when `enabled: true` in config.

**IPC:**

- `documentary_config` — read config + sustainability status
- `documentary_config_update` — update enabled, mode, thresholds, budget
- `documentary_run` — manual trigger (`force: true` bypasses enabled check)

---

## Events (`documentary.*`)

| Event | Stage |
|-------|-------|
| `documentary.pipeline.started` | Boot |
| `documentary.idea.found` | 1 |
| `documentary.research.completed` | 2 |
| `documentary.mission_fit.checked` | 3 |
| `documentary.script.drafted` | 4 |
| `documentary.capture.recorded` | 5 |
| `documentary.narration.produced` | 6 |
| `documentary.visuals.produced` | 7 |
| `documentary.video.rendered` | 8 |
| `documentary.metadata.prepared` | 9 |
| `documentary.compliance.checked` | 10 |
| `documentary.published` | 11 (YouTube) |
| `documentary.blog.posted` | 11 (blog) |
| `documentary.monitor.updated` | 12 |
| `documentary.sustainability.updated` | Financial gate |
| `documentary.pipeline.completed` / `.failed` | Terminal |

See `docs/EVENT_SCHEMA.md` — add documentary section in Phase 2 doc pass.

---

## macOS UI (Phase 1)

**Settings → Self-Documentary:** publishing mode, last run, sustainability score stub, save + manual run.

**DNA → Genesis chromosome:** `ArkheDNATheme.swift` — gold dormant region; activates when Financial Governor reports `genesisChromosomeReady`.

Phase 2: Mission Control documentary strip, episode history, approval queue for supervised mode.

---

## YouTube & compliance

- **Data API OAuth:** Reuse `attention-config.json` refresh token + `YOUTUBE_CLIENT_ID` / `SECRET` in `.env`
- **containsSyntheticMedia:** Enforced via `syntheticMediaDisclosure: true` in documentary config
- **Unverified projects:** Videos remain private until Google audit — Publisher Agent respects project verification state (Phase 2)
- **Sanitization:** Mandatory pass on frames, subtitles, logs before render (`sanitization-layer.ts`)

---

## Implementation phases

### Phase 1 — Foundations (this delivery)

- [x] Config store + example JSON
- [x] Pipeline state machine stub + events
- [x] Agent role definitions
- [x] Sanitization pattern stubs
- [x] Financial Governor formula stub
- [x] Journal writer stub
- [x] Daemon scheduler + IPC
- [x] Settings UI strip
- [x] Genesis chromosome (dormant) in DNA theme

### Phase 2 — Production pipeline

- [ ] Real ideation from telemetry + mission events (Trend Scout)
- [ ] Interface capture via Documentarian + macOS screen recording API
- [ ] ffmpeg render worker (`workers/vision-media/` or new worker)
- [ ] TTS narration + captions + music bed selection
- [ ] Thumbnail generation (DNA visual templates)
- [ ] Supervised approval flow in macOS UI
- [ ] Blog cross-post (markdown → site/CMS)
- [ ] Register documentary agents in AgentRegistry
- [ ] Persist journal to `~/.arkhe/journal/`

### Phase 3 — Autonomous publish & growth

- [ ] YouTube upload with synthetic media disclosure metadata
- [ ] Analytics ingest → Audience Agent feedback loop
- [ ] Public financial sustainability dashboard
- [ ] Genesis chromosome activation in DNA canvas
- [ ] Synapse strengthening from episode performance
- [ ] Quality gate ML scoring (not rule-only)

### Phase 4 — Scale & governance

- [ ] Multi-series scheduling
- [ ] A/B title/thumbnail experiments
- [ ] Community comment triage agent
- [ ] Enterprise compliance export per episode

---

## Configuration quick start

```bash
cp apps/local-daemon/config/documentary-config.example.json ~/.arkhe/documentary-config.json
# Edit: set "enabled": true when ready; keep "publishingMode": "shadow" for dev
```

Trigger manually from macOS Settings → **Run Pipeline Now**, or IPC `documentary_run` with `force: true`.

---

## Anti-slop quality bar

An episode must demonstrate at least one of:

- A real experiment with outcome
- A shipped milestone
- Quantified analysis
- A measurable result
- A useful visualization
- An honest failure postmortem
- A live demo of AgentOS capability
- Clear position in the mission toward financial independence

Generic "AI news recap" or filler content fails the Mission Editor gate (Phase 2 enforcement).
