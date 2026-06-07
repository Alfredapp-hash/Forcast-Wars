import { WebSocketServer, type WebSocket } from "ws";
import type { ApprovalId, DirectorCommand, MissionId } from "@arkhe/contracts";
import type { EventBus } from "../event-bus.js";
import type { ServerConfig } from "../config.js";
import type { Director } from "@arkhe/orchestrator";
import { HealthService } from "../health/status.js";
import { AgentRuntime } from "../agent-runtime/runtime.js";
import type { LocalMemoryStore } from "@arkhe/memory";
import type { ApprovalGate } from "../approvals/gate.js";
import type { AiResourceManager } from "../telemetry/ai-resource-manager.js";
import type { AgentRegistry } from "@arkhe/orchestrator";
import type { AppleFmBridge } from "../apple-fm/bridge.js";
import type { SupabaseSync } from "@arkhe/supabase-sync";
import { getRuntimeSettings, updateRuntimeSettings } from "@arkhe/orchestrator";

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
    private readonly memoryStore?: LocalMemoryStore,
    private readonly agentRegistry?: AgentRegistry,
    private readonly aiResources?: AiResourceManager,
    private readonly appleFmBridge?: AppleFmBridge,
    private readonly supabaseSync?: SupabaseSync,
    private readonly healthService = new HealthService(eventBus),
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
      this.memoryStore?.append(message.event);
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
        this.send(ws, { type: "health", status: this.healthService.snapshot(this.clients.size) });
        break;
      case "runtime_snapshot":
        this.send(ws, {
          type: "runtime_snapshot",
          snapshot: {
            ...this.agentRuntime.snapshot(),
            experts: this.agentRegistry?.snapshot() ?? [],
            aiResources: this.aiResources?.snapshot() ?? [],
          },
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
          results: await this.supabaseSync?.searchVault(msg.payload?.query ?? "") ?? [],
        });
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
