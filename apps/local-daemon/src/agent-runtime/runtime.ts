import type { AgentEvent, AgentId, ArkheEvent, MissionId } from "@arkhe/contracts";

export interface RuntimeAgent {
  id: AgentId;
  missionId?: MissionId;
  role: string;
  status: string;
  parentAgentId?: AgentId;
  currentWorkItemId?: string;
  spawnedAt: string;
  updatedAt: string;
}

export interface WorkQueueItem {
  id: string;
  missionId?: MissionId;
  assignedAgentId?: AgentId;
  title: string;
  status: "queued" | "assigned" | "completed";
  createdAt: string;
}

export class AgentRuntime {
  private readonly agents = new Map<AgentId, RuntimeAgent>();
  private readonly workItems = new Map<string, WorkQueueItem>();

  ingest(event: ArkheEvent): void {
    if (!event.eventType.startsWith("agent.")) return;
    const agentEvent = event as AgentEvent;
    const payload = agentEvent.payload;
    const now = event.ts;

    if (event.eventType === "agent.spawned" || event.eventType === "agent.started") {
      const existing = this.agents.get(payload.agentId);
      this.agents.set(payload.agentId, {
        id: payload.agentId,
        missionId: event.missionId,
        role: payload.role,
        status: payload.status,
        parentAgentId: payload.parentAgentId,
        currentWorkItemId: payload.workItemId ?? existing?.currentWorkItemId,
        spawnedAt: existing?.spawnedAt ?? now,
        updatedAt: now,
      });
    }

    if (event.eventType === "agent.message" && payload.workItemId) {
      const assignedAgentId = payload.toAgentId ?? payload.agentId;
      this.workItems.set(payload.workItemId, {
        id: payload.workItemId,
        missionId: event.missionId,
        assignedAgentId,
        title: payload.message?.replace(/^Assigned work item: /, "") ?? payload.workItemId,
        status: "assigned",
        createdAt: now,
      });
      const assigned = this.agents.get(assignedAgentId);
      if (assigned) {
        assigned.currentWorkItemId = payload.workItemId;
        assigned.updatedAt = now;
      }
    }

    if (event.eventType === "agent.terminated" || event.eventType === "agent.completed" || event.eventType === "agent.failed") {
      const existing = this.agents.get(payload.agentId);
      if (existing) {
        existing.status = payload.status;
        existing.updatedAt = now;
      }
    }
  }

  terminateAll(): void {
    const now = new Date().toISOString();
    for (const agent of this.agents.values()) {
      agent.status = "terminated";
      agent.updatedAt = now;
    }
  }

  snapshot() {
    return {
      agents: Array.from(this.agents.values()),
      workItems: Array.from(this.workItems.values()),
    };
  }
}
