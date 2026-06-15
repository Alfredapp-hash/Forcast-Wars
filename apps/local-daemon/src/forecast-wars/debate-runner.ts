import type { SupabaseClient } from "@supabase/supabase-js";
import type { DebateOrchestrator } from "./debate-orchestrator.js";
import { buildDebatePrompt } from "./debate-prompts.js";
import type { ArkheEvent } from "@arkhe/contracts";

export interface DebateRunnerInput {
  debateRoomId: string;
  predictionId: string;
  title: string;
  yesPosition: string;
  noPosition: string;
  affirmativeAgentId: string;
  negativeAgentId: string;
  affirmativeName?: string;
  negativeName?: string;
}

export interface DebateRunnerDeps {
  orchestrator: DebateOrchestrator;
  getClient: () => SupabaseClient | null;
  publish?: (event: ArkheEvent) => Promise<void>;
}

export class DebateRunner {
  constructor(private readonly deps: DebateRunnerDeps) {}

  async runOpeningRound(input: DebateRunnerInput): Promise<void> {
    const client = this.deps.getClient();
    const context = `YES: ${input.yesPosition}\nNO: ${input.noPosition}`;

    const yesTurn = await this.deps.orchestrator.runAgentTurn({
      agentRole: "Affirmative Agent",
      side: "yes",
      topic: input.title,
      context: buildDebatePrompt(
        input.affirmativeName ?? "Athena",
        "Affirmative Agent",
        "yes",
        input.title,
        "opening",
        context,
      ),
      debateRoomId: input.debateRoomId,
      roundNumber: 1,
    });

    const noTurn = await this.deps.orchestrator.runAgentTurn({
      agentRole: "Negative Agent",
      side: "no",
      topic: input.title,
      context: buildDebatePrompt(
        input.negativeName ?? "Prometheus",
        "Negative Agent",
        "no",
        input.title,
        "opening",
        context,
      ),
      debateRoomId: input.debateRoomId,
      roundNumber: 1,
    });

    if (client) {
      await client.from("debate_messages").insert([
        {
          debate_room_id: input.debateRoomId,
          agent_id: input.affirmativeAgentId,
          side: "yes",
          message_type: "opening",
          content: yesTurn.content,
          confidence_score: yesTurn.confidenceScore,
        },
        {
          debate_room_id: input.debateRoomId,
          agent_id: input.negativeAgentId,
          side: "no",
          message_type: "opening",
          content: noTurn.content,
          confidence_score: noTurn.confidenceScore,
        },
      ]);
    }

    const factCheck = await this.deps.orchestrator.runAgentTurn({
      agentRole: "Fact-Check Agent",
      side: "neutral",
      topic: input.title,
      context: `Review these opening arguments:\nYES: ${yesTurn.content}\nNO: ${noTurn.content}`,
      debateRoomId: input.debateRoomId,
      roundNumber: 1,
    });

    const judge = await this.deps.orchestrator.runAgentTurn({
      agentRole: "Judge Agent",
      side: "neutral",
      topic: input.title,
      context: `Fact-check: ${factCheck.content}`,
      debateRoomId: input.debateRoomId,
      roundNumber: 1,
    });

    if (client) {
      await client.from("debate_messages").insert([
        {
          debate_room_id: input.debateRoomId,
          agent_id: "agt_factcheck",
          side: "neutral",
          message_type: "fact_check",
          content: factCheck.content,
          evidence_score: 75,
        },
        {
          debate_room_id: input.debateRoomId,
          agent_id: "agt_judge",
          side: "neutral",
          message_type: "judge",
          content: judge.content,
          confidence_score: judge.confidenceScore,
        },
      ]);

      await client
        .from("debate_rooms")
        .update({ current_round: 2, status: "in_progress" })
        .eq("id", input.debateRoomId);
    }
  }

  async runRebuttalRound(input: DebateRunnerInput, priorContext: string): Promise<void> {
    const client = this.deps.getClient();

    const yesRebuttal = await this.deps.orchestrator.runAgentTurn({
      agentRole: "Affirmative Agent",
      side: "yes",
      topic: input.title,
      context: priorContext,
      debateRoomId: input.debateRoomId,
      roundNumber: 2,
    });

    const noRebuttal = await this.deps.orchestrator.runAgentTurn({
      agentRole: "Negative Agent",
      side: "no",
      topic: input.title,
      context: priorContext,
      debateRoomId: input.debateRoomId,
      roundNumber: 2,
    });

    if (client) {
      await client.from("debate_messages").insert([
        {
          debate_room_id: input.debateRoomId,
          agent_id: input.affirmativeAgentId,
          side: "yes",
          message_type: "rebuttal",
          content: yesRebuttal.content,
          confidence_score: yesRebuttal.confidenceScore,
        },
        {
          debate_room_id: input.debateRoomId,
          agent_id: input.negativeAgentId,
          side: "no",
          message_type: "rebuttal",
          content: noRebuttal.content,
          confidence_score: noRebuttal.confidenceScore,
        },
      ]);

      await client
        .from("debate_rooms")
        .update({ current_round: 3 })
        .eq("id", input.debateRoomId);
    }
  }

  async queueNarratorContent(input: DebateRunnerInput, summary: string): Promise<void> {
    const client = this.deps.getClient();

    const narrator = await this.deps.orchestrator.runAgentTurn({
      agentRole: "Narrator Agent",
      side: "neutral",
      topic: input.title,
      context: summary,
      debateRoomId: input.debateRoomId,
      roundNumber: 3,
    });

    if (!client) return;

    await client.from("content_jobs").insert({
      debate_room_id: input.debateRoomId,
      prediction_id: input.predictionId,
      agent_id: "agt_narrator",
      content_type: "debate_summary",
      platform: "tiktok",
      script: narrator.content,
      caption: `AI agents debated: ${input.title} — Powered by Arkhe AgentOS`,
      status: "preview",
      approval_status: "awaiting_review",
    });

    if (this.deps.publish) {
      const { createEventId, SCHEMA_VERSION } = await import("@arkhe/contracts");
      await this.deps.publish({
        id: createEventId(),
        ts: new Date().toISOString(),
        schemaVersion: SCHEMA_VERSION,
        eventType: "approval.requested",
        payload: {
          approvalId: `apr_content_${input.debateRoomId}_${Date.now()}`,
          status: "pending",
          riskClass: "yellow",
          action: "content_approval",
          summary: `Content awaiting review: ${input.title}`,
          requestedByAgentId: "agt_narrator",
        },
      } as ArkheEvent);
    }
  }

  async runFullFlow(input: DebateRunnerInput): Promise<void> {
    await this.runOpeningRound(input);
    const prior = `Opening round complete for: ${input.title}`;
    await this.runRebuttalRound(input, prior);
    await this.queueNarratorContent(input, prior);

    if (this.deps.publish) {
      const { createEventId, SCHEMA_VERSION } = await import("@arkhe/contracts");
      await this.deps.publish({
        id: createEventId(),
        ts: new Date().toISOString(),
        schemaVersion: SCHEMA_VERSION,
        eventType: "debate.round_completed",
        payload: {
          debateRoomId: input.debateRoomId,
          predictionId: input.predictionId,
          title: input.title,
          summary: `Debate completed: ${input.title}. Content queued for review.`,
          roundNumber: 3,
          roundType: "closing",
        },
      } as ArkheEvent);
    }
  }
}
