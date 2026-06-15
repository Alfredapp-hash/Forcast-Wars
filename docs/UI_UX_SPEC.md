# Arkhe AgentOS — UI/UX Specification

Version **1.0** · Platform: native macOS · Framework: SwiftUI + AppKit bridges

This document defines every primary screen, panel, widget, graph, and interaction. Mission Control is the hero surface — the feature that separates AgentOS from every chatbot product.

---

## Design language

### Aesthetic direction

**NASA Mission Control meets Activity Monitor meets a premium trading terminal.**

- Dark-first UI with high information density
- Monospace numerics for metrics; SF Pro for labels
- Color is semantic, not decorative
- Motion is functional (state transitions, alerts) — never ornamental
- Voice state is always visible somewhere on screen

### Semantic colors

| Token | Use |
|-------|-----|
| `agent.active` | Green — running, healthy |
| `agent.idle` | Blue-gray — spawned, waiting |
| `agent.warning` | Amber — budget, approval pending |
| `agent.critical` | Red — failed, terminated, kill switch |
| `risk.green` | Read-only actions |
| `risk.yellow` | Edits, navigation |
| `risk.orange` | Send, publish, submit |
| `risk.red` | Pay, deploy, delete |
| `cost.normal` | Under budget |
| `cost.elevated` | 50–80% budget |
| `cost.exceeded` | Over hard cap |

### Typography scale

| Role | Font |
|------|------|
| Mission title | SF Pro Display 24 semibold |
| Panel header | SF Pro Text 13 semibold caps |
| Metric value | SF Mono 20 medium |
| Metric label | SF Pro Text 11 regular |
| Event log | SF Mono 12 regular |
| Voice transcript | SF Pro Text 15 regular |

---

## Global shell

### Window model

Single primary window with optional detached panels (Mission Control can pop out to a second display).

```
┌─────────────────────────────────────────────────────────────────┐
│ ● ● ●   Arkhe AgentOS          [Workspace ▾]  [🔴 REC]  [Voice]│
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│  Sidebar │              Main content area                       │
│          │                                                      │
│          │                                                      │
├──────────┴──────────────────────────────────────────────────────┤
│ Status bar: 3 missions · 7 agents · $1.42 today · ⚡ 14% CPU  │
└─────────────────────────────────────────────────────────────────┘
```

### Sidebar navigation (always visible)

| Item | Icon | Shortcut |
|------|------|----------|
| Mission Control | `gauge.with.dots.needle.67percent` | ⌘1 |
| Missions | `flag.checkered` | ⌘2 |
| Agents | `cpu` | ⌘3 |
| Browser | `globe` | ⌘4 |
| Replay | `play.rectangle.on.rectangle` | ⌘5 |
| Memory | `brain` | ⌘6 |
| Observatory | `chart.xyaxis.line` | ⌘7 |
| Approvals | `checkmark.shield` | ⌘8 |
| Settings | `gearshape` | ⌘, |

**Badge rules:** Approvals shows pending count. Mission Control shows active mission count. Voice button pulses when listening.

### Voice bar (persistent)

Floating pill at bottom-center, collapsible to menu bar extra.

States:

1. **Dormant** — gray mic, "Say 'Director'..."
2. **Wake detected** — pulse animation
3. **Listening** — waveform, live partial transcript
4. **Processing** — spinner, "Planning mission..."
5. **Speaking** — speaker icon, TTS waveform; tap to barge-in
6. **Recording** — red dot + elapsed time

Interaction: click mic to push-to-talk; hold ⌥ for continuous session.

---

## Screen 1: Mission Control (hero)

The primary differentiator. Full-screen dashboard inspired by NASA Mission Control + Activity Monitor + SOC dashboards.

### Layout — three columns

```
┌─────────────────────────────────────────────────────────────────────────┐
│ MISSION CONTROL                    [Live ●]  [⏸ Pause all]  [🛑 KILL]  │
├──────────────────┬──────────────────────────────┬─────────────────────────┤
│  ACTIVE MISSIONS │     AGENT HIERARCHY          │   SYSTEM TELEMETRY      │
│  (left 25%)      │     (center 45%)             │   (right 30%)           │
│                  │                              │                         │
│  Mission cards   │  Tree/graph of agents        │  CPU / MEM / NET graphs │
│  + progress      │  + live comms feed           │  + cost ticker          │
│  + cost          │  + tool activity             │  + approval queue       │
│                  │                              │  + threat warnings      │
├──────────────────┴──────────────────────────────┴─────────────────────────┤
│  EVENT STREAM (full width, bottom 30%)                                  │
│  Scrolling structured log · filterable · click to drill down            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Panel 1A: Active missions (left)

**Widget: Mission card**

Each active mission renders as a compact card:

```
┌─────────────────────────┐
│ ● Website SEO Audit       │
│ ████████░░░░  67%         │
│ 3 agents · $0.84 / $5.00  │
│ ⚠ 1 approval pending      │
│ [Focus] [Pause] [Replay]  │
└─────────────────────────┘
```

- Progress bar = `completionPct`
- Cost = `budgetUsedUsd / budgetUsd` with color coding
- Click card → focuses center panel on that mission's agent tree
- "Focus" expands mission to full center view

**Empty state:** "No active missions. Say 'Director, create a mission' or click + New Mission."

### Panel 1B: Agent hierarchy (center)

**Widget: Agent tree graph**

Interactive node graph (SwiftUI + Canvas or lightweight graph lib):

```
                    [Director]
                   /    |    \
           [Browser] [SEO] [Report]
              |
         [Screenshot]
```

Node anatomy:

```
┌──────────────────┐
│ ● SEO Agent      │
│ running · 12% CPU│
│ $0.31 · 94 health│
└──────────────────┘
```

- Node color = status (green/blue/amber/red)
- Edge labels show message/tool flow (animated on activity)
- Click node → agent detail slide-over
- Double-click → open agent forensics

**Widget: Inter-agent comms feed**

Below tree, scrolling feed of `agent.message` events:

```
21:14:02  Director → SEO Agent     "Analyze homepage meta tags"
21:14:08  SEO Agent → Browser Agent "Navigate to /pricing"
21:14:15  Browser Agent → Director  "Screenshot captured"
```

Filter by agent, message type, time range.

### Panel 1C: System telemetry (right)

**Widget: System gauges (top)**

Four Swift Charts mini-gauges in 2×2 grid:

- CPU % (system + per-agent stacked)
- Memory MB
- Network KB/s (estimate — labeled "approx" in consumer build)
- Cost/minute ticker

**Widget: Approval queue**

Compact list of pending `approval.*` events:

```
🟠 Submit contact form     [Review]
🔴 Delete staging branch   [Review]
```

Click → opens Approval modal (Screen 8).

**Widget: Threat warnings**

Reserved for security anomalies:

- MCP server attempted out-of-envelope tool
- Agent exceeded permission boundary
- Unusual network destination
- Budget anomaly

### Panel 1D: Event stream (bottom)

Full-width scrolling log. Monospace rows:

```
21:14:02.401  agt_browser_02  browser.click     ✓  btn#submit  16ms
21:14:02.589  agt_seo_01      tool.completed    ✓  search       $0.002
21:14:03.102  agt_director_01 voice.command     ✓  mission.create
```

Interactions:

- Click row → event detail inspector (right slide-over)
- Filter chips: All · Voice · Agent · Tool · Browser · Approval · Cost
- Search box: FTS over event payload
- Pause stream button for inspection
- Export selection → JSON

### Mission Control global actions

| Action | Behavior |
|--------|----------|
| **Kill switch** (🛑) | Confirm dialog → terminate all agents, revoke browser sessions, stop recording |
| **Pause all** | Pause all running missions; agents checkpoint via LangGraph |
| **Live toggle** | Pause/resume event stream rendering (does not stop emission) |
| **Pop out** | Detach Mission Control to separate window (multi-monitor) |

---

## Screen 2: Missions

Mission library — active, completed, failed, draft.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Missions                    [+ New Mission]  [Search...]        │
├─────────────────────────────────────────────────────────────────┤
│ [Active] [Completed] [Failed] [Drafts]                         │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Website SEO Audit          active    67%    $0.84   Jun 7  │ │
│ │ Competitor Research        completed 100%   $2.14   Jun 6  │ │
│ │ Proposal from findings     draft      —       —     Jun 7  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Mission detail view (click row)

Tabbed detail:

| Tab | Contents |
|-----|----------|
| **Overview** | Objective, status, budget, timeline, spawned agents |
| **Timeline** | Chronological event list for this mission |
| **Agents** | Agents spawned for this mission + health |
| **Cost** | Cost breakdown chart by agent/model/tool |
| **Artifacts** | Screenshots, traces, exports |
| **Replay** | Launch replay (→ Screen 5) |

### New Mission flow

1. Voice or click "+ New Mission"
2. Modal: objective text field + optional budget + recording mode
3. Director plans → shows proposed agent roster for approval
4. User confirms → `mission.started` emitted → redirect to Mission Control

---

## Screen 3: Agents

Agent registry — resident experts + active mission agents.

### Layout

Split view: agent list (left) · agent detail (right).

**Agent list columns:** Name · Kind · Status · Mission · CPU · Cost · Health

**Agent detail tabs:**

| Tab | Contents |
|-----|----------|
| **Profile** | Role, permissions envelope, parent, spawn time |
| **Activity** | Recent events for this agent |
| **Tools** | Tools invoked, success rate |
| **Forensics** | "Why did this agent..." Q&A (Screen 9) |
| **Process** | PID, CPU/memory chart, kill button |

### Resident experts section

Pinned at top — always-warm agents (scheduling, email, browser session manager):

```
RESIDENT EXPERTS
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Email Triage │ │ Scheduler    │ │ Browser Mgr  │
│ ● idle       │ │ ● idle       │ │ ● running    │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Arkhe DNA Interface (primary organism view)

**Canonical spec:** `docs/DNA_INTERFACE.md`

The **Arkhe DNA** tab is the central identity and navigation surface — not a decorative sidebar widget.

Three layers stay **separate**:

| Layer | Surface | Role |
|-------|---------|------|
| **Arkhe DNA** | `Arkhe DNA` tab | Strand, chromosomes, genes, evolution |
| **Neural Mesh** | Live Mesh toggle on DNA + Mission Control comms | Real-time collaboration traffic |
| **Activity Monitor** | Observatory | CPU, tokens, cost, model routes |

#### Visual rules

| Visual | Meaning |
|--------|---------|
| Dark metallic spine | Base DNA strand |
| Chromosome band | Agent family (Executive, Personal, Development, …) |
| Gene segment | Individual agent — Arkhe color by family |
| Dim segment | Dormant agent |
| Pulsing segment | Active / busy agent |
| Live Mesh overlay | Synapse energy paths (cyan/gold) — **not** merged into strand identity |

#### Interaction

- **Click gene** → Agent Gene Detail Panel (status, model, express/sleep, forensics, link to Activity Monitor)
- **Live Mesh toggle** → collaboration overlay on strand
- **Zoom** → +/- on strand canvas
- **Evolution bar** → proposed new genes from Neural Mesh learning

Mission Control handles **mission execution**; DNA handles **what Arkhe is**.

Legacy Residents list UI is retired in favor of strand navigation. See `ArkheDNAInterfaceView`, `ArkheDNAStrandCanvas`, `AgentGeneDetailPanel`.

---

## Screen 4: Agent Browser

Dual-mode browser — user-facing WKWebView + agent automation overlay.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ ← → ↻  [https://arkhe.com          ]  [User] [Agent] [Split]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     WebKit render surface                       │
│                                                                 │
│  ┌─ Agent overlay (when Agent mode) ─────────────────────┐     │
│  │  ● SEO Agent is browsing                               │     │
│  │  Last action: click #pricing-link (2s ago)              │     │
│  │  [View trace] [Take control] [Approve next action]     │     │
│  └────────────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────────┤
│ Tabs: [Home] [Pricing] [+]     Agent session: mis_k7xQ2mN9      │
└─────────────────────────────────────────────────────────────────┘
```

### Modes

| Mode | Behavior |
|------|----------|
| **User** | Normal browsing; agents paused on this tab |
| **Agent** | Agent controls tab; user observes; orange/red gates surface as modals |
| **Split** | Side-by-side: user tab + agent tab (separate contexts) |

### Approval mode overlay

When agent hits orange/red action, browser dims and modal slides up:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠ Approval required                                            │
│                                                                 │
│  SEO Agent wants to submit the contact form on competitor.com  │
│                                                                 │
│  [Screenshot preview]                                           │
│                                                                 │
│  Risk: 🟠 Orange — Submitting data                             │
│                                                                 │
│  [Deny]  [Approve once]  [Approve for session]                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Screen 5: Replay Engine

Mission black box playback.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Replay: Website SEO Audit          [Fast ▾]  [⏮ ⏸ ⏭]  04:12  │
├──────────────────────────────┬──────────────────────────────────┤
│                              │  STEP INSPECTOR                   │
│   Video / screenshot canvas  │  Step 41 of 128                   │
│   + cursor overlay           │  browser.click #submit            │
│   + caption track            │  Agent: agt_browser_02            │
│                              │  [DOM snapshot] [Screenshot]      │
│                              │  Reasoning: "Form validated..."   │
├──────────────────────────────┴──────────────────────────────────┤
│  Timeline scrubber · event markers · cost markers · approval pins│
└─────────────────────────────────────────────────────────────────┘
```

### Replay modes

| Mode | Behavior |
|------|----------|
| **Fast** | 4× speed, skip idle |
| **Real-time** | 1× with original timings |
| **Step** | Manual advance; keyboard ← → |
| **Educational** | Pauses at decisions with narration overlay |

### Export actions (toolbar)

- PDF report
- JSON audit package
- MP4/MOV (horizontal)
- Vertical Reel (9:16)
- YouTube Short preset
- LinkedIn showcase preset
- Compliance package (ZIP: events + artifacts + audit chain)

### Self-marketing command

"Director, create a demo of what you just did" triggers:

1. Replay mission in educational mode
2. Generate narration (TTS)
3. Auto-caption (Whisper)
4. Render social clips
5. Export to chosen formats

Progress shown as a mission sub-task in Mission Control.

---

## Screen 6: Memory

Personal Knowledge Vault + mission memory browser.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Memory               [Search semantic...]  [Type ▾]  [Workspace ▾]│
├──────────────────┬──────────────────────────────────────────────┤
│  MEMORY TYPES    │  Results                                      │
│  ○ Conversation  │  ┌──────────────────────────────────────────┐│
│  ○ Project       │  │ Mission: SEO Audit — homepage uses H1...  ││
│  ○ Workspace     │  │ Source: agt_seo_01 · Jun 7 · mission      ││
│  ○ Screen        │  └──────────────────────────────────────────┘│
│  ○ Mission       │  ┌──────────────────────────────────────────┐│
│  ● Vault         │  │ Client Acme — prefers formal tone...      ││
│                  │  │ Source: workspace · May 28                ││
│                  │  └──────────────────────────────────────────┘│
└──────────────────┴──────────────────────────────────────────────┘
```

### Interactions

- Click chunk → expand with source events + option to redact
- "Teach agent" button → starts Agent Training recording (future)
- Retention policy badge per type
- Privacy shield indicator when continuous screen memory is off

---

## Screen 7: Observatory

Agent observability dashboard — Activity Monitor for AI workers.

### Layout — grid of charts

```
┌─────────────────────────────────────────────────────────────────┐
│ Observatory                              [Last 1h ▾]  [Export]  │
├────────────────────────────┬────────────────────────────────────┤
│  SYSTEM                    │  AGENTS                             │
│  [CPU line chart]          │  [Per-agent CPU stacked area]       │
│  [Memory line chart]       │  [Per-agent cost bar chart]         │
│  [Network estimate]        │  [Token usage line chart]           │
│  [Battery / thermals]      │  [Success rate by agent type]       │
├────────────────────────────┴────────────────────────────────────┤
│  MISSIONS                                                        │
│  [Completion % histogram]  [Cost per mission]  [Risk score trend] │
│  [Bottleneck heatmap — which agent types slow missions most]     │
└─────────────────────────────────────────────────────────────────┘
```

All charts built with Swift Charts. Click any data point → drill to agent or mission.

---

## Screen 8: Approvals

Dedicated approval inbox (also surfaced in Mission Control).

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Approvals (2 pending)                                           │
├─────────────────────────────────────────────────────────────────┤
│ 🟠 Submit contact form                                          │
│    SEO Agent · competitor.com · requested 2m ago                │
│    [Review]                                                     │
├─────────────────────────────────────────────────────────────────┤
│ 🔴 Delete staging branch                                        │
│    Deploy Agent · github.com/arkhe · requested 5m ago             │
│    [Review]                                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Review modal

- Full evidence: screenshots, DOM, reasoning summary, tool history
- Risk class badge with explanation
- Actions: Deny · Approve once · Approve for session · Approve always (dangerous, requires confirmation)

---

## Screen 9: Agent Forensics

Explainability panel — "Why did the SEO agent make this recommendation?"

Accessible from Agent detail or Replay step inspector.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Forensics: SEO Agent recommendation                             │
├─────────────────────────────────────────────────────────────────┤
│ QUESTION                                                        │
│ "Why did the SEO agent recommend changing the H1?"              │
├─────────────────────────────────────────────────────────────────┤
│ EVIDENCE CHAIN                                                  │
│ 1. browser.navigate arkhe.com (screenshot)                      │
│ 2. dom_snapshot — found H1: "Welcome" (screenshot)              │
│ 3. tool.search "H1 best practices 2026" (3 results)             │
│ 4. agent.message — reasoning summary                            │
├─────────────────────────────────────────────────────────────────┤
│ [View in replay] [Export evidence package]                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Screen 10: Settings

Standard macOS settings window (separate scene).

### Sections

| Section | Key controls |
|---------|--------------|
| **Voice** | Wake word, STT/TTS providers, privacy mode, barge-in |
| **Agents** | Default budgets, resident experts toggle, auto-retire threshold |
| **Recording** | Default mode, retention, redaction rules, no-record zones |
| **Security** | Permission defaults, MCP server allowlist, kill switch shortcut |
| **Memory** | Encryption, sync toggle, Supabase connection |
| **Economics** | Daily/monthly caps, model routing tier, cost alerts |
| **Enterprise** | Local-only mode, air-gapped toggle, audit export schedule |

---

## Interactions catalog

### Voice commands (Director)

| Utterance | System response |
|-----------|-----------------|
| "Director, audit my website" | Create mission → spawn agents → focus Mission Control |
| "Director, create a competitor research mission" | New mission modal pre-filled → plan → confirm |
| "Director, create a proposal from today's findings" | Mission using mission memory + report agent |
| "Director, record everything" | Set recording mode → red REC badge |
| "Director, stop" | Pause active missions |
| "Director, kill everything" | Kill switch confirmation |
| "Director, how much did that cost?" | Cost summary overlay |
| "Director, create a demo of what you just did" | Self-marketing export pipeline |
| "Director, why did [agent] do that?" | Open forensics |

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘1–8 | Sidebar navigation |
| ⌘K | Command palette |
| ⌘⇧K | Kill switch (with confirmation) |
| ⌘R | Toggle recording |
| ⌘. | Push-to-talk |
| Space | Pause/resume replay (in Replay screen) |

### Command palette (⌘K)

Fuzzy search over missions, agents, actions:

- "New mission"
- "Go to Mission Control"
- "Approve pending"
- "Export last mission"
- "Search memory: [query]"

---

## Empty states

Every screen needs a purposeful empty state with voice hint:

| Screen | Empty message |
|--------|---------------|
| Mission Control | "No agents running. Say 'Director, create a mission' to begin." |
| Missions | "No missions yet. Your mission history will appear here." |
| Agents | "No agents spawned. Agents appear when missions run." |
| Replay | "No recordings. Enable recording on your next mission." |
| Approvals | "All clear — no pending approvals." |

---

## Responsive / multi-monitor

- Mission Control designed for 1440×900 minimum; optimal at 1920×1080+
- Pop-out panels remember position per display
- Menu bar extra shows: active mission count, cost today, voice state, REC indicator

---

## MVP cut (what ships first)

| Screen | MVP scope |
|--------|-----------|
| Mission Control | Active missions + agent tree + event stream + kill switch |
| Missions | List + detail overview + timeline |
| Agents | List + profile + kill |
| Browser | Live dual-mode WKWebView + artifacts viewer; in-browser approvals (Premium) |
| Replay | Step-through + timeline scrubber, markers, educational narration, JSON export |
| Observatory | CPU + memory + cost charts + AI Resource Manager |
| Approvals | Queue + review modal + global banner |
| Memory | Local/vault search, MEMORIES.md, dreaming, audit export; click → forensics |
| Forensics | Evidence chain sheet from Agent/Replay/Memory/Mission Control; export package |
| Settings | Voice + budgets + recording mode |

---

## Implementation notes for SwiftUI

- `MissionControlView` — `@Observable` view model fed by IPC event subscription
- Charts — Swift Charts with `Chart` + `LineMark` + `BarMark`
- Agent tree — custom `Canvas` or integrate lightweight graph layout
- Event stream — `LazyVStack` with `@State` pause toggle; virtualize beyond 1000 rows
- Voice bar — `AVFoundation` metering + IPC to speech worker
- Browser — `WKWebView` via `NSViewRepresentable`
- All colors in Asset Catalog as semantic tokens (dark/light aware)
