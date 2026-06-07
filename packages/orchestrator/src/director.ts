import type {
  AgentEvent,
  AgentId,
  ArkheEvent,
  DirectorCommand,
  MissionEvent,
  MissionId,
  VoiceEvent,
} from "@arkhe/contracts";
import {
  createAgentId,
  createEventId,
  createMissionId,
  createSpanId,
  createTraceId,
  SCHEMA_VERSION,
} from "@arkhe/contracts";

export interface DirectorDeps {
  publish: (event: ArkheEvent) => Promise<void>;
}

export interface CreateMissionResult {
  missionId: MissionId;
  agentIds: AgentId[];
}

const DIRECTOR_AGENT_ID = "agt_director_01" as AgentId;

export class Director {
  constructor(private readonly deps: DirectorDeps) {}

  async handleCommand(command: DirectorCommand): Promise<CreateMissionResult | null> {
    await this.emitVoiceRecognized(command);

    const intent = parseIntent(command.utterance);
    if (!intent) {
      return null;
    }

    return this.createMission({
      title: intent.title,
      objective: intent.objective,
      template: intent.template,
      sourceCommand: command,
    });
  }

  async createMission(input: {
    title: string;
    objective: string;
    template: MissionTemplate;
    sourceCommand: DirectorCommand;
  }): Promise<CreateMissionResult> {
    const missionId = createMissionId();
    const traceId = createTraceId();
    const now = new Date().toISOString();

    const plan = planAgents(input.template, missionId);

    await this.deps.publish(missionEvent("mission.created", missionId, now, traceId, {
      missionId,
      title: input.title,
      status: "planning",
      objective: input.objective,
      budgetUsd: plan.budgetUsd,
      budgetUsedUsd: 0,
      completionPct: 0,
      riskScore: plan.riskScore,
      spawnedAgentIds: plan.agents.map((a) => a.id),
    }));

    await this.deps.publish(missionEvent("mission.planned", missionId, now, traceId, {
      missionId,
      title: input.title,
      status: "planning",
      objective: input.objective,
      budgetUsd: plan.budgetUsd,
      budgetUsedUsd: 0,
      completionPct: 5,
      riskScore: plan.riskScore,
      spawnedAgentIds: plan.agents.map((a) => a.id),
    }));

    for (const agent of plan.agents) {
      await this.deps.publish(agentEvent("agent.spawned", missionId, now, traceId, {
        agentId: agent.id,
        kind: agent.kind,
        role: agent.role,
        status: "spawning",
        parentAgentId: agent.parentId,
        permissions: agent.permissions,
        healthScore: 100,
      }));

      await this.deps.publish(agentEvent("agent.started", missionId, now, traceId, {
        agentId: agent.id,
        kind: agent.kind,
        role: agent.role,
        status: "running",
        parentAgentId: agent.parentId,
        permissions: agent.permissions,
        healthScore: 100,
        message: `${agent.role} online`,
      }));
    }

    await this.deps.publish(missionEvent("mission.started", missionId, now, traceId, {
      missionId,
      title: input.title,
      status: "active",
      objective: input.objective,
      budgetUsd: plan.budgetUsd,
      budgetUsedUsd: 0,
      completionPct: 10,
      riskScore: plan.riskScore,
      spawnedAgentIds: plan.agents.map((a) => a.id),
    }));

    return { missionId, agentIds: plan.agents.map((a) => a.id) };
  }

  async killAll(): Promise<void> {
    const now = new Date().toISOString();
    await this.deps.publish({
      id: createEventId(),
      ts: now,
      schemaVersion: SCHEMA_VERSION,
      agentId: DIRECTOR_AGENT_ID,
      eventType: "agent.terminated",
      payload: {
        agentId: DIRECTOR_AGENT_ID,
        kind: "director",
        role: "Director",
        status: "terminated",
        message: "Kill switch activated — all agents terminated",
      },
    });
  }

  private async emitVoiceRecognized(command: DirectorCommand): Promise<void> {
    const event: VoiceEvent = {
      id: createEventId(),
      ts: command.ts,
      schemaVersion: SCHEMA_VERSION,
      agentId: DIRECTOR_AGENT_ID,
      eventType: "voice.command.recognized",
      payload: {
        sessionId: command.id,
        transcript: command.utterance,
        intent: parseIntent(command.utterance)?.template ?? "unknown",
      },
    };
    await this.deps.publish(event);
  }
}

export type MissionTemplate = "audit" | "competitor_research" | "proposal" | "generic";

function parseIntent(utterance: string): {
  title: string;
  objective: string;
  template: MissionTemplate;
} | null {
  const lower = utterance.toLowerCase();

  if (lower.includes("audit") && (lower.includes("website") || lower.includes("site"))) {
    return {
      title: "Website SEO Audit",
      objective: utterance,
      template: "audit",
    };
  }
  if (lower.includes("competitor") || lower.includes("research")) {
    return {
      title: "Competitor Research",
      objective: utterance,
      template: "competitor_research",
    };
  }
  if (lower.includes("proposal")) {
    return {
      title: "Proposal Generation",
      objective: utterance,
      template: "proposal",
    };
  }
  if (lower.includes("mission") || lower.includes("director")) {
    return {
      title: "New Mission",
      objective: utterance,
      template: "generic",
    };
  }

  return null;
}

function missionEvent(
  eventType: MissionEvent["eventType"],
  missionId: MissionId,
  ts: string,
  traceId: ReturnType<typeof createTraceId>,
  payload: MissionEvent["payload"],
): MissionEvent {
  return {
    id: createEventId(),
    ts,
    schemaVersion: SCHEMA_VERSION,
    missionId,
    agentId: DIRECTOR_AGENT_ID,
    trace: { traceId, spanId: createSpanId() },
    eventType,
    payload,
  };
}

function agentEvent(
  eventType: AgentEvent["eventType"],
  missionId: MissionId,
  ts: string,
  traceId: ReturnType<typeof createTraceId>,
  payload: AgentEvent["payload"],
): AgentEvent {
  return {
    id: createEventId(),
    ts,
    schemaVersion: SCHEMA_VERSION,
    missionId,
    agentId: payload.agentId,
    parentAgentId: payload.parentAgentId ?? DIRECTOR_AGENT_ID,
    trace: { traceId, spanId: createSpanId() },
    eventType,
    payload,
  };
}

interface PlannedAgent {
  id: AgentId;
  kind: "mission" | "resident";
  role: string;
  parentId: AgentId;
  permissions: {
    riskClass: "green" | "yellow" | "orange" | "red";
    allowedTools: string[];
    maxCostUsd?: number;
  };
}

function planAgents(template: MissionTemplate, _missionId: MissionId) {
  const director = DIRECTOR_AGENT_ID;
  const agents: PlannedAgent[] = [];

  const add = (role: string, tools: string[], maxCostUsd = 1.5) => {
    agents.push({
      id: createAgentId(),
      kind: "mission",
      role,
      parentId: director,
      permissions: { riskClass: "green", allowedTools: tools, maxCostUsd },
    });
  };

  switch (template) {
    case "audit":
      add("Browser Agent", ["browser.navigate", "browser.screenshot", "browser.dom"]);
      add("SEO Agent", ["search", "analyze.seo", "browser.read"]);
      add("Report Agent", ["document.write", "summarize"]);
      break;
    case "competitor_research":
      add("Browser Agent", ["browser.navigate", "browser.screenshot"]);
      add("Research Agent", ["search", "summarize", "extract"]);
      add("Screenshot Agent", ["browser.screenshot"]);
      add("Report Agent", ["document.write", "summarize"]);
      break;
    case "proposal":
      add("Memory Agent", ["memory.search", "memory.retrieve"]);
      add("Report Agent", ["document.write", "summarize"]);
      add("Marketing Agent", ["document.format", "brand.apply"]);
      break;
    default:
      add("General Agent", ["search", "summarize"]);
      break;
  }

  return {
    agents,
    budgetUsd: agents.length * 1.5,
    riskScore: template === "competitor_research" ? 18 : 10,
  };
}
