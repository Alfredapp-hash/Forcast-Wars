import { WebSocketServer, type WebSocket } from "ws";
import type { ApprovalId, DirectorCommand, MissionId } from "@arkhe/contracts";
import type { EventBus } from "../event-bus.js";
import type { ServerConfig } from "../config.js";
import type { Director } from "@arkhe/orchestrator";
import { HealthService } from "../health/status.js";
import { AgentRuntime } from "../agent-runtime/runtime.js";
import type { LocalMemoryStore } from "@arkhe/memory";
import type { HumanMemoryStore } from "@arkhe/memory";
import type { ApprovalGate } from "../approvals/gate.js";
import type { AiResourceManager } from "../telemetry/ai-resource-manager.js";
import type { AgentRegistry } from "@arkhe/orchestrator";
import type { SynapseEngine } from "@arkhe/orchestrator";
import type { AppleFmBridge } from "../apple-fm/bridge.js";
import type { SupabaseSync } from "@arkhe/supabase-sync";
import { getRuntimeSettings, updateRuntimeSettings } from "@arkhe/orchestrator";
import type { DreamingService } from "../memory/dreaming.js";
import type { AttentionOrchestrator } from "../attention/trend-intelligence.js";
import { getAttentionConfigStore } from "../attention/attention-config.js";
import { getDocumentaryConfigStore } from "../documentary/documentary-config.js";
import type { DocumentaryOrchestrator } from "../documentary/documentary-pipeline.js";
import type { DebateOrchestrator } from "../forecast-wars/debate-orchestrator.js";
import type { DebateRunner } from "../forecast-wars/debate-runner.js";

interface ClientMessage {
  type: string;
  topics?: string[];
  payload?: {
    utterance?: string;
    source?: string;
    missionId?: string;
    query?: string;
    approvalId?: string;
    granted?: boolean;
    role?: string;
    requestId?: string;
    output?: string;
    appleFoundation?: boolean;
    defaultBudgetUsd?: number;
    maxMissionBudgetUsd?: number;
    paidCloudEnabled?: boolean;
    markdown?: string;
    tags?: string[];
    agentId?: string;
    scope?: string;   // for dream_now / media_dream_now
    youtubeApiKey?: string | null;
    youtubeTrendQuery?: string;
    youtubeRefreshToken?: string | null;
    xBearerToken?: string | null;
    xTrendQuery?: string;
    enabled?: boolean;
    publishingMode?: string;
    qualityThreshold?: number;
    pipelineBudgetUsd?: number;
    force?: boolean;
    predictionId?: string;
    predictionSlug?: string;
    title?: string;
    description?: string;
    yesPosition?: string;
    noPosition?: string;
    debateRoomId?: string;
    affirmativeAgentId?: string;
    negativeAgentId?: string;
  };
}

export class IpcServer {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();
  private appleFmClients = new Set<WebSocket>();
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly config: ServerConfig,
    private readonly eventBus: EventBus,
    private readonly director: Director,
    private readonly approvalGate: ApprovalGate,
    private readonly healthService: HealthService,
    private readonly memoryStore?: LocalMemoryStore,
    private readonly agentRegistry?: AgentRegistry,
    private readonly synapseEngine?: SynapseEngine,
    private readonly aiResources?: AiResourceManager,
    private readonly appleFmBridge?: AppleFmBridge,
    private readonly supabaseSync?: SupabaseSync,
    private readonly humanMemory?: HumanMemoryStore,
    private readonly dreaming?: DreamingService,
    private readonly attention?: AttentionOrchestrator,
    private readonly documentary?: DocumentaryOrchestrator,
    private readonly debateOrchestrator?: DebateOrchestrator,
    private readonly debateRunner?: DebateRunner,
    private readonly agentRuntime = new AgentRuntime(),
  ) {
    this.appleFmBridge?.setBroadcast((request) => {
      this.broadcast({ type: "apple_fm_request", ...request });
    });
  }

  async start(): Promise<void> {
    this.unsubscribe = this.eventBus.subscribe((message) => {
      this.agentRuntime.ingest(message.event);
      this.aiResources?.ingest(message.event);
      this.documentary?.ingest(message.event);
      this.memoryStore?.append(message.event);
      this.dreaming?.ingest?.(message.event);
      const synapseEvents = this.synapseEngine?.ingest(message.event) ?? [];
      for (const event of synapseEvents) {
        void this.eventBus.publish(event);
      }
      if (synapseEvents.length > 0) {
        void this.syncExperts().then(() => {
          void this.supabaseSync?.syncSynapses(this.synapseEngine?.snapshot().synapses ?? []);
        });
      }
      void this.supabaseSync?.syncEventMemory(message.event);
      this.broadcast({ type: "event", message });
    });

    this.wss = new WebSocketServer({ port: this.config.wsPort });

    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);
      ws.send(JSON.stringify({ type: "connected", version: "0.3.0" }));

      ws.on("message", (raw: Buffer | ArrayBuffer | Buffer[]) => {
        void this.handleMessage(ws, raw.toString());
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        this.appleFmClients.delete(ws);
        this.appleFmBridge?.setProviderConnected(this.appleFmClients.size > 0);
      });
    });
  }

  async stop(): Promise<void> {
    this.unsubscribe?.();
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();
    this.appleFmClients.clear();
    await new Promise<void>((resolve) => {
      this.wss?.close(() => resolve());
    });
  }

  private async handleMessage(ws: WebSocket, raw: string): Promise<void> {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case "subscribe":
        break;
      case "register_capabilities":
        if (msg.payload?.appleFoundation) {
          this.appleFmClients.add(ws);
          this.appleFmBridge?.setProviderConnected(true);
          this.send(ws, {
            type: "capabilities_registered",
            appleFoundation: true,
            foundationModelsAvailable: this.appleFmBridge?.isAvailable() ?? false,
          });
        }
        break;
      case "apple_fm_response":
        if (msg.payload?.requestId) {
          this.appleFmBridge?.resolve(msg.payload.requestId, msg.payload.output ?? null);
        }
        break;
      case "health":
        void this.healthService.snapshotAsync(this.clients.size).then((status) => {
          this.send(ws, { type: "health", status });
        });
        break;
      case "runtime_snapshot":
        this.send(ws, {
          type: "runtime_snapshot",
          snapshot: {
            ...this.agentRuntime.snapshot(),
            experts: this.agentRegistry?.snapshot() ?? [],
            neuralMesh: this.synapseEngine?.snapshot() ?? { synapses: [], proposedExperts: [] },
            aiResources: this.aiResources?.snapshot() ?? [],
          },
        });
        break;
      case "synapse_snapshot":
        this.send(ws, {
          type: "synapse_snapshot",
          snapshot: this.synapseEngine?.snapshot() ?? { synapses: [], proposedExperts: [] },
        });
        break;
      case "expert_list":
        this.send(ws, { type: "expert_list", experts: this.agentRegistry?.snapshot() ?? [] });
        break;
      case "expert_wake":
        if (msg.payload?.role && this.agentRegistry) {
          const expert = this.agentRegistry.wake(msg.payload.role);
          void this.syncExperts();
          this.send(ws, { type: "expert_updated", expert });
          this.broadcast({ type: "expert_updated", expert });
        }
        break;
      case "expert_sleep":
        if (msg.payload?.role && this.agentRegistry) {
          const expert = this.agentRegistry.sleep(msg.payload.role);
          void this.syncExperts();
          this.send(ws, { type: "expert_updated", expert });
          this.broadcast({ type: "expert_updated", expert });
        }
        break;
      case "supabase_status":
        this.send(ws, { type: "supabase_status", status: this.supabaseSync?.getStatus() ?? { enabled: false, connected: false, agentsSynced: 0, memoriesSynced: 0 } });
        break;
      case "runtime_settings":
        this.send(ws, { type: "runtime_settings", settings: getRuntimeSettings() });
        break;
      case "runtime_settings_update":
        this.send(ws, {
          type: "runtime_settings",
          settings: updateRuntimeSettings({
            defaultBudgetUsd: msg.payload?.defaultBudgetUsd,
            maxMissionBudgetUsd: msg.payload?.maxMissionBudgetUsd,
            paidCloudEnabled: msg.payload?.paidCloudEnabled,
          }),
        });
        break;
      case "vault_search":
        this.send(ws, {
          type: "vault_search",
          results: await this.supabaseSync?.searchVault(msg.payload?.query ?? "", 25, {
            agentId: msg.payload?.agentId,
            missionId: msg.payload?.missionId,
            tags: msg.payload?.tags,
          }) ?? [],
        });
        break;
      case "memories_read":
        this.send(ws, {
          type: "memories_read",
          markdown: await this.humanMemory?.read() ?? "",
        });
        break;
      case "memories_write":
        if (this.humanMemory && msg.payload?.markdown !== undefined) {
          await this.humanMemory.write(msg.payload.markdown);
        }
        this.send(ws, {
          type: "memories_read",
          markdown: await this.humanMemory?.read() ?? "",
        });
        break;
      case "dream_now":
      case "media_dream_now": {
        const scope = msg.type === "media_dream_now"
          ? "media"
          : (msg.payload?.scope === "media" ? "media" : "both");
        const reason = msg.type === "media_dream_now" ? "ipc:media_dream_now" : "ipc:dream_now";
        this.send(ws, {
          type: "dreaming_status",
          status: await this.dreaming?.run(reason, { scope: scope as any }),
        });
        break;
      }
      case "dreaming_status":
        this.send(ws, {
          type: "dreaming_status",
          status: this.dreaming?.getStatus() ?? { enabled: false, eventCount: 0 },
        });
        break;
      case "attention_config":
        this.send(ws, {
          type: "attention_config",
          config: getAttentionConfigStore().getStatus(),
        });
        break;
      case "attention_config_update": {
        const updatePayload: {
          youtubeApiKey?: string | null;
          youtubeTrendQuery?: string;
          youtubeRefreshToken?: string | null;
          xBearerToken?: string | null;
          xTrendQuery?: string;
        } = {};
        if (msg.payload && "youtubeApiKey" in msg.payload) {
          updatePayload.youtubeApiKey = msg.payload.youtubeApiKey ?? null;
        }
        if (msg.payload?.youtubeTrendQuery !== undefined) {
          updatePayload.youtubeTrendQuery = msg.payload.youtubeTrendQuery;
        }
        if (msg.payload && "youtubeRefreshToken" in msg.payload) {
          updatePayload.youtubeRefreshToken = msg.payload.youtubeRefreshToken ?? null;
        }
        if (msg.payload && "xBearerToken" in msg.payload) {
          updatePayload.xBearerToken = msg.payload.xBearerToken ?? null;
        }
        if (msg.payload?.xTrendQuery !== undefined) {
          updatePayload.xTrendQuery = msg.payload.xTrendQuery;
        }
        const config = await getAttentionConfigStore().update(updatePayload);
        this.send(ws, { type: "attention_config", config });
        break;
      }
      case "documentary_config":
        this.send(ws, {
          type: "documentary_config",
          config: getDocumentaryConfigStore().getStatus(),
          status: this.documentary?.getStatus() ?? null,
        });
        break;
      case "documentary_config_update": {
        const docConfig = await getDocumentaryConfigStore().update({
          enabled: msg.payload?.enabled,
          publishingMode: msg.payload?.publishingMode as
            | "shadow"
            | "supervised"
            | "autonomous"
            | undefined,
          qualityThreshold: msg.payload?.qualityThreshold,
          pipelineBudgetUsd: msg.payload?.pipelineBudgetUsd,
        });
        this.send(ws, {
          type: "documentary_config",
          config: docConfig,
          status: this.documentary?.getStatus() ?? null,
        });
        break;
      }
      case "documentary_run":
        void this.documentary
          ?.runPipeline({ force: Boolean(msg.payload?.force) })
          .then((run) => {
            this.send(ws, { type: "documentary_run", status: "completed", run });
          })
          .catch((error) => {
            this.send(ws, {
              type: "documentary_run",
              status: "failed",
              error: error instanceof Error ? error.message : String(error),
            });
          });
        this.send(ws, { type: "documentary_run", status: "started" });
        break;
      case "attention_scan":
        // Fire-and-forget the full Attention Cortex loop (trend → opportunity → content → video → publish → analytics)
        void this.attention?.scan({ maxOpportunities: 5 }).then(() => {
          this.send(ws, { type: "attention_scan", status: "completed" });
        });
        this.send(ws, { type: "attention_scan", status: "started" });
        break;
      case "memory_search":
        this.send(ws, {
          type: "memory_search",
          results: this.memoryStore?.search(msg.payload?.query ?? "").slice(0, 50) ?? [],
        });
        break;
      case "replay_mission":
        if (msg.payload?.missionId) {
          this.send(ws, {
            type: "replay_mission",
            missionId: msg.payload.missionId,
            events: this.memoryStore?.missionEvents(msg.payload.missionId as MissionId) ?? [],
          });
        }
        break;
      case "export_audit":
        this.send(ws, {
          type: "export_audit",
          format: "json",
          events: this.memoryStore?.allEvents() ?? [],
        });
        break;
      case "approval_resolve":
        if (msg.payload?.approvalId) {
          await this.approvalGate.resolve(
            msg.payload.approvalId as ApprovalId,
            Boolean(msg.payload.granted),
          );
        }
        break;
      case "command": {
        const utterance = msg.payload?.utterance?.trim();
        if (!utterance) return;
        const command: DirectorCommand = {
          id: crypto.randomUUID(),
          ts: new Date().toISOString(),
          source: (msg.payload?.source as DirectorCommand["source"]) ?? "ui",
          utterance,
        };
        await this.director.handleCommand(command);
        void this.syncExperts();
        break;
      }
      case "pause_mission":
        if (msg.payload?.missionId) {
          await this.director.pauseMission(msg.payload.missionId as never);
        }
        break;
      case "resume_mission":
        if (msg.payload?.missionId) {
          await this.director.resumeMission(msg.payload.missionId as never);
        }
        break;
      case "kill_switch":
        this.agentRuntime.terminateAll();
        await this.director.killAll();
        break;
      case "debate_start":
        if (this.debateOrchestrator && msg.payload?.title && msg.payload?.predictionId) {
          const result = await this.debateOrchestrator.startDebate({
            predictionId: msg.payload.predictionId,
            predictionSlug: msg.payload.predictionSlug ?? msg.payload.title.toLowerCase().replace(/\s+/g, "-"),
            title: msg.payload.title,
            description: msg.payload.description ?? "",
            yesPosition: msg.payload.yesPosition ?? "",
            noPosition: msg.payload.noPosition ?? "",
            affirmativeAgentId: msg.payload.affirmativeAgentId,
            negativeAgentId: msg.payload.negativeAgentId,
          });
          this.send(ws, { type: "debate_started", missionId: result.missionId });
        }
        break;
      case "debate_run":
        if (this.debateRunner && msg.payload?.debateRoomId && msg.payload?.predictionId && msg.payload?.title) {
          void this.debateRunner
            .runFullFlow({
              debateRoomId: msg.payload.debateRoomId,
              predictionId: msg.payload.predictionId,
              title: msg.payload.title,
              yesPosition: msg.payload.yesPosition ?? "",
              noPosition: msg.payload.noPosition ?? "",
              affirmativeAgentId: msg.payload.affirmativeAgentId ?? "agt_athena",
              negativeAgentId: msg.payload.negativeAgentId ?? "agt_prometheus",
            })
            .then(() => this.send(ws, { type: "debate_run_complete" }))
            .catch((err) => this.send(ws, { type: "debate_run_error", error: String(err) }));
        }
        break;
    }
  }

  private async syncExperts(): Promise<void> {
    if (!this.agentRegistry || !this.supabaseSync) return;
    await this.supabaseSync.syncExperts(this.agentRegistry.snapshot());
  }

  private send(client: WebSocket, payload: unknown): void {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(payload));
    }
  }

  private broadcast(payload: unknown): void {
    const text = JSON.stringify(payload);
    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        client.send(text);
      }
    }
  }
}
