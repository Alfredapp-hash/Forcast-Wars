/**
 * Canonical identifiers for all Arkhe AgentOS entities.
 * Format: {prefix}_{ulid|uuid}
 */
export type MissionId = `mis_${string}`;
export type AgentId = `agt_${string}`;
export type WorkspaceId = `wsp_${string}`;
export type ApprovalId = `apr_${string}`;
export type TraceId = `trc_${string}`;
export type SpanId = `spn_${string}`;
export type EventId = `evt_${string}`;
export type ToolCallId = `tcl_${string}`;
export type ArtifactRef = string;

export type ISOTimestamp = string;

/** Agent lifecycle and health */
export type AgentStatus =
  | "spawning"
  | "idle"
  | "running"
  | "waiting_approval"
  | "paused"
  | "completed"
  | "failed"
  | "terminated";

export type AgentKind = "director" | "resident" | "mission" | "skill";

export type MissionStatus =
  | "draft"
  | "planning"
  | "active"
  | "waiting_approval"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

/** Safety classification for tools and actions */
export type RiskClass = "green" | "yellow" | "orange" | "red";

export type ApprovalStatus = "pending" | "approved" | "denied" | "expired";

export type RecordingMode = "off" | "mission" | "workspace" | "continuous";

export type ReplayMode = "fast" | "realtime" | "step" | "educational";

export interface PermissionEnvelope {
  riskClass: RiskClass;
  allowedTools: string[];
  allowedDomains?: string[];
  allowedPaths?: string[];
  maxCostUsd?: number;
  requiresApprovalAbove?: RiskClass;
}

export interface ResourceSnapshot {
  cpuPct?: number;
  memMb?: number;
  netTxKb?: number;
  netRxKb?: number;
  gpuPct?: number;
}

export interface CostSnapshot {
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  model?: string;
}

export interface TraceContext {
  traceId: TraceId;
  spanId: SpanId;
  parentSpanId?: SpanId;
}

/** Base fields present on every canonical event */
export interface EventEnvelope {
  id: EventId;
  ts: ISOTimestamp;
  schemaVersion: "1.0";
  missionId?: MissionId;
  workspaceId?: WorkspaceId;
  agentId?: AgentId;
  parentAgentId?: AgentId;
  trace?: TraceContext;
  resources?: ResourceSnapshot;
  cost?: CostSnapshot;
}

/** Voice operating layer */
export type VoiceEventType =
  | "voice.wake.detected"
  | "voice.session.started"
  | "voice.session.ended"
  | "voice.transcript.partial"
  | "voice.transcript.final"
  | "voice.command.recognized"
  | "voice.tts.started"
  | "voice.tts.completed"
  | "voice.barge_in";

export interface VoiceEvent extends EventEnvelope {
  eventType: VoiceEventType;
  payload: {
    sessionId: string;
    transcript?: string;
    confidence?: number;
    intent?: string;
    sttProvider?: "apple" | "whisper" | "deepgram" | "openai";
    ttsProvider?: "apple" | "elevenlabs" | "openai";
    durationMs?: number;
  };
}

/** Mission lifecycle */
export type MissionEventType =
  | "mission.created"
  | "mission.planned"
  | "mission.started"
  | "mission.paused"
  | "mission.resumed"
  | "mission.completed"
  | "mission.failed"
  | "mission.cancelled"
  | "mission.budget.warning"
  | "mission.budget.exceeded";

export interface MissionEvent extends EventEnvelope {
  eventType: MissionEventType;
  payload: {
    missionId: MissionId;
    title: string;
    status: MissionStatus;
    objective?: string;
    budgetUsd?: number;
    budgetUsedUsd?: number;
    completionPct?: number;
    riskScore?: number;
    estimatedCompletionAt?: ISOTimestamp;
    spawnedAgentIds?: AgentId[];
  };
}

/** Agent lifecycle */
export type AgentEventType =
  | "agent.spawned"
  | "agent.started"
  | "agent.message"
  | "agent.tool_requested"
  | "agent.waiting_approval"
  | "agent.paused"
  | "agent.completed"
  | "agent.failed"
  | "agent.terminated"
  | "agent.health.updated";

export interface AgentEvent extends EventEnvelope {
  eventType: AgentEventType;
  payload: {
    agentId: AgentId;
    kind: AgentKind;
    role: string;
    status: AgentStatus;
    parentAgentId?: AgentId;
    permissions?: PermissionEnvelope;
    healthScore?: number;
    message?: string;
    error?: string;
  };
}

/** Tool and MCP gateway */
export type ToolEventType =
  | "tool.invoked"
  | "tool.completed"
  | "tool.failed"
  | "tool.blocked"
  | "tool.approval_required";

export interface ToolEvent extends EventEnvelope {
  eventType: ToolEventType;
  payload: {
    toolCallId: ToolCallId;
    toolName: string;
    mcpServer?: string;
    riskClass: RiskClass;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    durationMs?: number;
    approvalId?: ApprovalId;
  };
}

/** Browser automation (Playwright + WKWebView) */
export type BrowserEventType =
  | "browser.navigate"
  | "browser.click"
  | "browser.type"
  | "browser.scroll"
  | "browser.screenshot"
  | "browser.dom_snapshot"
  | "browser.network"
  | "browser.console"
  | "browser.approval_required";

export interface BrowserEvent extends EventEnvelope {
  eventType: BrowserEventType;
  payload: {
    url?: string;
    selector?: string;
    value?: string;
    screenshotRef?: ArtifactRef;
    domSnapshotRef?: ArtifactRef;
    playwrightTraceRef?: ArtifactRef;
    networkMethod?: string;
    networkStatus?: number;
    approvalId?: ApprovalId;
  };
}

/** Human-in-the-loop approvals */
export type ApprovalEventType =
  | "approval.requested"
  | "approval.granted"
  | "approval.denied"
  | "approval.expired";

export interface ApprovalEvent extends EventEnvelope {
  eventType: ApprovalEventType;
  payload: {
    approvalId: ApprovalId;
    status: ApprovalStatus;
    riskClass: RiskClass;
    action: string;
    summary: string;
    evidenceRefs?: ArtifactRef[];
    requestedByAgentId: AgentId;
    resolvedBy?: "user" | "policy" | "timeout";
    expiresAt?: ISOTimestamp;
  };
}

/** System and agent telemetry */
export type TelemetryEventType =
  | "telemetry.system.sample"
  | "telemetry.agent.sample"
  | "telemetry.mission.sample";

export interface TelemetryEvent extends EventEnvelope {
  eventType: TelemetryEventType;
  payload: {
    sampleIntervalMs: number;
    system?: {
      cpuPct: number;
      memUsedMb: number;
      memTotalMb: number;
      diskIoMbps?: number;
      batteryPct?: number;
      thermalState?: "nominal" | "fair" | "serious" | "critical";
      networkTxKbps?: number;
      networkRxKbps?: number;
    };
    agents?: Array<{
      agentId: AgentId;
      cpuPct: number;
      memMb: number;
      status: AgentStatus;
      currentTask?: string;
    }>;
    mission?: {
      completionPct: number;
      costUsd: number;
      activeAgentCount: number;
      bottleneck?: string;
    };
  };
}

/** Recording and replay */
export type RecordingEventType =
  | "recording.started"
  | "recording.stopped"
  | "recording.segment"
  | "replay.started"
  | "replay.step"
  | "replay.completed"
  | "export.requested"
  | "export.completed";

export interface RecordingEvent extends EventEnvelope {
  eventType: RecordingEventType;
  payload: {
    mode: RecordingMode;
    replayMode?: ReplayMode;
    videoRef?: ArtifactRef;
    audioRef?: ArtifactRef;
    captionRef?: ArtifactRef;
    exportFormat?: "pdf" | "json" | "mp4" | "mov" | "compliance_package";
    stepIndex?: number;
    totalSteps?: number;
  };
}

/** Memory operations */
export type MemoryEventType =
  | "memory.chunk.stored"
  | "memory.chunk.retrieved"
  | "memory.search"
  | "memory.redacted";

export interface MemoryEvent extends EventEnvelope {
  eventType: MemoryEventType;
  payload: {
    memoryType:
      | "conversation"
      | "project"
      | "workspace"
      | "screen"
      | "mission"
      | "vault";
    chunkId?: string;
    query?: string;
    resultCount?: number;
    redactionReason?: string;
  };
}

/** Audit log — append-only, hash-chained */
export type AuditEventType = "audit.entry";

export interface AuditEvent extends EventEnvelope {
  eventType: AuditEventType;
  payload: {
    sequence: number;
    previousHash: string;
    entryHash: string;
    action: string;
    actor: "user" | AgentId | "system";
    summary: string;
    relatedEventId?: EventId;
    complianceTags?: string[];
  };
}

/** Union of all canonical events */
export type ArkheEvent =
  | VoiceEvent
  | MissionEvent
  | AgentEvent
  | ToolEvent
  | BrowserEvent
  | ApprovalEvent
  | TelemetryEvent
  | RecordingEvent
  | MemoryEvent
  | AuditEvent;

export type EventType = ArkheEvent["eventType"];

/** Mission definition — persisted separately from events */
export interface Mission {
  id: MissionId;
  workspaceId: WorkspaceId;
  title: string;
  objective: string;
  status: MissionStatus;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  directorAgentId: AgentId;
  agentIds: AgentId[];
  budgetUsd: number;
  budgetUsedUsd: number;
  recordingMode: RecordingMode;
  completionPct: number;
  riskScore: number;
}

/** Agent definition */
export interface Agent {
  id: AgentId;
  missionId: MissionId;
  kind: AgentKind;
  role: string;
  status: AgentStatus;
  parentAgentId?: AgentId;
  permissions: PermissionEnvelope;
  healthScore: number;
  spawnedAt: ISOTimestamp;
  terminatedAt?: ISOTimestamp;
  processPid?: number;
}

/** Director command — voice or UI initiated */
export interface DirectorCommand {
  id: string;
  ts: ISOTimestamp;
  source: "voice" | "ui" | "api";
  utterance: string;
  parsedIntent?: string;
  workspaceId?: WorkspaceId;
  missionId?: MissionId;
}

/** Event stream envelope for NATS / IPC transport */
export interface EventStreamMessage {
  topic: `arkhe.events.${string}`;
  event: ArkheEvent;
  emittedAt: ISOTimestamp;
  source: "macos" | "daemon" | "worker";
}

export function isRiskClass(value: string): value is RiskClass {
  return ["green", "yellow", "orange", "red"].includes(value);
}

export function requiresApproval(riskClass: RiskClass): boolean {
  return riskClass === "orange" || riskClass === "red";
}

export const SCHEMA_VERSION = "1.0" as const;
