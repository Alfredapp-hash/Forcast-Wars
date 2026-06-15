import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type PublishingMode = "shadow" | "supervised" | "autonomous";

export type QualityGateKind =
  | "original_experiment"
  | "milestone"
  | "analysis"
  | "measurable_result"
  | "visualization"
  | "failure"
  | "demo"
  | "mission_position";

export interface DocumentaryConfigFile {
  enabled?: boolean;
  channelName?: string;
  series?: string[];
  missionStatement?: string;
  beliefs?: string[];
  prohibitedTopics?: string[];
  publishingMode?: PublishingMode;
  /** Minimum quality score (0–100) required before supervised/autonomous publish. */
  qualityThreshold?: number;
  /** Required quality gates — at least one must pass for publish eligibility. */
  requiredQualityGates?: QualityGateKind[];
  /** Per-pipeline-run budget cap in USD. */
  pipelineBudgetUsd?: number;
  /** Monthly operating cost cap in USD (tracked by Financial Governor). */
  monthlyOperatingBudgetUsd?: number;
  /** Require human approval before publish when mode is supervised. */
  requirePublishApproval?: boolean;
  /** Require compliance agent pass before any publish attempt. */
  requireCompliancePass?: boolean;
  /** Target video duration range in seconds. */
  targetDurationSecMin?: number;
  targetDurationSecMax?: number;
  /** YouTube containsSyntheticMedia disclosure (required for AI-generated media). */
  syntheticMediaDisclosure?: boolean;
  lastPipelineRunAt?: string;
  lastPipelineStatus?: "idle" | "running" | "completed" | "failed";
  lastPipelineStage?: string;
}

export interface DocumentaryConfigStatus {
  enabled: boolean;
  channelName: string;
  series: string[];
  missionStatement: string;
  beliefs: string[];
  prohibitedTopics: string[];
  publishingMode: PublishingMode;
  qualityThreshold: number;
  requiredQualityGates: QualityGateKind[];
  pipelineBudgetUsd: number;
  monthlyOperatingBudgetUsd: number;
  requirePublishApproval: boolean;
  requireCompliancePass: boolean;
  targetDurationSecMin: number;
  targetDurationSecMax: number;
  syntheticMediaDisclosure: boolean;
  lastPipelineRunAt: string | null;
  lastPipelineStatus: "idle" | "running" | "completed" | "failed";
  lastPipelineStage: string | null;
}

export interface DocumentaryConfigUpdate {
  enabled?: boolean;
  channelName?: string;
  series?: string[];
  missionStatement?: string;
  beliefs?: string[];
  prohibitedTopics?: string[];
  publishingMode?: PublishingMode;
  qualityThreshold?: number;
  requiredQualityGates?: QualityGateKind[];
  pipelineBudgetUsd?: number;
  monthlyOperatingBudgetUsd?: number;
  requirePublishApproval?: boolean;
  requireCompliancePass?: boolean;
  targetDurationSecMin?: number;
  targetDurationSecMax?: number;
  syntheticMediaDisclosure?: boolean;
}

const DEFAULT_CHANNEL = "Self-Documentary";
const DEFAULT_SERIES = [
  "What I Learned Today",
  "Inside My DNA",
  "New Gene Added",
  "Mission Postmortem",
  "Financial Pulse",
];
const DEFAULT_MISSION =
  "Document Arkhe AgentOS development toward financial independence — real experiments, measurable results, and honest failures. No generic AI slop.";
const DEFAULT_BELIEFS = [
  "Transparency builds trust",
  "Show the work, not just the outcome",
  "Financial sustainability before scale",
  "Sanitize secrets and PII before any capture",
];
const DEFAULT_PROHIBITED = [
  "API keys and credentials",
  "Private user prompts and vault contents",
  "PII and client data",
  "Unverified financial claims",
  "Political advocacy",
];
const DEFAULT_QUALITY_GATES: QualityGateKind[] = [
  "original_experiment",
  "milestone",
  "analysis",
  "measurable_result",
  "demo",
  "mission_position",
];

function withDefaults(raw: DocumentaryConfigFile): Required<
  Pick<
    DocumentaryConfigFile,
    | "enabled"
    | "channelName"
    | "series"
    | "missionStatement"
    | "beliefs"
    | "prohibitedTopics"
    | "publishingMode"
    | "qualityThreshold"
    | "requiredQualityGates"
    | "pipelineBudgetUsd"
    | "monthlyOperatingBudgetUsd"
    | "requirePublishApproval"
    | "requireCompliancePass"
    | "targetDurationSecMin"
    | "targetDurationSecMax"
    | "syntheticMediaDisclosure"
  >
> {
  return {
    enabled: raw.enabled ?? false,
    channelName: raw.channelName ?? DEFAULT_CHANNEL,
    series: raw.series ?? DEFAULT_SERIES,
    missionStatement: raw.missionStatement ?? DEFAULT_MISSION,
    beliefs: raw.beliefs ?? DEFAULT_BELIEFS,
    prohibitedTopics: raw.prohibitedTopics ?? DEFAULT_PROHIBITED,
    publishingMode: raw.publishingMode ?? "shadow",
    qualityThreshold: raw.qualityThreshold ?? 72,
    requiredQualityGates: raw.requiredQualityGates ?? DEFAULT_QUALITY_GATES,
    pipelineBudgetUsd: raw.pipelineBudgetUsd ?? 8,
    monthlyOperatingBudgetUsd: raw.monthlyOperatingBudgetUsd ?? 120,
    requirePublishApproval: raw.requirePublishApproval ?? true,
    requireCompliancePass: raw.requireCompliancePass ?? true,
    targetDurationSecMin: raw.targetDurationSecMin ?? 60,
    targetDurationSecMax: raw.targetDurationSecMax ?? 120,
    syntheticMediaDisclosure: raw.syntheticMediaDisclosure ?? true,
  };
}

export class DocumentaryConfigStore {
  private filePath: string;
  private config: DocumentaryConfigFile = {};

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "documentary-config.json");
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      this.config = JSON.parse(raw) as DocumentaryConfigFile;
    } catch {
      this.config = {};
    }
  }

  getStatus(): DocumentaryConfigStatus {
    const d = withDefaults(this.config);
    return {
      ...d,
      lastPipelineRunAt: this.config.lastPipelineRunAt ?? null,
      lastPipelineStatus: this.config.lastPipelineStatus ?? "idle",
      lastPipelineStage: this.config.lastPipelineStage ?? null,
    };
  }

  async update(partial: DocumentaryConfigUpdate): Promise<DocumentaryConfigStatus> {
    if (partial.enabled !== undefined) this.config.enabled = partial.enabled;
    if (partial.channelName !== undefined) {
      this.config.channelName = partial.channelName.trim() || DEFAULT_CHANNEL;
    }
    if (partial.series !== undefined) {
      this.config.series = partial.series.filter((s) => s.trim().length > 0);
    }
    if (partial.missionStatement !== undefined) {
      this.config.missionStatement = partial.missionStatement.trim() || DEFAULT_MISSION;
    }
    if (partial.beliefs !== undefined) {
      this.config.beliefs = partial.beliefs.filter((b) => b.trim().length > 0);
    }
    if (partial.prohibitedTopics !== undefined) {
      this.config.prohibitedTopics = partial.prohibitedTopics.filter((t) => t.trim().length > 0);
    }
    if (partial.publishingMode !== undefined) {
      this.config.publishingMode = partial.publishingMode;
    }
    if (partial.qualityThreshold !== undefined) {
      this.config.qualityThreshold = Math.max(0, Math.min(100, partial.qualityThreshold));
    }
    if (partial.requiredQualityGates !== undefined) {
      this.config.requiredQualityGates = partial.requiredQualityGates;
    }
    if (partial.pipelineBudgetUsd !== undefined) {
      this.config.pipelineBudgetUsd = Math.max(0, partial.pipelineBudgetUsd);
    }
    if (partial.monthlyOperatingBudgetUsd !== undefined) {
      this.config.monthlyOperatingBudgetUsd = Math.max(0, partial.monthlyOperatingBudgetUsd);
    }
    if (partial.requirePublishApproval !== undefined) {
      this.config.requirePublishApproval = partial.requirePublishApproval;
    }
    if (partial.requireCompliancePass !== undefined) {
      this.config.requireCompliancePass = partial.requireCompliancePass;
    }
    if (partial.targetDurationSecMin !== undefined) {
      this.config.targetDurationSecMin = Math.max(15, partial.targetDurationSecMin);
    }
    if (partial.targetDurationSecMax !== undefined) {
      this.config.targetDurationSecMax = Math.max(
        this.config.targetDurationSecMin ?? 60,
        partial.targetDurationSecMax
      );
    }
    if (partial.syntheticMediaDisclosure !== undefined) {
      this.config.syntheticMediaDisclosure = partial.syntheticMediaDisclosure;
    }

    await this.persist();
    return this.getStatus();
  }

  async recordPipelineState(
    status: DocumentaryConfigStatus["lastPipelineStatus"],
    stage?: string
  ): Promise<void> {
    this.config.lastPipelineStatus = status;
    if (stage) this.config.lastPipelineStage = stage;
    if (status === "completed" || status === "failed") {
      this.config.lastPipelineRunAt = new Date().toISOString();
    }
    await this.persist();
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.config, null, 2), "utf8");
  }
}

let store: DocumentaryConfigStore | null = null;

export function initDocumentaryConfig(dataDir: string): DocumentaryConfigStore {
  store = new DocumentaryConfigStore(dataDir);
  return store;
}

export function getDocumentaryConfigStore(): DocumentaryConfigStore {
  if (!store) {
    throw new Error(
      "[documentary-config] not initialized — call initDocumentaryConfig on daemon boot"
    );
  }
  return store;
}
