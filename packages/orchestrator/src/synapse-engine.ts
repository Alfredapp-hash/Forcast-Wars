import type { AgentId, ArkheEvent, MissionId, SynapseEvent, SynapseId } from "@arkhe/contracts";
import { createEventId, SCHEMA_VERSION } from "@arkhe/contracts";
import type { AgentRegistry } from "./agent-registry.js";

export interface AgentSynapse {
  id: SynapseId;
  sourceAgentId: AgentId;
  targetAgentId: AgentId;
  sourceRole: string;
  targetRole: string;
  weight: number;
  messages: number;
  successes: number;
  failures: number;
  lastReason?: string;
  lastReinforcedAt?: string;
  trusted: boolean;
}

export interface SynapseSnapshot {
  synapses: AgentSynapse[];
  proposedExperts: ProposedExpert[];
}

export interface ProposedExpert {
  role: string;
  sourceRoles: string[];
  confidence: number;
  reason: string;
}

const DIRECTOR_AGENT_ID = "agt_director_01" as AgentId;

/** Persistent weighted graph for the Neural Agent Layer. */
export class SynapseEngine {
  private readonly synapses = new Map<SynapseId, AgentSynapse>();
  private readonly missionAgents = new Map<MissionId, Map<AgentId, string>>();
  private readonly roles = new Map<AgentId, string>();
  private readonly roleToAgentId = new Map<string, AgentId>();
  private readonly proposed = new Map<string, ProposedExpert>();

  constructor(private readonly registry?: AgentRegistry) {
    for (const expert of registry?.snapshot() ?? []) {
      this.roles.set(expert.id, expert.role);
      this.roleToAgentId.set(expert.role, expert.id);
    }
  }

  ingest(event: ArkheEvent): SynapseEvent[] {
    if (event.eventType.startsWith("synapse.")) return [];
    this.captureAgentRole(event);

    if (event.eventType === "agent.message") {
      const from = event.payload.fromAgentId ?? event.agentId ?? event.payload.agentId;
      const to = event.payload.toAgentId;
      if (!from || !to) return [];
      return [
        this.record({
          sourceAgentId: from,
          targetAgentId: to,
          missionId: event.missionId,
          message: event.payload.message,
          reason: "Agent message routed through Synapse Engine",
          delta: 0.035,
          successScore: 0.55,
          eventType: "synapse.message",
        }),
      ];
    }

    if (event.eventType === "mission.completed" || event.eventType === "mission.failed") {
      return this.reinforceMission(event.missionId, event.eventType === "mission.completed");
    }

    if (event.eventType === "media.dream.reflection") {
      const p = (event.payload || {}) as {
        reflection?: string;
        performanceDelta?: number;
        synapseUpdates?: Array<{ sourceRole: string; targetRole: string; delta: number }>;
        proposedNewAgentRole?: string;
      };
      const out: SynapseEvent[] = [];
      if (Array.isArray(p.synapseUpdates)) {
        for (const u of p.synapseUpdates) {
          const se = this.applyExternalReinforcement({
            sourceRole: u.sourceRole,
            targetRole: u.targetRole,
            delta: u.delta,
            reason: `Media dream: ${(p.reflection || "").slice(0, 140)}`,
          });
          if (se) out.push(se);
        }
      }
      if (p.proposedNewAgentRole) {
        this.proposed.set(p.proposedNewAgentRole, {
          role: p.proposedNewAgentRole,
          sourceRoles: [],
          confidence: p.performanceDelta && p.performanceDelta > 0 ? 0.78 : 0.6,
          reason: `Emergent specialist proposed by Dreaming Agent (Media) from performance reflection.`,
        });
      }
      return out;
    }

    return [];
  }

  snapshot(): SynapseSnapshot {
    return {
      synapses: Array.from(this.synapses.values()).sort((a, b) => b.weight - a.weight),
      proposedExperts: Array.from(this.proposed.values()).sort((a, b) => b.confidence - a.confidence),
    };
  }

  private captureAgentRole(event: ArkheEvent): void {
    if (event.eventType === "agent.spawned" || event.eventType === "agent.started") {
      this.roles.set(event.payload.agentId, event.payload.role);
      this.roleToAgentId.set(event.payload.role, event.payload.agentId);
      if (event.missionId) {
        const agents = this.missionAgents.get(event.missionId) ?? new Map<AgentId, string>();
        agents.set(event.payload.agentId, event.payload.role);
        this.missionAgents.set(event.missionId, agents);
      }
    }
  }

  private reinforceMission(missionId: MissionId | undefined, succeeded: boolean): SynapseEvent[] {
    if (!missionId) return [];
    const agents = Array.from(this.missionAgents.get(missionId)?.entries() ?? []);
    const events: SynapseEvent[] = [];
    for (const [sourceAgentId] of agents) {
      for (const [targetAgentId] of agents) {
        if (sourceAgentId === targetAgentId) continue;
        events.push(
          this.record({
            sourceAgentId,
            targetAgentId,
            missionId,
            reason: succeeded ? "Mission succeeded with both agents active" : "Mission failed with both agents active",
            delta: succeeded ? 0.06 : -0.04,
            successScore: succeeded ? 1 : 0,
            eventType: succeeded ? "synapse.strengthened" : "synapse.weakened",
          }),
        );
      }
    }
    return events;
  }

  private record(input: {
    sourceAgentId: AgentId;
    targetAgentId: AgentId;
    missionId?: MissionId;
    message?: string;
    reason: string;
    delta: number;
    successScore: number;
    eventType: "synapse.message" | "synapse.strengthened" | "synapse.weakened";
  }): SynapseEvent {
    const id = synapseId(input.sourceAgentId, input.targetAgentId);
    const now = new Date().toISOString();
    const current = this.synapses.get(id) ?? {
      id,
      sourceAgentId: input.sourceAgentId,
      targetAgentId: input.targetAgentId,
      sourceRole: this.roleFor(input.sourceAgentId),
      targetRole: this.roleFor(input.targetAgentId),
      weight: 0.15,
      messages: 0,
      successes: 0,
      failures: 0,
      trusted: false,
    };

    current.messages += input.eventType === "synapse.message" ? 1 : 0;
    current.successes += input.successScore >= 0.75 ? 1 : 0;
    current.failures += input.successScore <= 0.25 ? 1 : 0;
    current.weight = clamp(current.weight + input.delta);
    current.lastReason = input.reason;
    current.lastReinforcedAt = now;
    current.trusted = current.weight >= 0.85 && current.successes >= 2;
    this.synapses.set(id, current);
    this.maybeProposeExpert(current);

    return {
      id: createEventId(),
      ts: now,
      schemaVersion: SCHEMA_VERSION,
      missionId: input.missionId,
      agentId: input.sourceAgentId,
      eventType: input.eventType,
      payload: {
        synapseId: current.id,
        sourceAgentId: current.sourceAgentId,
        targetAgentId: current.targetAgentId,
        sourceRole: current.sourceRole,
        targetRole: current.targetRole,
        message: input.message,
        weight: current.weight,
        delta: input.delta,
        successScore: input.successScore,
        reason: input.reason,
      },
    };
  }

  private roleFor(agentId: AgentId): string {
    return this.roles.get(agentId) ?? this.registry?.roleForId(agentId) ?? (agentId === DIRECTOR_AGENT_ID ? "Director" : agentId);
  }

  /** Resolve a human role name (e.g. "Content Agent") to its AgentId, using registry or stable synthesis for cortex specialists. */
  private getAgentIdForRole(role: string): AgentId | null {
    if (this.roleToAgentId.has(role)) return this.roleToAgentId.get(role)!;
    if (this.registry) {
      const match = this.registry.snapshot().find((e) => e.role === role);
      if (match) {
        this.roles.set(match.id, match.role);
        this.roleToAgentId.set(match.role, match.id);
        return match.id;
      }
    }
    // Stable synthesized id for unregistered roles (allows mesh tracking for emergent attention cortex pairs)
    const synth = `agt_${role.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "")}` as AgentId;
    this.roles.set(synth, role);
    this.roleToAgentId.set(role, synth);
    return synth;
  }

  /** Public API for external reinforcement (e.g. from Dreaming Agent (Media) reflections). Emits strengthened/weakened via record. */
  applyExternalReinforcement(input: {
    sourceRole: string;
    targetRole: string;
    delta: number;
    reason: string;
    successScore?: number;
    missionId?: MissionId;
  }): SynapseEvent | null {
    const sourceAgentId = this.getAgentIdForRole(input.sourceRole);
    const targetAgentId = this.getAgentIdForRole(input.targetRole);
    if (!sourceAgentId || !targetAgentId) return null;
    const et = input.delta >= 0 ? "synapse.strengthened" : "synapse.weakened";
    return this.record({
      sourceAgentId,
      targetAgentId,
      missionId: input.missionId,
      reason: input.reason,
      delta: input.delta,
      successScore: input.successScore ?? (input.delta >= 0 ? 0.78 : 0.32),
      eventType: et,
    });
  }

  private maybeProposeExpert(synapse: AgentSynapse): void {
    if (synapse.weight < 0.9 || synapse.successes < 3) return;
    const role = proposeRole(synapse.sourceRole, synapse.targetRole);
    if (!role) return;
    this.proposed.set(role, {
      role,
      sourceRoles: [synapse.sourceRole, synapse.targetRole],
      confidence: Number(synapse.weight.toFixed(2)),
      reason: `${synapse.sourceRole} and ${synapse.targetRole} repeatedly collaborate successfully.`,
    });
  }
}

function synapseId(source: AgentId, target: AgentId): SynapseId {
  return `syn_${source.replace(/^agt_/, "")}_${target.replace(/^agt_/, "")}` as SynapseId;
}

function clamp(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(4));
}

function proposeRole(sourceRole: string, targetRole: string): string | null {
  const pair = new Set([sourceRole, targetRole]);
  if (pair.has("SEO Agent") && pair.has("Content Agent")) return "SEO Strategy Agent";
  if (pair.has("Content Agent") && pair.has("Social Agent")) return "Distribution Strategy Agent";
  if (pair.has("Research Agent") && pair.has("Report Agent")) return "Research Briefing Agent";
  if (pair.has("Coding Agent") && pair.has("QA Agent")) return "Release Engineering Agent";
  return `${sourceRole.replace(" Agent", "")} ${targetRole.replace(" Agent", "")} Agent`;
}
