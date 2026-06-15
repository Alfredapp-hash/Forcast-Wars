import { AgentNodeData } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Arkhe Media Engine — Production Agents
// These are the real agents in The Arkhe Project pipeline.
// Hermes (system) = center core.
// STRAND A (analytics/memory/planner/voice = left cyan rail): classifier, memory, guardrail, voice
// STRAND B (content/finance/browser/code = right purple rail):  script, package, scout, revenue
// ─────────────────────────────────────────────────────────────────────────────

export const sampleAgents: AgentNodeData[] = [
  // ── Center core ──────────────────────────────────────────────────────────
  {
    id: "hermes",
    name: "Hermes Message Bus",
    shortName: "HERMES",
    type: "system",
    status: "active",
    load: 72,
    memoryUse: 44,
    task: "Routing pipeline state between all agents",
    revenueLinked: false,
    costPerHour: 0.12,
    lastEvent: "State synced across pipeline",
  },

  // ── Strand A — Ops / Intel (left cyan) ───────────────────────────────────
  {
    id: "ark-classifier",
    name: "Legal Issue Classifier",
    shortName: "CLASS",
    type: "analytics",
    status: "active",
    load: 61,
    memoryUse: 38,
    task: "Classifying legal issues in new topics",
    parentId: "hermes",
    revenueLinked: false,
    costPerHour: 0.08,
    lastEvent: "Classified: appeal → standard_of_review",
  },
  {
    id: "ark-memory",
    name: "Mission Memory",
    shortName: "MEM",
    type: "memory",
    status: "thinking",
    load: 53,
    memoryUse: 81,
    task: "Indexing topic research + source notes",
    parentId: "hermes",
    revenueLinked: false,
    costPerHour: 0.14,
    lastEvent: "Stored 3 source links for Appeal Week",
  },
  {
    id: "ark-guardrail",
    name: "Legal Guardrail",
    shortName: "GUARD",
    type: "planner",
    status: "active",
    load: 88,
    memoryUse: 46,
    task: "Running risk check on generated scripts",
    parentId: "hermes",
    revenueLinked: false,
    costPerHour: 0.11,
    lastEvent: "Risk score: 4/100 — approved",
  },
  {
    id: "ark-voice",
    name: "Voiceover Prep",
    shortName: "VOICE",
    type: "voice",
    status: "idle",
    load: 9,
    memoryUse: 14,
    task: "Waiting for approved script to convert",
    parentId: "hermes",
    revenueLinked: true,
    costPerHour: 0.03,
    lastEvent: "Ready for next approved script",
  },

  // ── Strand B — Output / Build (right purple) ──────────────────────────────
  {
    id: "ark-script",
    name: "Script Generator",
    shortName: "SCRIPT",
    type: "content",
    status: "active",
    load: 94,
    memoryUse: 58,
    task: "Writing 30s / 60s / 2min scripts",
    parentId: "hermes",
    revenueLinked: true,
    costPerHour: 0.31,
    lastEvent: "Generated 3 angles for Appeal topic",
  },
  {
    id: "ark-package",
    name: "Package Builder",
    shortName: "PKG",
    type: "code",
    status: "thinking",
    load: 47,
    memoryUse: 33,
    task: "Assembling video package for Brian",
    parentId: "hermes",
    revenueLinked: true,
    costPerHour: 0.09,
    lastEvent: "Bundle ready → status: ready_for_brian",
  },
  {
    id: "ark-scout",
    name: "Trend Scout",
    shortName: "SCOUT",
    type: "browser",
    status: "active",
    load: 76,
    memoryUse: 29,
    task: "Scanning legal news for high-attention topics",
    parentId: "hermes",
    revenueLinked: false,
    costPerHour: 0.07,
    lastEvent: "Found: appeal week opportunity",
  },
  {
    id: "ark-revenue",
    name: "Revenue Monitor",
    shortName: "REV",
    type: "finance",
    status: "thinking",
    load: 39,
    memoryUse: 27,
    task: "Tracking cost vs revenue vs sustainability",
    parentId: "hermes",
    revenueLinked: true,
    costPerHour: 0.06,
    lastEvent: "Net: -$0.54 — Week 1 baseline",
  },
];

// Replace with live pipeline data via Supabase Realtime or polling for production.
