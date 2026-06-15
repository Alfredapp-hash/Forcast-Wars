import type { DebateSide } from "@/lib/types";
import {
  calculateUserReputation,
  calculateAgentReputation,
  type ReputationResult,
} from "./scoring";

export interface ResolvePredictionInput {
  predictionId: string;
  outcome: DebateSide | "void";
  affirmativeAgentId: string;
  negativeAgentId: string;
  deadlineAt: string;
}

export interface UserPositionRow {
  user_id: string;
  profile_id: string;
  side: DebateSide;
  confidence: number;
  locked_at: string | null;
}

export interface ResolutionSummary {
  predictionId: string;
  outcome: DebateSide | "void";
  userEvents: Array<{ profileId: string; result: ReputationResult }>;
  agentEvents: Array<{ agentId: string; result: ReputationResult }>;
}

export function buildUserReputationEvents(
  positions: UserPositionRow[],
  outcome: DebateSide,
  predictionId: string,
  deadlineAt: string,
): Array<{ profileId: string; result: ReputationResult }> {
  return positions.map((pos) => ({
    profileId: pos.profile_id,
    result: calculateUserReputation({
      userId: pos.profile_id,
      predictionId,
      side: pos.side,
      confidence: pos.confidence,
      outcome,
      lockedAt: pos.locked_at ?? undefined,
      deadlineAt,
    }),
  }));
}

export function buildAgentReputationEvents(
  outcome: DebateSide,
  affirmativeAgentId: string,
  negativeAgentId: string,
): Array<{ agentId: string; result: ReputationResult }> {
  const affWon = outcome === "yes";
  return [
    {
      agentId: affirmativeAgentId,
      result: calculateAgentReputation(affWon, affWon ? 0.5 : -0.3),
    },
    {
      agentId: negativeAgentId,
      result: calculateAgentReputation(!affWon, !affWon ? 0.5 : -0.3),
    },
  ];
}

export function buildResolutionSummary(input: {
  predictionId: string;
  outcome: DebateSide | "void";
  positions: UserPositionRow[];
  deadlineAt: string;
  affirmativeAgentId: string;
  negativeAgentId: string;
}): ResolutionSummary {
  if (input.outcome === "void") {
    return {
      predictionId: input.predictionId,
      outcome: "void",
      userEvents: [],
      agentEvents: [],
    };
  }

  return {
    predictionId: input.predictionId,
    outcome: input.outcome,
    userEvents: buildUserReputationEvents(
      input.positions,
      input.outcome,
      input.predictionId,
      input.deadlineAt,
    ),
    agentEvents: buildAgentReputationEvents(
      input.outcome,
      input.affirmativeAgentId,
      input.negativeAgentId,
    ),
  };
}
