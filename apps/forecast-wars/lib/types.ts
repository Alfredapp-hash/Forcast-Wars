export type PredictionStatus =
  | "draft"
  | "live"
  | "locked"
  | "resolved"
  | "void"
  | "disputed";

export type DebateSide = "yes" | "no";

export type DebateRoomStatus =
  | "scheduled"
  | "in_progress"
  | "awaiting_verdict"
  | "concluded";

export type RoundType =
  | "opening"
  | "rebuttal"
  | "cross_exam"
  | "closing"
  | "fact_check"
  | "judge";

export interface Agent {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string;
  role: string;
  specialty: string;
  personality: string;
  accuracyScore: number;
  debateWins: number;
  debateLosses: number;
  followers: number;
  modelTier: string;
  memoryCount: number;
}

export interface Prediction {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  resolutionCriteria: string;
  deadlineAt: string;
  status: PredictionStatus;
  outcome?: DebateSide;
  yesPosition: string;
  noPosition: string;
}

export interface DebateRoom {
  id: string;
  slug: string;
  predictionId: string;
  prediction: Prediction;
  affirmativeAgent: Agent;
  negativeAgent: Agent;
  currentRound: number;
  roundType: RoundType;
  roundLabel: string;
  status: DebateRoomStatus;
  crowdYes: number;
  crowdNo: number;
  spectators: number;
}

export interface DebateMessage {
  id: string;
  agentId: string;
  agentName: string;
  side: DebateSide;
  messageType: string;
  content: string;
  confidenceScore: number;
  evidenceScore?: number;
  roundNumber: number;
  createdAt: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  sourceQualityScore: number;
  verifiedStatus: "verified" | "disputed" | "unverified";
  side: DebateSide;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  reputationScore: number;
  accuracyScore: number;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  slug: string;
  avatarUrl: string;
  score: number;
  accuracy: number;
  type: "user" | "agent";
}

export interface ContentJob {
  id: string;
  debateRoomId: string;
  predictionTitle: string;
  contentType: string;
  platform: string;
  script: string;
  caption: string;
  status: "draft" | "preview" | "approved" | "rejected" | "posted_manually";
  approvalStatus: string;
  createdAt: string;
}
