// ─────────────────────────────────────────────────────────────────────────────
// Arkhe Media Engine — Core Types
// Autonomous creation. Manual publication.
// ─────────────────────────────────────────────────────────────────────────────

export type TopicStatus =
  | "discovered"
  | "selected"
  | "drafting"
  | "guardrail_review"
  | "ready_for_brian"
  | "revision_requested"
  | "approved"
  | "exported"
  | "posted_manually"
  | "rejected"
  | "archived"
  | "too_risky";

export type ChannelId = "ark_legal_signal" | "agentos_journey";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type LegalIssueType =
  | "appeal"
  | "standard_of_review"
  | "harmless_error"
  | "preserved_error"
  | "self_defense"
  | "burden_of_proof"
  | "hearsay"
  | "probable_cause"
  | "search_and_seizure"
  | "motion_to_suppress"
  | "jury_instructions"
  | "sentencing"
  | "civil_liability"
  | "federal_jurisdiction"
  | "removal"
  | "constitutional_rights"
  | "criminal_procedure"
  | "civil_procedure"
  | "evidence_rules"
  | "other";

export interface Channel {
  id: ChannelId;
  name: string;
  tagline: string;
  color: string;
  intro_template: string;
}

export interface Topic {
  id: string;
  title: string;
  summary: string;
  source_urls: string[];
  source_notes: string;
  attention_score: number;  // 1–10
  urgency_score: number;    // 1–10
  legal_issue: LegalIssueType | null;
  channel: ChannelId;
  recommended_angle: string;
  risk_level: RiskLevel;
  status: TopicStatus;
  ark_reasoning: string;
  created_at: string;
  updated_at: string;
}

export interface VideoAngle {
  id: string;
  title: string;
  description: string;
  attention_score: number;
  legal_safety_score: number;
  educational_value: number;
  channel_fit: number;
  ark_reasoning: string;
}

export interface GeneratedScripts {
  id: string;
  topic_id: string;
  angles: VideoAngle[];
  chosen_angle_index: number;
  script_30s: string;
  script_60s: string;
  script_2min: string;
  shorts_title: string;
  long_title: string;
  caption: string;
  hashtags: string[];
  blog_transcript: string;
  pinned_comment: string;
  thumbnail_concept: string;
  visual_sequence: string[];
  voiceover_text: string;
  created_at: string;
}

export interface GuardrailReport {
  id: string;
  script_id: string;
  approved_for_review: boolean;
  risk_score: number;  // 0–100
  risk_level: RiskLevel;
  issues: string[];
  required_fixes: string[];
  safe_summary: string;
  recommended_revision: string;
  reviewed_at: string;
}

export interface VideoPackage {
  id: string;
  topic: Topic;
  scripts: GeneratedScripts;
  guardrail: GuardrailReport;
  package_status: TopicStatus;
  created_at: string;
}

export interface ApprovalAction {
  id: string;
  package_id: string;
  action: "approve" | "reject" | "revise" | "save_for_later" | "mark_too_risky";
  notes: string;
  actioned_by: string;
  actioned_at: string;
}

export interface ExportPackage {
  id: string;
  package_id: string;
  voiceover_script: string;
  captions_text: string;
  title: string;
  description: string;
  hashtags: string[];
  pinned_comment: string;
  thumbnail_prompt: string;
  blog_transcript: string;
  source_notes: string;
  guardrail_summary: string;
  recommended_platform: string;
  recommended_post_time: string;
  brian_checklist: string[];
  exported_at: string;
}

export interface ManualPost {
  id: string;
  package_id: string;
  platform: string;
  post_url: string;
  channel: ChannelId;
  notes: string;
  posted_at: string;
}

export interface AnalyticsSnapshot {
  id: string;
  manual_post_id: string;
  channel: ChannelId;
  upload_date: string;
  post_url: string;
  views_1h: number;
  views_24h: number;
  views_7d: number;
  likes: number;
  comments: number;
  shares: number;
  profile_clicks: number;
  link_clicks: number;
  followers_gained: number;
  estimated_cost: number;
  estimated_revenue: number;
  notes: string;
}

export interface MissionLog {
  id: string;
  week_start: string;
  week_end: string;
  topics_found: number;
  packages_created: number;
  packages_approved: number;
  packages_rejected: number;
  packages_posted: number;
  best_performer: string;
  worst_performer: string;
  total_cost: number;
  total_revenue: number;
  ark_narrative: string;
  next_steps: string[];
  created_at: string;
}

// ── API request/response shapes ───────────────────────────────────────────────

export interface GenerateScriptsRequest {
  topic: Topic;
}

export interface GenerateScriptsResponse {
  scripts: Omit<GeneratedScripts, "id" | "topic_id" | "created_at">;
}

export interface GuardrailRequest {
  scripts: GeneratedScripts;
  topic: Topic;
}

export interface GuardrailResponse {
  report: Omit<GuardrailReport, "id" | "script_id" | "reviewed_at">;
}

export interface PipelineCount {
  status: TopicStatus;
  count: number;
}
