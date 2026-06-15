import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ArkheEvent } from "@arkhe/contracts";

export interface ExpertSnapshot {
  id: string;
  role: string;
  specialty: string;
  cortex?: string;
  permanent?: boolean;
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
  importance?: number;
  context_tags?: string[];
  access_count?: number;
  last_accessed_at?: string | null;
  created_at: string;
  similarity?: number;
  recency_score?: number;
  activation_score?: number;
}

export interface AgentSynapseSnapshot {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  sourceRole: string;
  targetRole: string;
  weight: number;
  messages: number;
  successes: number;
  failures: number;
  trusted: boolean;
  lastReason?: string;
  lastReinforcedAt?: string;
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

  getClient(): SupabaseClient | null {
    return this.client;
  }

  async syncExperts(experts: ExpertSnapshot[]): Promise<void> {
    if (!this.client) return;

    const rows = experts.map((expert) => ({
      id: expert.id,
      role: expert.role,
      specialty: expert.specialty,
      cortex: expert.cortex ?? "general",
      permanent: expert.permanent ?? false,
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

  async syncSynapses(synapses: AgentSynapseSnapshot[]): Promise<void> {
    if (!this.client || synapses.length === 0) return;
    const rows = synapses.map((synapse) => ({
      id: synapse.id,
      source_agent_id: synapse.sourceAgentId,
      target_agent_id: synapse.targetAgentId,
      source_role: synapse.sourceRole,
      target_role: synapse.targetRole,
      weight: synapse.weight,
      messages: synapse.messages,
      successes: synapse.successes,
      failures: synapse.failures,
      trusted: synapse.trusted,
      last_reason: synapse.lastReason ?? null,
      last_reinforced_at: synapse.lastReinforcedAt ?? null,
      workspace_id: this.options?.workspaceId ?? null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await this.client.from("agent_synapses").upsert(rows, { onConflict: "id" });
    if (error) {
      this.status.lastError = error.message;
      return;
    }
    this.status.connected = true;
    this.status.lastSyncAt = new Date().toISOString();
  }

  async listSynapses(limit = 100): Promise<AgentSynapseSnapshot[]> {
    if (!this.client) return [];
    const { data, error } = await this.client
      .from("agent_synapses")
      .select("id, source_agent_id, target_agent_id, source_role, target_role, weight, messages, successes, failures, trusted, last_reason, last_reinforced_at")
      .order("weight", { ascending: false })
      .limit(limit);
    if (error) {
      this.status.lastError = error.message;
      return [];
    }
    return (data ?? []).map((row) => ({
      id: row.id,
      sourceAgentId: row.source_agent_id,
      targetAgentId: row.target_agent_id,
      sourceRole: row.source_role,
      targetRole: row.target_role,
      weight: row.weight,
      messages: row.messages,
      successes: row.successes,
      failures: row.failures,
      trusted: row.trusted,
      lastReason: row.last_reason ?? undefined,
      lastReinforcedAt: row.last_reinforced_at ?? undefined,
    }));
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
    const contextTags = contextTagsForEvent(event);
    const { error } = await this.client.from("agent_memories").insert({
      agent_id: event.agentId ?? "agt_system",
      mission_id: event.missionId ?? null,
      memory_type: "episodic",
      content: summary,
      importance: estimateImportance(event, summary),
      context_tags: contextTags,
      metadata: {
        eventId: event.id,
        eventType: event.eventType,
        ts: event.ts,
        contextTags,
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

  async searchVault(
    query: string,
    limit = 25,
    context?: { agentId?: string; missionId?: string; tags?: string[] },
  ): Promise<VaultMemoryRow[]> {
    if (!this.client || !query.trim()) return [];

    const embedding = await this.embedQuery(query);
    if (embedding?.length === 1536) {
      const { data, error } = await this.client.rpc("match_agent_memories", {
        query_embedding: embedding,
        match_count: limit,
        context_agent_id: context?.agentId ?? null,
        context_mission_id: context?.missionId ?? null,
        context_tags: context?.tags ?? [],
      });
      if (!error && data?.length) {
        const rows = data as VaultMemoryRow[];
        await this.touchMemories(rows.map((row) => row.id));
        return rows;
      }
    }

    const { data, error } = await this.client
      .from("agent_memories")
      .select("id, agent_id, mission_id, memory_type, content, metadata, importance, context_tags, access_count, last_accessed_at, created_at")
      .ilike("content", `%${query}%`)
      .order("importance", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      this.status.lastError = error.message;
      return [];
    }
    const rows = rankFallback((data ?? []) as VaultMemoryRow[], context);
    await this.touchMemories(rows.map((row) => row.id));
    return rows;
  }

  async createReflection(input: {
    content: string;
    agentId?: string;
    missionId?: string;
    importance?: number;
    tags?: string[];
  }): Promise<void> {
    if (!this.client) return;
    const embedding = await this.embedQuery(input.content);
    const { error } = await this.client.from("agent_memories").insert({
      agent_id: input.agentId ?? "agt_reflection",
      mission_id: input.missionId ?? null,
      memory_type: "reflection",
      content: input.content,
      importance: input.importance ?? 0.85,
      context_tags: input.tags ?? ["dream", "reflection"],
      metadata: { generatedBy: "dreaming_service" },
      embedding: embedding?.length === 1536 ? embedding : null,
    });
    if (error) this.status.lastError = error.message;
  }

  /** Persist a specialized Attention Cortex / media performance reflection to the media_reflections table (L2). */
  async createMediaReflection(input: {
    reflection: string;
    performanceDelta?: number;
    proposedNewAgentRole?: string;
    topic?: string;
  }): Promise<void> {
    if (!this.client) return;
    const { error } = await this.client.from("media_reflections").insert({
      reflection: input.reflection,
      performance_delta: input.performanceDelta ?? null,
      proposed_new_agent_role: input.proposedNewAgentRole ?? null,
      workspace_id: this.options?.workspaceId ?? null,
    });
    if (error) {
      this.status.lastError = error.message;
    } else {
      this.status.memoriesSynced += 1;
      this.status.lastSyncAt = new Date().toISOString();
    }
  }

  private async touchMemories(ids: string[]): Promise<void> {
    if (!this.client || ids.length === 0) return;
    for (const id of ids.slice(0, 10)) {
      await this.client.rpc("touch_agent_memory", { memory_id: id });
    }
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

function estimateImportance(event: ArkheEvent, content: string): number {
  let score = 0.35;
  if (event.eventType === "mission.completed") score += 0.3;
  if (event.eventType === "voice.command.recognized") score += 0.2;
  if (event.eventType === "model.route.completed") score += 0.15;
  if (content.length > 240) score += 0.1;
  if (/\b(prefer|always|never|goal|important|remember)\b/i.test(content)) score += 0.2;
  return Math.min(1, Number(score.toFixed(2)));
}

function contextTagsForEvent(event: ArkheEvent): string[] {
  const tags = new Set<string>([event.eventType.split(".")[0]]);
  if (event.missionId) tags.add("mission");
  if (event.agentId) tags.add(event.agentId);
  const payload = event.payload as { role?: string; taskClass?: string; provider?: string; model?: string };
  if (payload.role) tags.add(slug(payload.role));
  if (payload.taskClass) tags.add(payload.taskClass);
  if (payload.provider) tags.add(payload.provider);
  if (payload.model) tags.add(slug(payload.model));
  return Array.from(tags).slice(0, 12);
}

function rankFallback(
  rows: VaultMemoryRow[],
  context?: { agentId?: string; missionId?: string; tags?: string[] },
): VaultMemoryRow[] {
  const now = Date.now();
  return rows
    .map((row) => {
      const ageDays = Math.max(0, (now - Date.parse(row.created_at)) / 86_400_000);
      const recency = 1 / (1 + ageDays / 14);
      const contextScore =
        (context?.agentId && row.agent_id === context.agentId ? 0.15 : 0) +
        (context?.missionId && row.mission_id === context.missionId ? 0.15 : 0) +
        overlap(row.context_tags ?? [], context?.tags ?? []) * 0.05;
      const activation = (row.importance ?? 0.35) * 0.55 + recency * 0.3 + contextScore;
      return {
        ...row,
        recency_score: Number(recency.toFixed(4)),
        activation_score: Number(Math.min(1, activation).toFixed(4)),
      };
    })
    .sort((a, b) => (b.activation_score ?? 0) - (a.activation_score ?? 0));
}

function overlap(a: string[], b: string[]): number {
  const right = new Set(b);
  return a.filter((item) => right.has(item)).length;
}

function slug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
