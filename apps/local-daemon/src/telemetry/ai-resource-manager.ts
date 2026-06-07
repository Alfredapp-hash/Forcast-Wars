import type { AgentId, ArkheEvent, TelemetryEvent } from "@arkhe/contracts";
import { createEventId, SCHEMA_VERSION } from "@arkhe/contracts";

export interface AgentResourceState {
  agentId: AgentId;
  role: string;
  status: string;
  layer: number;
  provider: string;
  model: string;
  cpuPct: number;
  memMb: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  costTodayUsd: number;
  latencyMs: number;
  confidence: number;
  networkKbps: number;
  updatedAt: string;
}

/** macOS Activity Monitor for AI — tracks per-agent model resources */
export class AiResourceManager {
  private readonly agents = new Map<AgentId, AgentResourceState>();
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly publish: (event: ArkheEvent) => Promise<void>) {}

  start(intervalMs = 5000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.emitSample(intervalMs);
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  ingest(event: ArkheEvent): void {
    const role = (event.payload as { role?: string }).role ?? "Agent";

    if (event.eventType === "agent.spawned" || event.eventType === "agent.started") {
      const agentId = (event.payload as { agentId: AgentId }).agentId;
      const existing = this.agents.get(agentId);
      this.agents.set(agentId, {
        agentId,
        role: (event.payload as { role: string }).role ?? role,
        status: (event.payload as { status: string }).status ?? "running",
        layer: existing?.layer ?? 1,
        provider: existing?.provider ?? "apple_foundation",
        model: existing?.model ?? "pending",
        cpuPct: estimateCpu(role),
        memMb: estimateMem(role),
        inputTokens: existing?.inputTokens ?? 0,
        outputTokens: existing?.outputTokens ?? 0,
        costUsd: existing?.costUsd ?? 0,
        costTodayUsd: existing?.costTodayUsd ?? 0,
        latencyMs: existing?.latencyMs ?? 0,
        confidence: existing?.confidence ?? 0,
        networkKbps: existing?.networkKbps ?? 0,
        updatedAt: event.ts,
      });
    }

    if (event.eventType === "model.route.completed" && event.agentId) {
      const payload = event.payload as {
        provider?: string;
        model?: string;
        confidence?: number;
        taskClass?: string;
      };
      const cost = event.cost;
      const layer = layerFromProvider(payload.provider);
      const existing = this.agents.get(event.agentId);
      const roleName = existing?.role ?? role;
      const inputTokens = (existing?.inputTokens ?? 0) + (cost?.inputTokens ?? 0);
      const outputTokens = (existing?.outputTokens ?? 0) + (cost?.outputTokens ?? 0);
      const costUsd = cost?.costUsd ?? 0;
      const costTodayUsd = (existing?.costTodayUsd ?? 0) + costUsd;

      this.agents.set(event.agentId, {
        agentId: event.agentId,
        role: roleName,
        status: existing?.status ?? "running",
        layer,
        provider: payload.provider ?? "mock",
        model: payload.model ?? "unknown",
        cpuPct: estimateCpu(roleName, layer),
        memMb: estimateMem(roleName, layer),
        inputTokens,
        outputTokens,
        costUsd,
        costTodayUsd,
        latencyMs: existing?.latencyMs ?? 0,
        confidence: payload.confidence ?? existing?.confidence ?? 0,
        networkKbps: layer >= 4 ? 120 : layer === 2 ? 0 : 12,
        updatedAt: event.ts,
      });
    }

    if (
      event.eventType === "agent.completed" ||
      event.eventType === "agent.terminated" ||
      event.eventType === "agent.failed"
    ) {
      const agentId = (event.payload as { agentId: AgentId }).agentId;
      const existing = this.agents.get(agentId);
      if (existing) {
        existing.status = (event.payload as { status: string }).status;
        existing.cpuPct = 0;
        existing.updatedAt = event.ts;
      }
    }
  }

  snapshot(): AgentResourceState[] {
    return Array.from(this.agents.values());
  }

  private async emitSample(intervalMs: number): Promise<void> {
    const usage = process.memoryUsage();
    const agents = this.snapshot().map((a) => ({
      agentId: a.agentId,
      role: a.role,
      cpuPct: a.cpuPct,
      memMb: a.memMb,
      status: a.status as never,
      currentTask: `${a.provider} · ${a.model}`,
      layer: a.layer,
      provider: a.provider,
      model: a.model,
      tokensUsed: a.inputTokens + a.outputTokens,
      costUsd: a.costTodayUsd,
      latencyMs: a.latencyMs,
      confidence: a.confidence,
      networkKbps: a.networkKbps,
    }));

    const event: TelemetryEvent = {
      id: createEventId(),
      ts: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      eventType: "telemetry.agent.sample",
      payload: {
        sampleIntervalMs: intervalMs,
        system: {
          cpuPct: 0,
          memUsedMb: Math.round(usage.rss / 1024 / 1024),
          memTotalMb: Math.round((usage.heapTotal + usage.external) / 1024 / 1024),
          networkTxKbps: agents.reduce((sum, a) => sum + (a.networkKbps ?? 0), 0),
          networkRxKbps: 0,
        },
        agents,
      },
    };

    await this.publish(event);
  }
}

function layerFromProvider(provider?: string): number {
  switch (provider) {
    case "apple_foundation":
      return 1;
    case "local_free":
      return 2;
    case "free_cloud":
      return 3;
    case "paid_cloud":
      return 4;
    default:
      return 2;
  }
}

function estimateCpu(role: string, layer = 1): number {
  if (role.includes("Coding")) return layer >= 4 ? 22 : 48;
  if (role.includes("Research")) return 38;
  if (role.includes("Browser")) return 28;
  if (role.includes("SEO")) return 18;
  return layer === 1 ? 2 : 12;
}

function estimateMem(role: string, layer = 1): number {
  if (role.includes("Coding") || role.includes("Research")) return layer >= 4 ? 4200 : 12300;
  if (layer === 1) return 800;
  if (layer === 2) return 6200;
  return 1800;
}
