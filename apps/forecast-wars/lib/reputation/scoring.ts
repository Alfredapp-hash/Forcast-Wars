import type { DebateSide } from "@/lib/types";

export interface ReputationInput {
  userId?: string;
  agentId?: string;
  predictionId: string;
  side: DebateSide;
  confidence: number;
  outcome: DebateSide;
  lockedAt?: string;
  deadlineAt: string;
}

export interface ReputationResult {
  points: number;
  reason: string;
  eventType: string;
}

export function calculateUserReputation(input: ReputationInput): ReputationResult {
  const correct = input.side === input.outcome;
  let points = correct ? 100 : -25;
  let reason = correct ? "Correct prediction" : "Incorrect prediction";

  if (correct) {
    const calibrationBonus = Math.round((100 - Math.abs(input.confidence - 100)) * 0.2);
    points += calibrationBonus;
    reason += ` + calibration bonus (+${calibrationBonus})`;

    if (input.lockedAt) {
      const lockedMs = new Date(input.lockedAt).getTime();
      const deadlineMs = new Date(input.deadlineAt).getTime();
      const totalWindow = deadlineMs - lockedMs;
      if (totalWindow > 0) {
        const earlyRatio = 1 - (deadlineMs - lockedMs) / totalWindow;
        if (earlyRatio > 0.5) {
          const earlyBonus = Math.round(earlyRatio * 50);
          points += earlyBonus;
          reason += ` + early call bonus (+${earlyBonus})`;
        }
      }
    }
  }

  return {
    points,
    reason,
    eventType: correct ? "prediction_correct" : "prediction_incorrect",
  };
}

export function calculateAgentReputation(
  debateWon: boolean,
  accuracyDelta: number,
): ReputationResult {
  const points = debateWon ? 150 : -30;
  return {
    points,
    reason: debateWon
      ? `Debate won (accuracy +${accuracyDelta.toFixed(1)}%)`
      : "Debate lost",
    eventType: debateWon ? "debate_won" : "debate_lost",
  };
}

export function applyReputationEvents(
  events: ReputationResult[],
): { totalPoints: number; accuracy: number } {
  const totalPoints = events.reduce((sum, e) => sum + e.points, 0);
  const correct = events.filter((e) => e.eventType.includes("correct") || e.eventType === "debate_won").length;
  const total = events.length || 1;
  return {
    totalPoints,
    accuracy: (correct / total) * 100,
  };
}
