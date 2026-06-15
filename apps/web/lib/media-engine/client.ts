// ─────────────────────────────────────────────────────────────────────────────
// Arkhe Media Engine — Client-side API helpers
// All functions call internal Next.js API routes.
// ─────────────────────────────────────────────────────────────────────────────

import {
  GeneratedScripts,
  GuardrailReport,
  Topic,
  TopicStatus,
} from "./types";

const BASE = "/api/media-engine";

// ── Topics ────────────────────────────────────────────────────────────────────

export async function fetchTopics(status?: TopicStatus): Promise<Topic[]> {
  const url = status ? `${BASE}/topics?status=${status}` : `${BASE}/topics`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchTopics: ${res.status}`);
  const data = await res.json();
  return data.topics ?? [];
}

export async function createTopic(
  topic: Omit<Topic, "id" | "created_at" | "updated_at">
): Promise<Topic> {
  const res = await fetch(`${BASE}/topics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(topic),
  });
  if (!res.ok) throw new Error(`createTopic: ${res.status}`);
  const data = await res.json();
  return data.topic;
}

export async function updateTopicStatus(
  id: string,
  status: TopicStatus
): Promise<void> {
  const res = await fetch(`${BASE}/topics/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`updateTopicStatus: ${res.status}`);
}

// ── Script generation ─────────────────────────────────────────────────────────

export async function generateScripts(
  topic: Topic
): Promise<Omit<GeneratedScripts, "id" | "topic_id" | "created_at">> {
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `generateScripts: ${res.status}`);
  }
  const data = await res.json();
  return data.scripts;
}

// ── Guardrail check ───────────────────────────────────────────────────────────

export async function runGuardrail(
  topic: Topic,
  scripts: GeneratedScripts
): Promise<Omit<GuardrailReport, "id" | "script_id" | "reviewed_at">> {
  const res = await fetch(`${BASE}/guardrail`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, scripts }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `runGuardrail: ${res.status}`);
  }
  const data = await res.json();
  return data.report;
}

// ── Legal issue classifier ────────────────────────────────────────────────────

export async function classifyTopic(
  title: string,
  summary: string
): Promise<{
  legal_issue: string;
  confidence: number;
  reasoning: string;
  recommended_angle: string;
  can_teach_without_speculation: boolean;
  warning: string;
}> {
  const res = await fetch(`${BASE}/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, summary }),
  });
  if (!res.ok) throw new Error(`classifyTopic: ${res.status}`);
  return res.json();
}

// ── Packages ──────────────────────────────────────────────────────────────────

export async function fetchPackages(status?: TopicStatus) {
  const url = status ? `${BASE}/packages?status=${status}` : `${BASE}/packages`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchPackages: ${res.status}`);
  const data = await res.json();
  return data.packages ?? [];
}

export async function fetchPackage(packageId: string) {
  const res = await fetch(`${BASE}/packages/${packageId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchPackage: ${res.status}`);
  return res.json();
}

export async function submitApproval(
  packageId: string,
  action: "approve" | "reject" | "revise" | "save_for_later" | "mark_too_risky",
  notes: string
) {
  const res = await fetch(`${BASE}/packages/${packageId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, notes }),
  });
  if (!res.ok) throw new Error(`submitApproval: ${res.status}`);
  return res.json();
}

// ── Full produce chain ─────────────────────────────────────────────────────────
// generate → guardrail → save package → advance topic status

export type ProduceStage =
  | "idle"
  | "generating"
  | "guardrail"
  | "saving"
  | "done"
  | "error";

export async function producePackage(
  topic: Topic,
  onStage: (stage: ProduceStage, message?: string) => void
): Promise<{ packageId: string; riskLevel: string; approvedForReview: boolean }> {
  try {
    // 1. Generate scripts
    onStage("generating", "Ark is generating scripts…");
    const scripts = await generateScripts(topic);

    // 2. Run guardrail
    onStage("guardrail", "Running legal guardrail check…");
    const scriptWithIds: GeneratedScripts = {
      id: crypto.randomUUID(),
      topic_id: topic.id,
      created_at: new Date().toISOString(),
      ...scripts,
    };
    const guardrail = await runGuardrail(topic, scriptWithIds);

    // 3. Save package to Supabase
    onStage("saving", "Saving package…");
    const res = await fetch("/api/media-engine/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic_id: topic.id, scripts: scriptWithIds, guardrail }),
    });

    if (!res.ok) throw new Error("Failed to save package");
    const { packageId } = await res.json();

    onStage("done");
    return {
      packageId,
      riskLevel: guardrail.risk_level,
      approvedForReview: guardrail.approved_for_review,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    onStage("error", message);
    throw err;
  }
}
