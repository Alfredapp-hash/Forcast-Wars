import type { ModelTaskClass } from "@arkhe/contracts";

/** Arkhe AI stack layers — cheapest capable model wins */
export type AiStackLayer = 1 | 2 | 3 | 4;

export type AiProvider =
  | "apple_foundation"
  | "local_free"
  | "free_cloud"
  | "paid_cloud"
  | "mock";

export const LAYER_LABELS: Record<AiStackLayer, string> = {
  1: "Apple Foundation (Local Free)",
  2: "Ollama (Local Heavy)",
  3: "Specialist Agent",
  4: "Premium Cloud",
};

/** Layer 1 — Apple FM: voice, classification, quick summaries, UI assist */
const LAYER_1_TASKS = new Set<ModelTaskClass>([
  "classify_intent",
  "summarize_page",
  "critique_output",
]);

/** Layer 2 — Ollama: planning, research, multi-step reasoning, drafts */
const LAYER_2_TASKS = new Set<ModelTaskClass>([
  "plan_mission",
  "extract_facts",
  "draft_report",
  "choose_next_tool",
]);

/** Resident expert roles map to preferred Ollama models */
export const EXPERT_MODEL_PREFERENCES: Record<string, string> = {
  "SEO Agent": "qwen3:8b",
  "Research Agent": "deepseek-r1:8b",
  "Coding Agent": "qwen3:14b",
  "Report Agent": "mistral-small",
  "Marketing Agent": "llama3.2",
  "Memory Agent": "llama3.2",
  "Scheduler Agent": "llama3.2",
  "CRM Agent": "llama3.2",
  "Ark Vault Agent": "llama3.2",
  "Browser Agent": "llama3.2",
  "General Agent": "llama3.2",
};

/** Cloud escalation triggers */
const CLOUD_TASKS = new Set<ModelTaskClass>(["plan_mission", "draft_report"]);
const CODING_ROLES = new Set(["Coding Agent", "Coding Expert"]);

export interface StackRouteInput {
  taskClass: ModelTaskClass;
  input: string;
  agentRole?: string;
  requiresHighReasoning?: boolean;
  privacyMode?: boolean;
}

export interface StackRoutePlan {
  layer: AiStackLayer;
  provider: AiProvider;
  model: string;
  reason: string;
  estimatedCostUsd: number;
  confidence: number;
  escalationPath: string[];
}

export function planStackRoute(input: StackRouteInput): StackRoutePlan {
  const escalationPath: string[] = [];
  const appleAvailable = process.env.ARKHE_APPLE_FOUNDATION_MODELS === "1";
  const ollamaEnabled = process.env.ARKHE_LOCAL_MODELS !== "0";
  const cloudEnabled = process.env.ARKHE_PAID_CLOUD === "1" || Boolean(process.env.ARKHE_OPENAI_API_KEY);
  const inputLength = input.input.length;
  const role = input.agentRole ?? "";
  const needsCoding = CODING_ROLES.has(role) || input.input.toLowerCase().includes("code");
  const needsDeepReasoning =
    input.requiresHighReasoning ||
    input.taskClass === "plan_mission" ||
    needsCoding ||
    inputLength > 4000;

  // Coding Agent always escalates to Layer 4 cloud when configured
  if (CODING_ROLES.has(role) && cloudEnabled) {
    const model = process.env.ARKHE_OPENAI_CODING_MODEL ?? "gpt-4.1";
    return {
      layer: 4,
      provider: "paid_cloud",
      model: `openai/${model}`,
      reason: "Coding Agent activated — routed to cloud coding model (GPT-class).",
      estimatedCostUsd: estimateCloudCost(input.input.length),
      confidence: 0.93,
      escalationPath: ["Coding Agent active", "YES → Cloud coding model"],
    };
  }

  // Layer 1: Apple Foundation Models
  escalationPath.push("Can Apple do it?");
  if (
    appleAvailable &&
    LAYER_1_TASKS.has(input.taskClass) &&
    !needsDeepReasoning &&
    inputLength < 2000
  ) {
    return {
      layer: 1,
      provider: "apple_foundation",
      model: "apple-foundation-local",
      reason: "Lightweight task fits Apple Foundation Models on-device ($0/request).",
      estimatedCostUsd: 0,
      confidence: 0.86,
      escalationPath: [...escalationPath, "YES → Apple"],
    };
  }
  escalationPath.push("NO → check Ollama");

  // Layer 2: Ollama local heavy
  escalationPath.push("Can Ollama do it?");
  if (ollamaEnabled && (LAYER_2_TASKS.has(input.taskClass) || !needsDeepReasoning)) {
    const model =
      EXPERT_MODEL_PREFERENCES[role] ??
      process.env.ARKHE_OLLAMA_MODEL ??
      "qwen3:8b";
    return {
      layer: 2,
      provider: "local_free",
      model: `ollama/${model}`,
      reason: `Local Ollama model sufficient for ${input.taskClass} ($0 after hardware).`,
      estimatedCostUsd: 0,
      confidence: needsDeepReasoning ? 0.72 : 0.8,
      escalationPath: [...escalationPath, "YES → Ollama"],
    };
  }
  escalationPath.push("NO → check specialists/cloud");

  // Layer 3: Specialist agent path (still local-first, higher-capacity model)
  escalationPath.push("Activate specialist agent?");
  if (ollamaEnabled && role) {
    const model = EXPERT_MODEL_PREFERENCES[role] ?? "qwen3:14b";
    return {
      layer: 3,
      provider: "local_free",
      model: `ollama/${model}`,
      reason: `${role} specialist activated with preferred local model.`,
      estimatedCostUsd: 0,
      confidence: 0.78,
      escalationPath: [...escalationPath, "YES → Specialist + Ollama"],
    };
  }

  // Layer 4: Premium cloud — only when confidence would be low or coding/research needs cloud
  escalationPath.push("Need cloud escalation?");
  if (cloudEnabled && (needsCoding || needsDeepReasoning || CLOUD_TASKS.has(input.taskClass))) {
    const model = needsCoding
      ? (process.env.ARKHE_OPENAI_CODING_MODEL ?? "gpt-4.1")
      : (process.env.ARKHE_OPENAI_MODEL ?? "gpt-4.1-mini");
    return {
      layer: 4,
      provider: "paid_cloud",
      model: `openai/${model}`,
      reason: needsCoding
        ? "Coding task escalated to cloud coding model (low local confidence)."
        : "Deep reasoning escalated to premium cloud (confidence below threshold).",
      estimatedCostUsd: estimateCloudCost(input.input.length),
      confidence: 0.91,
      escalationPath: [...escalationPath, "YES → Cloud"],
    };
  }

  if (process.env.ARKHE_FREE_CLOUD_MODELS === "1") {
    return {
      layer: 4,
      provider: "free_cloud",
      model: "free-cloud-general",
      reason: "Local stack unavailable; using free cloud fallback.",
      estimatedCostUsd: 0,
      confidence: 0.75,
      escalationPath: [...escalationPath, "YES → Free cloud"],
    };
  }

  return {
    layer: 2,
    provider: "mock",
    model: "mock-router",
    reason: "No live provider configured; deterministic mock for private alpha.",
    estimatedCostUsd: 0,
    confidence: 0.65,
    escalationPath: [...escalationPath, "FALLBACK → Mock"],
  };
}

function estimateCloudCost(inputChars: number): number {
  const tokens = Math.ceil(inputChars / 4);
  return Math.round((tokens / 1000) * 0.003 * 100) / 100;
}
