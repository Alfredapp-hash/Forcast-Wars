import type {
  AgentEvent,
  AgentId,
  ArkheEvent,
  DirectorCommand,
  MissionEvent,
  MissionId,
  ModelEvent,
  ModelTaskClass,
  VoiceEvent,
} from "@arkhe/contracts";
import {
  createEventId,
  createMissionId,
  createSpanId,
  createTraceId,
  SCHEMA_VERSION,
} from "@arkhe/contracts";
import { ModelRouter } from "@arkhe/model-router";
import { MissionExecutor } from "./mission-executor.js";
import { AgentRegistry, mapTemplateRole } from "./agent-registry.js";
import { missionBudgetUsd } from "./runtime-settings.js";

export interface DirectorDeps {
  publish: (event: ArkheEvent) => Promise<void>;
  modelRouter?: ModelRouter;
  executor?: MissionExecutor;
  agentRegistry?: AgentRegistry;
}

export interface CreateMissionResult {
  missionId: MissionId;
  agentIds: AgentId[];
}

const DIRECTOR_AGENT_ID = "agt_director_01" as AgentId;

export class Director {
  private readonly modelRouter: ModelRouter;
  private readonly executor?: MissionExecutor;
  private readonly agentRegistry: AgentRegistry;

  constructor(private readonly deps: DirectorDeps) {
    this.modelRouter = deps.modelRouter ?? new ModelRouter();
    this.executor = deps.executor;
    this.agentRegistry = deps.agentRegistry ?? new AgentRegistry();
  }

  async handleCommand(command: DirectorCommand): Promise<CreateMissionResult | null> {
    const route = await this.routeModel("classify_intent", command.utterance, command.ts);
    await this.emitVoiceRecognized(command, route.output);

    const intent = parseIntent(command.utterance, route.output);
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

    const plan = planAgents(input.template, this.agentRegistry);

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

    for (const workItem of plan.workItems) {
      const assignedAgent = plan.agents.find((agent) => agent.role === workItem.assignedRole);
      if (!assignedAgent) continue;
      await this.deps.publish(agentEvent("agent.message", missionId, now, traceId, {
        agentId: DIRECTOR_AGENT_ID,
        kind: "director",
        role: "Director",
        status: "running",
        toAgentId: assignedAgent.id,
        workItemId: workItem.id,
        message: `Assigned work item: ${workItem.title}`,
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

    if (this.executor) {
      void this.executor.run({
        plan: {
          title: input.title,
          objective: input.objective,
          agents: plan.agents,
          workItems: plan.workItems,
          budgetUsd: plan.budgetUsd,
        },
        missionId,
        traceId,
        utterance: input.sourceCommand.utterance,
      });
    }

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

  async pauseMission(missionId: MissionId): Promise<void> {
    await this.deps.publish(missionEvent("mission.paused", missionId, new Date().toISOString(), createTraceId(), {
      missionId,
      title: "Paused Mission",
      status: "paused",
    }));
  }

  async resumeMission(missionId: MissionId): Promise<void> {
    await this.deps.publish(missionEvent("mission.resumed", missionId, new Date().toISOString(), createTraceId(), {
      missionId,
      title: "Resumed Mission",
      status: "active",
    }));
  }

  private async routeModel(taskClass: ModelTaskClass, input: string, ts: string) {
    await this.deps.publish(modelEvent("model.route.requested", ts, {
      taskClass,
      provider: "mock",
      model: "pending",
      reason: "Director requested free/local-first model routing.",
      inputPreview: input.slice(0, 160),
    }));

    const result = await this.modelRouter.run({ taskClass, input });

    await this.deps.publish(modelEvent("model.route.selected", ts, {
      taskClass,
      provider: result.provider,
      model: result.model,
      reason: result.reason,
      confidence: result.confidence,
      layer: result.layer,
      escalated: result.escalated,
      inputPreview: input.slice(0, 160),
      outputPreview: result.output.slice(0, 220),
    }));

    if (result.escalated) {
      await this.deps.publish(modelEvent("model.route.escalated", ts, {
        taskClass,
        provider: result.provider,
        model: result.model,
        reason: `Escalated to layer ${result.layer}: ${result.reason}`,
        confidence: result.confidence,
        layer: result.layer,
        escalationRequired: true,
        inputPreview: input.slice(0, 160),
      }));
    }

    await this.deps.publish(modelEvent("model.route.completed", ts, {
      taskClass,
      provider: result.provider,
      model: result.model,
      reason: result.reason,
      confidence: result.confidence,
      layer: result.layer,
      latencyMs: result.latencyMs,
      escalated: result.escalated,
      outputPreview: result.output.slice(0, 220),
    }));

    return result;
  }

  private async emitVoiceRecognized(command: DirectorCommand, routedIntent: string): Promise<void> {
    const event: VoiceEvent = {
      id: createEventId(),
      ts: command.ts,
      schemaVersion: SCHEMA_VERSION,
      agentId: DIRECTOR_AGENT_ID,
      eventType: "voice.command.recognized",
      payload: {
        sessionId: command.id,
        transcript: command.utterance,
        intent: routedIntent,
        confidence: 0.85,
      },
    };
    await this.deps.publish(event);
  }
}

export type MissionTemplate = "audit" | "competitor_research" | "proposal" | "generic";

function parseIntent(utterance: string, routedIntent = ""): {
  title: string;
  objective: string;
  template: MissionTemplate;
} | null {
  const lower = utterance.toLowerCase();
  const routed = routedIntent.toLowerCase();

  if ((lower.includes("audit") || routed.includes("audit")) && (lower.includes("website") || lower.includes("site") || routed.includes("audit"))) {
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

function modelEvent(
  eventType: ModelEvent["eventType"],
  ts: string,
  payload: ModelEvent["payload"],
): ModelEvent {
  return {
    id: createEventId(),
    ts,
    schemaVersion: SCHEMA_VERSION,
    agentId: DIRECTOR_AGENT_ID,
    trace: { traceId: createTraceId(), spanId: createSpanId() },
    eventType,
    payload,
  };
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

export interface PlannedAgent {
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

export interface WorkItem {
  id: string;
  title: string;
  assignedRole: string;
  dependsOn?: string[];
}

function planAgents(template: MissionTemplate, registry: AgentRegistry) {
  const director = DIRECTOR_AGENT_ID;
  const agents: PlannedAgent[] = [];
  const workItems: WorkItem[] = [];

  const add = (role: string, tools?: string[], maxCostUsd = 1.5) => {
    const mappedRole = mapTemplateRole(role);
    const expert = registry.activate(mappedRole);
    agents.push({
      id: expert.id,
      kind: "resident",
      role: expert.role,
      parentId: director,
      permissions: {
        riskClass: "green",
        allowedTools: tools ?? expert.allowedTools,
        maxCostUsd,
      },
    });
  };

  const addWork = (assignedRole: string, title: string, dependsOn?: string[]) => {
    const id = `wrk_${workItems.length + 1}`;
    workItems.push({ id, assignedRole, title, dependsOn });
    return id;
  };

  switch (template) {
    case "audit":
      add("Browser Agent", ["browser.navigate", "browser.screenshot", "browser.dom"]);
      add("SEO Agent", ["search", "analyze.seo", "browser.read"]);
      add("Report Agent", ["document.write", "document.publish", "summarize"]);
      {
        const browse = addWork("Browser Agent", "Map target pages and collect browser evidence.");
        const seo = addWork("SEO Agent", "Analyze technical SEO and content gaps.", [browse]);
        addWork("Report Agent", "Compile the audit report and next actions.", [seo]);
      }
      break;
    case "competitor_research":
      add("Browser Agent", ["browser.navigate", "browser.screenshot"]);
      add("Research Agent", ["search", "summarize", "extract"]);
      add("Screenshot Agent", ["browser.screenshot"]);
      add("Report Agent", ["document.write", "document.publish", "summarize"]);
      {
        const research = addWork("Research Agent", "Identify competitor positioning and offers.");
        addWork("Browser Agent", "Visit competitor pages and extract page context.", [research]);
        addWork("Screenshot Agent", "Capture visual proof points.", [research]);
        addWork("Report Agent", "Create a competitive findings brief.", [research]);
      }
      break;
    case "proposal":
      add("Ark Vault Agent");
      add("Report Agent");
      add("Marketing Agent");
      {
        const memory = addWork("Ark Vault Agent", "Retrieve prior findings and client context.");
        const report = addWork("Report Agent", "Draft a proposal from the findings.", [memory]);
        addWork("Marketing Agent", "Polish the proposal for brand voice.", [report]);
      }
      break;
    default:
      add("General Agent", ["search", "summarize"]);
      addWork("General Agent", "Complete the requested mission and report back.");
      break;
  }

  return {
    agents,
    workItems,
    budgetUsd: missionBudgetUsd(agents.length),
    riskScore: template === "competitor_research" ? 18 : 10,
  };
}
