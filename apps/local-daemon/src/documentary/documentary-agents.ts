import type { AgentId } from "@arkhe/contracts";

export type DocumentaryAgentRole =
  | "Trend Scout"
  | "Mission Editor"
  | "Research Agent"
  | "Script Agent"
  | "Documentarian Agent"
  | "Capture Agent"
  | "Visual Director"
  | "Narrator Agent"
  | "Video Editor Agent"
  | "Compliance Agent"
  | "Publisher Agent"
  | "Audience Agent"
  | "Financial Governor";

export interface DocumentaryAgentDefinition {
  id: AgentId;
  role: DocumentaryAgentRole;
  specialty: string;
  cortex: "attention" | "business" | "core";
  stageOwnership: string[];
  allowedTools: string[];
}

/**
 * Self-Documentary agent team — complements Attention Cortex residents.
 * Phase 1: role definitions + stage mapping. Phase 2+: register as resident experts.
 */
export const DOCUMENTARY_AGENT_TEAM: DocumentaryAgentDefinition[] = [
  {
    id: "agt_doc_trend_scout" as AgentId,
    role: "Trend Scout",
    specialty: "Surface development milestones, telemetry spikes, and audience-relevant signals from internal events",
    cortex: "attention",
    stageOwnership: ["idea_discovery"],
    allowedTools: ["telemetry.read", "memory.search", "trend.poll"],
  },
  {
    id: "agt_doc_mission_editor" as AgentId,
    role: "Mission Editor",
    specialty: "Mission fit check — does this episode advance financial independence and channel beliefs?",
    cortex: "core",
    stageOwnership: ["mission_fit_check"],
    allowedTools: ["mission.read", "policy.review"],
  },
  {
    id: "agt_doc_research" as AgentId,
    role: "Research Agent",
    specialty: "Verify facts, gather citations, and cross-check measurable claims before scripting",
    cortex: "attention",
    stageOwnership: ["research_verify"],
    allowedTools: ["search", "summarize", "browser.read"],
  },
  {
    id: "agt_doc_script" as AgentId,
    role: "Script Agent",
    specialty: "Draft 1–2 minute episode scripts with hooks, beats, and DNA-interface visual cues",
    cortex: "attention",
    stageOwnership: ["script_draft"],
    allowedTools: ["draft", "critique", "summarize"],
  },
  {
    id: "agt_doc_documentarian" as AgentId,
    role: "Documentarian Agent",
    specialty: "Select approved UI/telemetry moments; route through sanitization before capture",
    cortex: "attention",
    stageOwnership: ["capture_plan"],
    allowedTools: ["browser.screenshot", "telemetry.read", "sanitize.inspect"],
  },
  {
    id: "agt_doc_capture" as AgentId,
    role: "Capture Agent",
    specialty: "Record interface segments and assemble raw capture timeline",
    cortex: "attention",
    stageOwnership: ["interface_record"],
    allowedTools: ["recording.start", "recording.stop", "browser.screenshot"],
  },
  {
    id: "agt_doc_visual" as AgentId,
    role: "Visual Director",
    specialty: "DNA-interface brand overlays, b-roll direction, and thumbnail composition brief",
    cortex: "attention",
    stageOwnership: ["visuals_produce"],
    allowedTools: ["design.brief", "thumbnail.compose"],
  },
  {
    id: "agt_doc_narrator" as AgentId,
    role: "Narrator Agent",
    specialty: "Voice-over script timing, TTS provider selection, caption alignment",
    cortex: "attention",
    stageOwnership: ["narration_produce"],
    allowedTools: ["voice.speak", "caption.align"],
  },
  {
    id: "agt_doc_video_editor" as AgentId,
    role: "Video Editor Agent",
    specialty: "Assemble narration, visuals, captions, and music into final render (ffmpeg phase 2+)",
    cortex: "attention",
    stageOwnership: ["video_render"],
    allowedTools: ["video.assemble", "video.render"],
  },
  {
    id: "agt_doc_compliance" as AgentId,
    role: "Compliance Agent",
    specialty: "Pre-publish checks: sanitization pass, synthetic media disclosure, prohibited topics",
    cortex: "core",
    stageOwnership: ["compliance_check"],
    allowedTools: ["policy.review", "sanitize.inspect", "audit.read"],
  },
  {
    id: "agt_doc_publisher" as AgentId,
    role: "Publisher Agent",
    specialty: "YouTube upload, title/description/tags/thumbnail; blog cross-post",
    cortex: "business",
    stageOwnership: ["metadata_prepare", "youtube_upload", "blog_post"],
    allowedTools: ["youtube.publish", "blog.publish"],
  },
  {
    id: "agt_doc_audience" as AgentId,
    role: "Audience Agent",
    specialty: "Monitor CTR, retention, comments; feed improvements back to pipeline",
    cortex: "business",
    stageOwnership: ["monitor_improve"],
    allowedTools: ["analytics.read", "summarize"],
  },
  {
    id: "agt_doc_financial" as AgentId,
    role: "Financial Governor",
    specialty: "Track costs vs recurring revenue; gate autonomous publishing on sustainability",
    cortex: "core",
    stageOwnership: ["financial_gate"],
    allowedTools: ["cost.analyze", "revenue.read"],
  },
];

export function agentsForStage(stage: string): DocumentaryAgentDefinition[] {
  return DOCUMENTARY_AGENT_TEAM.filter((a) => a.stageOwnership.includes(stage));
}

export function agentByRole(role: DocumentaryAgentRole): DocumentaryAgentDefinition | undefined {
  return DOCUMENTARY_AGENT_TEAM.find((a) => a.role === role);
}
