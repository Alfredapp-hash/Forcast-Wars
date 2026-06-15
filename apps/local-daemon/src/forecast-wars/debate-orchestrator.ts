import type { ArkheEvent, DebateEvent, MissionId } from "@arkhe/contracts";
import {
  createEventId,
  createMissionId,
  createSpanId,
  createTraceId,
  SCHEMA_VERSION,
} from "@arkhe/contracts";
import type { ModelRouter } from "@arkhe/model-router";
import type { Director } from "@arkhe/orchestrator";

export interface DebateOrchestratorDeps {
  publish: (event: ArkheEvent) => Promise<void>;
  modelRouter: ModelRouter;
  director: Director;
}

export interface StartDebateInput {
  predictionId: string;
  predictionSlug: string;
  title: string;
  description: string;
  yesPosition: string;
  noPosition: string;
  affirmativeAgentId?: string;
  negativeAgentId?: string;
}

const DEBATE_ROLE_TASK_MAP: Record<string, string> = {
  "Affirmative Agent": "debate_opening",
  "Negative Agent": "debate_opening",
  "Fact-Check Agent": "debate_fact_check",
  "Judge Agent": "debate_judge",
  "Narrator Agent": "debate_narrate",
};

export class DebateOrchestrator {
  constructor(private readonly deps: DebateOrchestratorDeps) {}

  async startDebate(input: StartDebateInput): Promise<{ missionId: MissionId }> {
    const missionId = createMissionId();
    const traceId = createTraceId();
    const now = new Date().toISOString();

    await this.emitDebate("prediction.created", missionId, now, traceId, {
      predictionId: input.predictionId,
      predictionSlug: input.predictionSlug,
      title: input.title,
      summary: input.description,
    });

    await this.emitDebate("debate.room_created", missionId, now, traceId, {
      predictionId: input.predictionId,
      predictionSlug: input.predictionSlug,
      title: input.title,
      agentId: input.affirmativeAgentId as DebateEvent["payload"]["agentId"],
    });

    const result = await this.deps.director.createMission({
      title: input.title,
      objective: `Debate: ${input.title}. YES: ${input.yesPosition}. NO: ${input.noPosition}.`,
      template: "debate",
      sourceCommand: {
        id: createEventId(),
        utterance: `Start debate for prediction: ${input.title}`,
        ts: now,
        source: "api",
        workspaceId: "ark-playground",
      },
    });

    if (result) {
      await this.emitDebate("debate.round_started", result.missionId, now, traceId, {
        predictionId: input.predictionId,
        roundNumber: 1,
        roundType: "opening",
      });
    }

    return { missionId: result?.missionId ?? missionId };
  }

  async advanceRound(debateRoomId: string, roundNumber: number, roundType: string): Promise<void> {
    const missionId = createMissionId();
    const traceId = createTraceId();
    const now = new Date().toISOString();

    await this.emitDebate("debate.advance_round", missionId, now, traceId, {
      debateRoomId,
      roundNumber,
      roundType,
    });
  }

  async runAgentTurn(input: {
    agentRole: string;
    side: "yes" | "no" | "neutral";
    topic: string;
    context: string;
    debateRoomId: string;
    roundNumber: number;
  }): Promise<{ content: string; confidenceScore: number }> {
    const taskClass = (DEBATE_ROLE_TASK_MAP[input.agentRole] ?? "debate_opening") as import("@arkhe/contracts").ModelTaskClass;
    const prompt = `Topic: ${input.topic}\nSide: ${input.side}\nContext: ${input.context}\nGenerate a compelling ${input.agentRole} argument.`;

    const route = await this.deps.modelRouter.run({
      taskClass,
      input: prompt,
      agentRole: input.agentRole,
    });

    const content = route.output || `[${input.agentRole}] Argument pending model configuration.`;
    const confidenceScore = Math.round((route.confidence ?? 0.7) * 100);

    const missionId = createMissionId();
    const traceId = createTraceId();
    const now = new Date().toISOString();

    await this.emitDebate("debate.turn_submitted", missionId, now, traceId, {
      debateRoomId: input.debateRoomId,
      agentRole: input.agentRole,
      side: input.side,
      content,
      confidenceScore,
      roundNumber: input.roundNumber,
    });

    return { content, confidenceScore };
  }

  async requestResolution(predictionId: string, debateRoomId: string): Promise<void> {
    const missionId = createMissionId();
    const traceId = createTraceId();
    const now = new Date().toISOString();

    await this.emitDebate("debate.resolve_request", missionId, now, traceId, {
      predictionId,
      debateRoomId,
    });
  }

  private async emitDebate(
    eventType: DebateEvent["eventType"],
    missionId: MissionId,
    ts: string,
    traceId: string,
    payload: DebateEvent["payload"],
  ): Promise<void> {
    const event: DebateEvent = {
      schemaVersion: SCHEMA_VERSION,
      eventId: createEventId(),
      eventType,
      ts,
      traceId,
      spanId: createSpanId(),
      missionId,
      workspaceId: "ark-playground",
      payload,
    };
    await this.deps.publish(event);
  }
}
