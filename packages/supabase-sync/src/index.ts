import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ArkheEvent } from "@arkhe/contracts";

export interface ExpertSnapshot {
  id: string;
  role: string;
  specialty: string;
  preferredLayer: number;
  preferredModel: string;
  allowedTools: string[];
  status: string;
  activations: number;
  lastActivatedAt?: string;
}

export interface SupabaseSyncOptions {
  url: string;
  serviceRoleKey: string;
  workspaceId?: string;
}

export interface SupabaseSyncStatus {
  enabled: boolean;
  connected: boolean;
  lastSyncAt?: string;
  lastError?: string;
  agentsSynced: number;
  memoriesSynced: number;
}

export interface VaultMemoryRow {
  id: string;
  agent_id: string;
  mission_id: string | null;
  memory_type: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Syncs resident agents + episodic memories to Supabase (stateless models, persistent agents). */
export class SupabaseSync {
  private client: SupabaseClient | null = null;
  private status: SupabaseSyncStatus = {
    enabled: false,
    connected: false,
    agentsSynced: 0,
    memoriesSynced: 0,
  };

  constructor(private readonly options?: SupabaseSyncOptions) {
    if (options?.url && options.serviceRoleKey) {
      this.client = createClient(options.url, options.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      this.status.enabled = true;
    }
  }

  static fromEnv(): SupabaseSync {
    const url = process.env.SUPABASE_URL ?? "https://deoyyzrzoacyjeozwvek.supabase.co";
    const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      if (process.env.SUPABASE_PUBLISHABLE_KEY) {
        console.warn(
          "[supabase-sync] SUPABASE_PUBLISHABLE_KEY is set but daemon sync requires SUPABASE_SECRET_KEY",
        );
      }
      return new SupabaseSync();
    }
    return new SupabaseSync({
      url,
      serviceRoleKey: key,
      workspaceId: process.env.ARKHE_WORKSPACE_ID ?? "ark-playground",
    });
  }

  getStatus(): SupabaseSyncStatus {
    return { ...this.status };
  }

  async syncExperts(experts: ExpertSnapshot[]): Promise<void> {
    if (!this.client) return;

    const rows = experts.map((expert) => ({
      id: expert.id,
      role: expert.role,
      specialty: expert.specialty,
      preferred_layer: expert.preferredLayer,
      preferred_model: expert.preferredModel,
      status: expert.status,
      allowed_tools: expert.allowedTools,
      activations: expert.activations,
      last_activated_at: expert.lastActivatedAt ?? null,
      workspace_id: this.options?.workspaceId ?? null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await this.client.from("agents").upsert(rows, { onConflict: "id" });
    if (error) {
      this.status.lastError = error.message;
      return;
    }

    this.status.connected = true;
    this.status.agentsSynced = rows.length;
    this.status.lastSyncAt = new Date().toISOString();
    this.status.lastError = undefined;
  }

  async syncEventMemory(event: ArkheEvent): Promise<void> {
    if (!this.client) return;
    if (!event.agentId && !event.missionId) return;

    const memoryTypes = new Set([
      "agent.message",
      "model.route.completed",
      "mission.completed",
      "voice.command.recognized",
    ]);
    if (!memoryTypes.has(event.eventType)) return;

    const summary =
      (event.payload as { message?: string; outputPreview?: string; title?: string }).message ??
      (event.payload as { outputPreview?: string }).outputPreview ??
      (event.payload as { title?: string }).title ??
      event.eventType;

    const embedding = await this.embedQuery(summary);
    const { error } = await this.client.from("agent_memories").insert({
      agent_id: event.agentId ?? "agt_system",
      mission_id: event.missionId ?? null,
      memory_type: "episodic",
      content: summary,
      metadata: {
        eventId: event.id,
        eventType: event.eventType,
        ts: event.ts,
      },
      embedding: embedding?.length === 1536 ? embedding : null,
    });

    if (error) {
      this.status.lastError = error.message;
      return;
    }

    this.status.connected = true;
    this.status.memoriesSynced += 1;
    this.status.lastSyncAt = new Date().toISOString();
  }

  async searchVault(query: string, limit = 25): Promise<VaultMemoryRow[]> {
    if (!this.client || !query.trim()) return [];

    const embedding = await this.embedQuery(query);
    if (embedding?.length === 1536) {
      const { data, error } = await this.client.rpc("match_agent_memories", {
        query_embedding: embedding,
        match_count: limit,
      });
      if (!error && data?.length) {
        return data as VaultMemoryRow[];
      }
    }

    const { data, error } = await this.client
      .from("agent_memories")
      .select("id, agent_id, mission_id, memory_type, content, metadata, created_at")
      .ilike("content", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      this.status.lastError = error.message;
      return [];
    }
    return (data ?? []) as VaultMemoryRow[];
  }

  private async embedQuery(text: string): Promise<number[] | null> {
    const host = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
    const model = process.env.ARKHE_EMBED_MODEL ?? "nomic-embed-text";
    try {
      const response = await fetch(`${host}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt: text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return null;
      const body = (await response.json()) as { embedding?: number[] };
      return body.embedding ?? null;
    } catch {
      return null;
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    const { error } = await this.client.from("agents").select("id").limit(1);
    if (error) {
      this.status.lastError = error.message;
      this.status.connected = false;
      return false;
    }
    this.status.connected = true;
    return true;
  }
}
