# Arkhe AgentOS — Premium & Go Checklist

This is the living execution plan to take the current strong private alpha to a premium, shippable product that feels like the "Agent Neural Network" / "Arkhe Neural Mesh" vision.

Use the phases below. Quick wins and big swings are called out for maximum visible impact.

Status key: [ ] todo · [x] done · [~] in progress / partial

---

## Phase 0 — Alpha Closure & Hardening (Foundation for "Go")

- [~] Run full QA + manual tester script on a clean machine; document every friction (even small UI/UX ones). Script: `docs/MANUAL_TESTER_SCRIPT.md` (2026-06-07).
- [ ] Hardening: robust daemon reconnect with exponential backoff + visible "Reconnecting…" state in the app.
- [x] Hardening: bounded memory in all Swift ViewModels (eventLog capped, agents list, missions, etc.).
- [x] Error UX: clear, actionable banners/toasts for:
  - Daemon launch / connect failure
  - Local models unavailable (Ollama)
  - Apple Foundation Models unavailable (macOS version)
  - Supabase offline / sync degraded
  - Playwright / browser runtime issues
- [ ] Supabase security pass:
  - Add minimal RLS policies for `agents`, `agent_memories`, `agent_synapses` (or explicitly document "service-role daemon only" posture).
  - Re-run `get_advisors` (security + performance) and address new findings.
- [ ] Fix remaining PlaceholderScreen usage, dead code paths, and outdated docs/READMEs (especially macOS README claiming "browser — coming soon" when artifacts + partial live work exists).
- [ ] Expand `qa:alpha.mjs` + smoke scripts to cover:
  - Reconnect / daemon restart scenarios
  - Neural Mesh (synapse events + snapshot)
  - Dreaming / reflection flows
  - Failure paths (budget exceeded, approval denied, model fallback)
- [ ] Final Phase 0 gate: clean `pnpm qa:alpha` + manual tester script passes on a relatively clean Mac with no red error states on first launch.

---

## Phase 1 — Hero Experience & Visual Neural Mesh (Biggest "Premium" Delta)

This is where Arkhe stops feeling like "a bunch of agent UIs" and starts feeling like a living organizational brain.

- [ ] Mission Control — Inter-agent Comms Feed:
  - Scrolling live feed of recent `agent.message` + `synapse.*` events (from → to, summary, timestamp).
  - Placed under or beside the Agent Hierarchy panel.
- [ ] Mission Control — Interactive Agent Hierarchy:
  - Replace or augment the current grid of cards with a SwiftUI `Canvas` (or lightweight graph view) showing parent/child relationships.
  - Draw edges for recent communication / synapse activity.
  - Nodes show status color, role, CPU/cost/health.
  - Click node → focus / slide-over detail. Double-click → open forensics or agent view.
- [ ] Mission Control — Richer Telemetry & Safety:
  - Add threat/warning surface (budget anomalies, repeated approvals, permission boundary hits).
  - Stacked CPU chart (system + per-agent).
  - Live cost/min ticker + approval queue inside the telemetry panel.
  - "Focus" action on mission cards that filters the hierarchy + event stream.
- [ ] Neural Mesh / DNA Visualization (Residents or dedicated "Mesh" surface, or embeddable in Mission Control):
  - Canvas-based "chromosomes" (one per resident expert / core agent).
  - Visual language:
    - White / dim = installed but dormant
    - Soft Arkhe glow = active
    - Bright / intense glow = heavily used expert
    - Pulsing strand between chromosomes = live `synapse.message` or recent strengthening traffic
    - Thick strand = high learned weight
    - Thin strand = weak relationship
    - Gold / trusted strand = high weight + multiple successes (trusted pathway)
  - Cortex grouping (Core / Business / Personal / Development) with zoom or sections.
  - Click a strand → open replay or list of the missions/messages that strengthened it (forensics link).
  - Click a chromosome → jump to Residents detail or wake/sleep control.
- [ ] Live data wiring:
  - Propagate `synapse.*` events (message, strengthened, weakened, proposed_agent) into `MissionControlViewModel` and `ResidentsStore` in real time.
  - Update Residents Neural section (and any new Mesh view) on `expert_updated` + runtime snapshots that include `neuralMesh`.
- [ ] Phase 1 gate: Running a realistic multi-agent mission (e.g. audit or competitor research) makes Mission Control and the Residents/Mesh area feel dramatically more "alive" and visual than lists of cards. Testers comment that they "see the brain working."

---

## Phase 2 — Feature Completeness (Match the Rest of the Spec)

- [ ] Live Agent Browser (the big experiential gap):
  - Dual-mode (or tri-mode: User / Agent / Split) on a real WKWebView session tied to a mission.
  - Agent actions are highlighted/overlayed on the page in real time.
  - Orange/red actions surface approval modals directly inside the browser view (not just a global banner).
  - Split mode (user tab + agent-controlled tab) is a stretch but high-value.
- [~] Replay Engine v2:
  - [x] Timeline scrubber + visual markers (approval, browser, model/cost).
  - [x] Educational narration toggle (text summaries per step via `ForensicsHelper.narrateStep`).
  - [x] Mission JSON export from Replay toolbar.
  - [x] Forensics deep link from Replay step + `focusEventId` jump from forensics → replay.
  - [x] Compliance ZIP export from Replay toolbar (`mission-events.json`, `forensics-evidence.json`, `README.txt`, `artifacts/`).
  - [x] PDF summary export from Replay toolbar (`ReplayPDFExporter`).
  - [ ] TTS narration, MP4 export, "Director, create a demo…" flow.
- [x] First-class Forensics panel:
  - [x] Deep linkable from Agent detail, Replay step, Memory event row, Mission Control event stream.
  - [x] Evidence chain + focus payload JSON + evidence package export.
  - [ ] DNA strand click-to-forensics (Residents canvas).
- [ ] Command Palette (⌘K) + shortcuts:
  - Fuzzy search over missions, agents, residents, actions ("wake Research Agent", "new mission", "export last audit", "dream now", etc.).
  - Remaining documented keyboard shortcuts (sidebar numbers already exist; add more).
  - [x] Pop-out Mission Control to a new window (multi-monitor support) — `Window(id: mission-control-popout)`, ⌘⇧M + toolbar button.
- [x] Close "coming soon" / stub notes:
  - [x] Settings voice provider section (Whisper removed; Apple Speech only with planned note).
  - [x] macOS README and UI_UX_SPEC MVP table updated to current shipped state.
  - [x] PREMIUM_CHECKLIST stale "coming soon" meta-items resolved.
- [ ] Phase 2 gate: A tester can complete the full "audit my website" flow and export a beautiful, professional compliance-style package without leaving the app or using the terminal.

---

## Phase 3 — Premium Product Surface, Polish & Distribution "Go"

- [ ] Design system & visual polish:
  - Consistent semantic color tokens in Asset Catalog (dark/light aware).
  - Typography scale enforced everywhere.
  - Functional motion only (state transitions, live updates, strand pulses).
  - Uniform empty states, loading states, error banners across all screens.
  - Accessibility: VoiceOver labels, high-contrast support, full keyboard navigation, focus rings.
- [ ] Onboarding delight:
  - Progressive disclosure (don't overwhelm on first launch).
  - One-click "start with sensible defaults" path.
  - Clear, beautiful success/ready state.
  - Model readiness (Apple FM, Ollama, cloud) explained with graceful fallbacks.
- [~] Packaging & Distribution (the "Go" part):
  - [x] Automate notarization end-to-end (`infra/dev/notarize.sh` + `package-app.sh` DMG flow; requires Apple Developer credentials — see `docs/release/PACKAGING.md`).
  - [ ] Produce a clean, properly signed + notarized DMG from a single command (blocked: Developer ID + notarytool profile).
  - [x] First-launch verification improvements for bundled Node + Playwright on clean Macs (DaemonLauncher outcome + OnboardingView + SystemStatusStrip alerts).
  - [x] Auto-update path documented (Sparkle intended; manual DMG for alpha — `docs/release/PACKAGING.md`).
  - Universal binary / architecture notes handled cleanly.
- [~] Ops & support surface:
  - High-quality daemon + app logging that users can easily find and share.
  - [x] In-app "Send Feedback" or clear support path (Settings + Help menu — `SupportConfig`, mailto + GitHub issues).
  - [ ] Status / known issues surface (even a simple in-app list or link to a public page).
- [ ] Documentation refresh:
  - New or heavily updated PREMIUM_CHECKLIST.md (this file).
  - Update PRIVATE_ALPHA_CHECKLIST.md → mark what is now baseline.
  - AI_STACK.md, UI_UX_SPEC.md, EVENT_SCHEMA.md, PACKAGING.md, macOS README all reflect "Premium" reality vs vision.
  - User-facing "What's New" or release notes style content.
- [ ] Phase 3 gate: `./package:app` (or equivalent) → notarized DMG. Hand the DMG to a non-developer on a clean Mac. They complete onboarding, run a real mission, explore the Mesh, export artifacts, and it feels paid-for and delightful. No terminal required after install.

---

## Phase 4 — Go-to-Market & Sustainability (Parallelizable with Phase 3)

- [~] Narrative & marketing surface:
  - [x] Landing-quality copy (`docs/LANDING_COPY.md`) + in-app About blurb (Settings → About Arkhe AgentOS).
  - [ ] Screenshots / short video of the live DNA strands + pulsing Mission Control during a real mission.
- [~] Feedback & iteration loop:
  - [x] In-app feedback mechanism (mailto + GitHub issues; env-configurable URLs).
  - [x] Clear external support path (Settings + Help menu).
  - [ ] Early tester / design partner program process.
- [~] Business / pricing clarity (if "Premium" means paid tiers):
  - [x] Define tiers in `docs/LANDING_COPY.md` (Local / Pro / Enterprise).
  - [x] Reflect tier story in Settings → Economics (tier label + cap notes).
  - [ ] In-app upsell surfaces (billing not wired in alpha).
- [~] Legal / compliance basics:
  - [x] Privacy policy that covers local memory vault, Supabase sync, browser automation, and what data leaves the machine (`docs/PRIVACY.md`, linked from Settings).
  - [ ] Terms of service (especially around autonomous actions and approvals).
  - [ ] Any required notices for bundled components (Node, Playwright, etc.).
- [ ] Product telemetry (with privacy):
  - Opt-in or clearly disclosed usage metrics (number of missions, agent activation patterns, common drop-off points, model layer usage).
  - No sensitive content or vault data exfiltrated.
  - Dashboard or regular review process for the team.
- [ ] Phase 4 gate: You have a credible story and materials to take Arkhe beyond private alpha — whether that is paid early access, public beta, or enterprise pilots. The product, docs, and distribution support that story.

---

## Quick Wins (Do These Early for Visible Momentum)

- [ ] Add live inter-agent comms feed + simple Canvas edges in Mission Control.
- [ ] Turn the Residents "Neural Mesh" section into a basic Canvas (chromosomes + strands) — static weights first, then live.
- [x] Automate notarization end-to-end in the packaging scripts (`notarize.sh`; credentials human-only).
- [x] Add Command Palette skeleton (⌘K) + high-value actions (incl. attention scan, agent wakes, export, live browser). Enhanced fuzzy + "alfred"/"attention"/"video" etc. (p2-4 / attn-5)
- [x] Fix all obvious "coming soon" / placeholder / stale language in READMEs and Settings.

---

## Big Swings (These Create the "This Is Different" Moment)

- [ ] Full interactive agent graph + pulsing synapse strands in Mission Control (the living hierarchy).
- [ ] Live dual-mode (or tri-mode) Agent Browser with in-browser orange/red approval modals.
- [ ] Rich Replay export pipeline + educational narration mode ("create a demo of what you just did").
- [~] **Arkhe DNA Interface (restored core requirement — `docs/DNA_INTERFACE.md`)**
  - [x] Three-layer separation: DNA (identity) vs Neural Mesh (live comms overlay) vs Activity Monitor (Observatory).
  - [x] Primary `Arkhe DNA` tab with chromosome-grouped strand canvas + gene detail panel.
  - [x] Live Mesh toggle (synapse overlay — not merged with DNA identity).
  - [ ] Helical 3D strand, rotation, agents "writing in" spawn animation, full gene panel fields (CPU, memories, version history).
  - [ ] DNA as center of Mission Control dashboard (currently DNA tab is primary nav).
- [~] **Attention Cortex / Autonomous Media Company** Trend Intelligence + Opportunity + Content + Video Production (Veo/Runway/Kling/Hailuo) + YouTube + Marketing + Analytics + Dreaming (Media) agents forming a self-improving attention manufacturing loop. 80% valuable content + 20% meta "how Alfred made this" storytelling. Daily autonomous wake-up that finds trends, scores opportunities, produces video, publishes, measures, dreams, and evolves the Neural Mesh via measurable performance signals.
  - [x] Full event chain + UI + media dreaming loop + autonomous scheduler.
  - [x] Real YouTube Data API v3 trend polling (`YOUTUBE_API_KEY` + optional `YOUTUBE_TREND_QUERY`).
  - [~] Real X/Reddit trends, video gen HTTP, YouTube upload OAuth, analytics ingest.
  - [x] YouTube `videos.insert` resumable upload when OAuth + `localPath`/`storageRef`/`ARKHE_YOUTUBE_UPLOAD_PATH` set; stub fallback otherwise.

## Self-Documentary — OS Documenting Its Own Development

Autonomous YouTube channel where Arkhe AgentOS documents real development toward financial independence. Spec: `docs/SELF_DOCUMENTARY.md`.

- [x] Phase 1 foundations — daemon module (`apps/local-daemon/src/documentary/`), config store, pipeline stub, agent definitions, sanitization stubs, Financial Governor, journal stub.
- [x] `documentary.*` events in `packages/contracts/src/events.ts`.
- [x] Daemon scheduler + IPC (`documentary_config`, `documentary_run`).
- [x] Settings → Self-Documentary strip (mode, last run, sustainability score).
- [x] Genesis chromosome (dormant) in `ArkheDNATheme.swift`.
- [x] Example config `apps/local-daemon/config/documentary-config.example.json`.
- [ ] Phase 2 — real capture, ffmpeg render, TTS/captions, supervised approval UI, blog cross-post.
- [ ] Phase 2 — register documentary agent team in AgentRegistry; journal persistence.
- [ ] Phase 3 — autonomous YouTube publish with synthetic media disclosure; analytics feedback loop.
- [ ] Phase 3 — public sustainability dashboard; Genesis chromosome activation.
- [ ] Phase 4 — multi-series scheduling, A/B experiments, comment triage.

---

## Ultimate Vision — From Voice Assistant to Autonomous Media Company Inside AgentOS

Don't build a system that markets itself. Build a system that learns what gets attention and then manufactures attention.

The Attention Cortex runs the closed loop:

Find Trends → Predict Opportunity → Generate Content (script/hook/storyboard) → Produce Video (external best-in-class models) → Publish (YouTube + social) → Market → Analyze Results (CTR, retention, subs) → Dream/Reflect ("why did this work?") → Update Neural Mesh synapses + propose new specialist creators → Improve.

This is not an add-on feature. It is a new cortex that makes Arkhe an actual operating system for an AI-native media business. The meta content layer (Alfred explaining how it spotted the trend, generated the assets, and why it succeeded) creates a fascinating flywheel: viewers consume the valuable content *and* the story of the AI operating system that created it.

Video model strategy (documented in AI_STACK.md):
- Grok / strong locals for ideation and scripting.
- Veo for top-tier realism and storytelling.
- Runway for production pipelines and iteration.
- Kling for fast social ROI.
- Hailuo for character consistency and stylized work.

All of this re-uses and strengthens the existing architecture: Director for mission planning, SynapseEngine for agent relationships, DNI memory stack for L1/L2/L3, DreamingService (extended for media reflections), and the Neural Mesh for long-term evolution of better content agents.

---

## Final Validation Gate (Ship-Ready Bar)

- [ ] Full clean build: `pnpm build` + `xcodebuild` (Release) with no errors.
- [x] `pnpm qa:alpha` passes cleanly (with daemon running; script auto-resolves approvals — see `docs/QA_FRICTIONS.md`).
- [~] `pnpm package:app` produces unsigned/ad-hoc DMG; notarized DMG requires `notarize.sh` + Apple credentials.
- [~] Manual tester script (`docs/MANUAL_TESTER_SCRIPT.md`, updated for premium) passes end-to-end on a clean machine:
  1. Fresh install / first launch.
  2. Onboarding completes without red errors.
  3. Residents + wake an expert.
  4. Voice or typed mission ("Director, audit my website at arkhe.com").
  5. Approvals handled.
  6. Observatory shows live AI resources.
  7. Browser artifacts + live preview.
  8. Missions → Replay with exports.
  9. Memory (local + Ark Vault + editable MEMORIES.md + Dream Now).
  10. Neural Mesh / DNA view shows meaningful synapses and at least one proposed emergent expert.
  11. Kill switch + graceful cleanup.
- [ ] No major jank, memory growth, or reconnect failures during a 20–30 minute realistic session.
- [ ] Docs (this checklist + UI spec + AI stack + packaging) accurately describe the shipped state and the remaining roadmap.

---

**Owner note**: This checklist is the single source of truth for the Premium & Go effort. Update statuses as work progresses. When a phase gate is passed, add a short "Gate passed on <date>" note at the bottom of the relevant section.

Current overall status: Executing from the full audit & plan (all phases + quick wins + big swings + final validation). Attention Cortex / Autonomous Media Company architecture and initial scaffolding (cortex type + 8 specialist agents in registry, docs, events) have been incorporated as a top-tier big swing.
