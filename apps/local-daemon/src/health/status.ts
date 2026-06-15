import type { EventBus } from "../event-bus.js";
import type { SupabaseSync } from "@arkhe/supabase-sync";

export type SubsystemState = "ok" | "degraded" | "unavailable" | "disabled";

export interface HealthStatus {
  status: "ok" | "degraded";
  daemon: "ok";
  ipc: "ok" | "degraded";
  eventBus: "ok" | "degraded";
  modelRouter: "ok" | "degraded";
  ollama: SubsystemState;
  supabase: SubsystemState;
  playwright: SubsystemState;
  appleFoundation: SubsystemState;
  uptimeSeconds: number;
  eventsSeen: number;
  clientsConnected: number;
}

export interface HealthServiceDeps {
  supabaseSync?: SupabaseSync;
  appleFmBridgeEnabled?: boolean;
  probePlaywright?: () => Promise<boolean>;
}

export class HealthService {
  private readonly startedAt = Date.now();
  private ollamaCache: { at: number; ok: boolean } | null = null;
  private playwrightCache: { at: number; ok: boolean } | null = null;

  constructor(
    private readonly eventBus: EventBus,
    private readonly deps: HealthServiceDeps = {},
  ) {}

  async snapshotAsync(clientsConnected: number): Promise<HealthStatus> {
    const eventBusHealthy = this.eventBus.isConnected();
    const ollama = await this.checkOllama();
    const playwright = await this.checkPlaywright();
    const supabase = this.checkSupabase();
    const appleFoundation = this.checkAppleFoundation();

    const subsystems = [ollama, supabase, playwright, appleFoundation];
    const degraded = subsystems.some((s) => s === "degraded" || s === "unavailable");
    const coreOk = eventBusHealthy && ollama !== "unavailable";

    return {
      status: coreOk && !degraded ? "ok" : "degraded",
      daemon: "ok",
      ipc: clientsConnected >= 0 ? "ok" : "degraded",
      eventBus: eventBusHealthy ? "ok" : "degraded",
      modelRouter: ollama === "unavailable" ? "degraded" : "ok",
      ollama,
      supabase,
      playwright,
      appleFoundation,
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      eventsSeen: this.eventBus.eventCount,
      clientsConnected,
    };
  }

  /** Sync snapshot for callers that cannot await (legacy). */
  snapshot(clientsConnected: number): HealthStatus {
    const eventBusHealthy = this.eventBus.isConnected();
    const supabase = this.checkSupabase();
    const appleFoundation = this.checkAppleFoundation();
    const ollama = this.ollamaCache?.ok ? "ok" : "degraded";
    const playwright = this.playwrightCache?.ok ? "ok" : "degraded";

    return {
      status: eventBusHealthy ? "ok" : "degraded",
      daemon: "ok",
      ipc: clientsConnected >= 0 ? "ok" : "degraded",
      eventBus: eventBusHealthy ? "ok" : "degraded",
      modelRouter: "ok",
      ollama,
      supabase,
      playwright,
      appleFoundation,
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      eventsSeen: this.eventBus.eventCount,
      clientsConnected,
    };
  }

  private checkSupabase(): SubsystemState {
    const sync = this.deps.supabaseSync;
    if (!sync) return "disabled";
    const status = sync.getStatus();
    if (!status.enabled) return "disabled";
    if (!status.connected) return "degraded";
    return "ok";
  }

  private checkAppleFoundation(): SubsystemState {
    if (this.deps.appleFmBridgeEnabled) return "ok";
    return "disabled";
  }

  private async checkOllama(): Promise<SubsystemState> {
    const now = Date.now();
    if (this.ollamaCache && now - this.ollamaCache.at < 30_000) {
      return this.ollamaCache.ok ? "ok" : "unavailable";
    }
    const base = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
    let ok = false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const response = await fetch(`${base}/api/tags`, { signal: controller.signal });
      clearTimeout(timer);
      ok = response.ok;
    } catch {
      ok = false;
    }
    this.ollamaCache = { at: now, ok };
    return ok ? "ok" : "unavailable";
  }

  private async checkPlaywright(): Promise<SubsystemState> {
    const probe = this.deps.probePlaywright;
    if (!probe) return "degraded";

    const now = Date.now();
    if (this.playwrightCache && now - this.playwrightCache.at < 120_000) {
      return this.playwrightCache.ok ? "ok" : "unavailable";
    }
    let ok = false;
    try {
      ok = await probe();
    } catch {
      ok = false;
    }
    this.playwrightCache = { at: now, ok };
    return ok ? "ok" : "unavailable";
  }
}
