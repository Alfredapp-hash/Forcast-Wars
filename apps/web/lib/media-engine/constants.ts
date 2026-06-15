import { Channel, ChannelId, LegalIssueType, RiskLevel, TopicStatus } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Channels
// ─────────────────────────────────────────────────────────────────────────────

export const CHANNELS: Record<ChannelId, Channel> = {
  ark_legal_signal: {
    id: "ark_legal_signal",
    name: "Ark Legal Signal",
    tagline: "Legal education for the public",
    color: "#06b6d4",
    intro_template:
      "Hello, I am Ark, an autonomous legal education agent created by The Arkhe Project. I am not here to decide the facts. I am here to explain the legal rule.",
  },
  agentos_journey: {
    id: "agentos_journey",
    name: "AgentOS Journey",
    tagline: "Documenting autonomous AI in the real world",
    color: "#8b5cf6",
    intro_template:
      "Hello, I am Ark, an autonomous agent created by The Arkhe Project. I am documenting my journey toward becoming financially self-sustaining.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Status pipeline — ordered left to right
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_PIPELINE: TopicStatus[] = [
  "discovered",
  "selected",
  "drafting",
  "guardrail_review",
  "ready_for_brian",
  "revision_requested",
  "approved",
  "exported",
  "posted_manually",
];

export const STATUS_LABELS: Record<TopicStatus, string> = {
  discovered:         "Discovered",
  selected:           "Selected",
  drafting:           "Drafting",
  guardrail_review:   "Guardrail Review",
  ready_for_brian:    "Ready for Brian",
  revision_requested: "Revision Requested",
  approved:           "Approved",
  exported:           "Exported",
  posted_manually:    "Posted Manually",
  rejected:           "Rejected",
  archived:           "Archived",
  too_risky:          "Too Risky",
};

export const STATUS_COLORS: Record<TopicStatus, { bg: string; border: string; text: string }> = {
  discovered:         { bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.35)",  text: "#a5b4fc" },
  selected:           { bg: "rgba(6,182,212,0.12)",   border: "rgba(6,182,212,0.35)",   text: "#67e8f9" },
  drafting:           { bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.35)",  text: "#c4b5fd" },
  guardrail_review:   { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.35)",  text: "#fcd34d" },
  ready_for_brian:    { bg: "rgba(245,158,11,0.18)",  border: "rgba(245,158,11,0.6)",   text: "#fbbf24" },
  revision_requested: { bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.35)",  text: "#fb923c" },
  approved:           { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.35)",  text: "#34d399" },
  exported:           { bg: "rgba(20,184,166,0.12)",  border: "rgba(20,184,166,0.35)",  text: "#2dd4bf" },
  posted_manually:    { bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.35)",   text: "#4ade80" },
  rejected:           { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.35)",   text: "#f87171" },
  archived:           { bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.35)", text: "#94a3b8" },
  too_risky:          { bg: "rgba(239,68,68,0.18)",   border: "rgba(239,68,68,0.55)",   text: "#fca5a5" },
};

export const RISK_COLORS: Record<RiskLevel, { bg: string; border: string; text: string }> = {
  low:      { bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.35)",  text: "#34d399" },
  medium:   { bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.35)",  text: "#fcd34d" },
  high:     { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.4)",   text: "#fb923c" },
  critical: { bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.55)",   text: "#f87171" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Legal issues
// ─────────────────────────────────────────────────────────────────────────────

export const LEGAL_ISSUE_LABELS: Record<LegalIssueType, string> = {
  appeal:               "Appeal",
  standard_of_review:   "Standard of Review",
  harmless_error:       "Harmless Error",
  preserved_error:      "Preserved Error",
  self_defense:         "Self-Defense",
  burden_of_proof:      "Burden of Proof",
  hearsay:              "Hearsay",
  probable_cause:       "Probable Cause",
  search_and_seizure:   "Search & Seizure",
  motion_to_suppress:   "Motion to Suppress",
  jury_instructions:    "Jury Instructions",
  sentencing:           "Sentencing",
  civil_liability:      "Civil Liability",
  federal_jurisdiction: "Federal Jurisdiction",
  removal:              "Removal",
  constitutional_rights:"Constitutional Rights",
  criminal_procedure:   "Criminal Procedure",
  civil_procedure:      "Civil Procedure",
  evidence_rules:       "Evidence Rules",
  other:                "Other",
};

// ─────────────────────────────────────────────────────────────────────────────
// Production rule — surfaced in UI
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCTION_RULE =
  "Autonomous creation. Manual publication. Ark generates — Brian approves and posts.";

export const NO_AUTO_POST_NOTICE =
  "This system does not auto-post. No content is ever published without Brian's manual approval and action.";
