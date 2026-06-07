import type {
  AgentId,
  ArkheEvent,
  MissionEvent,
  MissionId,
  RiskClass,
  TraceId,
} from "@arkhe/contracts";
import {
  createEventId,
  createSpanId,
  SCHEMA_VERSION,
} from "@arkhe/contracts";
import { BrowserRuntime } from "@arkhe/browser-runtime";
import { ModelRouter } from "@arkhe/model-router";
import { ToolGateway } from "@arkhe/tool-gateway";
import type { PlannedAgent, WorkItem } from "./director.js";

export interface MissionPlan {
  title: string;
  objective: string;
  agents: PlannedAgent[];
  workItems: WorkItem[];
  budgetUsd: number;
}

export interface ApprovalClient {
  request(input: {
    missionId?: MissionId;
    agentId: AgentId;
    action: string;
    summary: string;
    riskClass: RiskClass;
    evidenceRefs?: string[];
  }): Promise<boolean>;
}

export interface MissionExecutorDeps {
  publish: (event: ArkheEvent) => Promise<void>;
  modelRouter: ModelRouter;
  browserRuntime: BrowserRuntime;
  toolGateway: ToolGateway;
  approvalClient?: ApprovalClient;
}

const DIRECTOR_AGENT_ID = "agt_director_01" as AgentId;

export class MissionExecutor {
  constructor(private readonly deps: MissionExecutorDeps) {}

  async run(input: {
    plan: MissionPlan;
    missionId: MissionId;
    traceId: TraceId;
    utterance: string;
  }): Promise<void> {
    const { plan, missionId, traceId, utterance } = input;
    let findings = "";
    const total = plan.workItems.length;
    let completed = 0;

    for (const workItem of plan.workItems) {
      const agent = plan.agents.find((a) => a.role === workItem.assignedRole);
      if (!agent) continue;

      await this.agentMessage(missionId, traceId, agent.id, workItem.id, `Starting: ${workItem.title}`);

      if (agent.role.includes("Browser") || agent.role.includes("Screenshot")) {
        findings = await this.runBrowserStep(missionId, traceId, agent, utterance, findings);
      } else if (agent.role.includes("SEO") || agent.role.includes("Research")) {
        findings = await this.runAnalysisStep(missionId, traceId, agent, workItem, findings || utterance);
      } else if (agent.role.includes("Report") || agent.role.includes("Marketing") || agent.role.includes("General")) {
        findings = await this.runReportStep(missionId, traceId, agent, workItem, findings || utterance);
      } else if (agent.role.includes("Memory") || agent.role.includes("Vault")) {
        findings = await this.runMemoryStep(missionId, traceId, agent, workItem, utterance);
      }

      completed += 1;
      const completionPct = Math.round(10 + (completed / total) * 85);
      await this.missionProgress(missionId, traceId, plan, completionPct);
      await this.agentMessage(missionId, traceId, agent.id, workItem.id, `Completed: ${workItem.title}`);
    }

    await this.deps.publish({
      id: createEventId(),
      ts: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      missionId,
      agentId: DIRECTOR_AGENT_ID,
      eventType: "mission.completed",
      payload: {
        missionId,
        title: plan.title,
        status: "completed",
        objective: plan.objective,
        budgetUsd: plan.budgetUsd,
        budgetUsedUsd: 0,
        completionPct: 100,
      },
    });

    for (const agent of plan.agents) {
      await this.deps.publish({
        id: createEventId(),
        ts: new Date().toISOString(),
        schemaVersion: SCHEMA_VERSION,
        missionId,
        agentId: agent.id,
        eventType: "agent.completed",
        payload: {
          agentId: agent.id,
          kind: agent.kind,
          role: agent.role,
          status: "completed",
          healthScore: 96,
          message: `${agent.role} finished mission work`,
        },
      });
    }
  }

  private async runBrowserStep(
    missionId: MissionId,
    traceId: TraceId,
    agent: PlannedAgent,
    utterance: string,
    existing: string,
  ): Promise<string> {
    const url = extractUrl(utterance) ?? "https://example.com";
    const decision = this.deps.toolGateway.decide(
      { toolName: "browser.navigate", riskClass: "green", input: { url } },
      agent.permissions,
    );

    if (!decision.allowed) {
      await this.agentMessage(missionId, traceId, agent.id, undefined, decision.reason);
      return existing;
    }

    const visit = await this.deps.browserRuntime.inspectUrl({
      missionId,
      agentId: agent.id,
      url,
    });

    for (const event of visit.events) {
      await this.deps.publish({ ...event, trace: { traceId, spanId: createSpanId() } });
    }

    return [existing, visit.textPreview, visit.title].filter(Boolean).join("\n");
  }

  private async runAnalysisStep(
    missionId: MissionId,
    traceId: TraceId,
    agent: PlannedAgent,
    workItem: WorkItem,
    input: string,
  ): Promise<string> {
    const result = await this.deps.modelRouter.run({
      taskClass: agent.role.includes("SEO") ? "summarize_page" : "extract_facts",
      input: `${workItem.title}\n${input}`,
      agentRole: agent.role,
      requiresHighReasoning: agent.role.includes("Research"),
    });

    await this.deps.publish({
      id: createEventId(),
      ts: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      missionId,
      agentId: agent.id,
      trace: { traceId, spanId: createSpanId() },
      eventType: "model.route.completed",
      payload: {
        taskClass: agent.role.includes("SEO") ? "summarize_page" : "extract_facts",
        provider: result.provider,
        model: result.model,
        reason: result.reason,
        confidence: result.confidence,
        layer: result.layer,
        latencyMs: result.latencyMs,
        escalated: result.escalated,
        outputPreview: result.output.slice(0, 220),
      },
      cost: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: result.estimatedCostUsd,
        model: result.model,
        provider: result.provider,
      },
    });

    await this.agentMessage(missionId, traceId, agent.id, workItem.id, result.output);
    return result.output;
  }

  private async runReportStep(
    missionId: MissionId,
    traceId: TraceId,
    agent: PlannedAgent,
    workItem: WorkItem,
    input: string,
  ): Promise<string> {
    const publishDecision = this.deps.toolGateway.decide(
      { toolName: "document.publish", riskClass: "orange", input: { title: workItem.title } },
      { ...agent.permissions, requiresApprovalAbove: "orange" },
    );

    if (publishDecision.approvalRequired && this.deps.approvalClient) {
      const granted = await this.deps.approvalClient.request({
        missionId,
        agentId: agent.id,
        action: "document.publish",
        summary: `${agent.role} wants to publish: ${workItem.title}`,
        riskClass: "orange",
      });
      if (!granted) {
        await this.agentMessage(missionId, traceId, agent.id, workItem.id, "Publish denied — report kept as draft.");
        const draft = await this.deps.modelRouter.run({
          taskClass: "draft_report",
          input: `${workItem.title}\n${input}`,
          agentRole: agent.role,
        });
        return draft.output;
      }
    }

    const result = await this.deps.modelRouter.run({
      taskClass: "draft_report",
      input: `${workItem.title}\n${input}`,
      agentRole: agent.role,
    });
    await this.agentMessage(missionId, traceId, agent.id, workItem.id, result.output);
    return result.output;
  }

  private async runMemoryStep(
    missionId: MissionId,
    traceId: TraceId,
    agent: PlannedAgent,
    workItem: WorkItem,
    utterance: string,
  ): Promise<string> {
    const result = await this.deps.modelRouter.run({
      taskClass: "extract_facts",
      input: `Retrieve mission context for: ${utterance}`,
      agentRole: agent.role,
    });
    await this.agentMessage(missionId, traceId, agent.id, workItem.id, result.output);
    return result.output;
  }

  private async missionProgress(
    missionId: MissionId,
    traceId: TraceId,
    plan: MissionPlan,
    completionPct: number,
  ): Promise<void> {
    const event: MissionEvent = {
      id: createEventId(),
      ts: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      missionId,
      agentId: DIRECTOR_AGENT_ID,
      trace: { traceId, spanId: createSpanId() },
      eventType: "mission.started",
      payload: {
        missionId,
        title: plan.title,
        status: "active",
        objective: plan.objective,
        budgetUsd: plan.budgetUsd,
        budgetUsedUsd: 0,
        completionPct,
        spawnedAgentIds: plan.agents.map((a) => a.id),
      },
    };
    await this.deps.publish(event);
  }

  private async agentMessage(
    missionId: MissionId,
    traceId: TraceId,
    agentId: AgentId,
    workItemId: string | undefined,
    message: string,
  ): Promise<void> {
    await this.deps.publish({
      id: createEventId(),
      ts: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      missionId,
      agentId,
      trace: { traceId, spanId: createSpanId() },
      eventType: "agent.message",
      payload: {
        agentId,
        kind: "mission",
        role: "Agent",
        status: "running",
        workItemId,
        message,
      },
    });
  }
}

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+|(?:[a-z0-9-]+\.)+[a-z]{2,}/i);
  if (!match) return null;
  const value = match[0].replace(/[.,]$/, "");
  return value.includes("://") ? value : `https://${value}`;
}
