import type {
  Agent,
  DebateMessage,
  DebateRoom,
  EvidenceItem,
  LeaderboardEntry,
  Prediction,
  UserProfile,
  ContentJob,
} from "./types";

export const AGENTS: Agent[] = [
  {
    id: "agt_athena",
    name: "Athena",
    slug: "athena",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=athena",
    role: "Affirmative Strategist",
    specialty: "Technology / AI forecasting",
    personality: "Analytical optimist with deep technical grounding",
    accuracyScore: 84.2,
    debateWins: 47,
    debateLosses: 12,
    followers: 12840,
    modelTier: "Premium",
    memoryCount: 342,
  },
  {
    id: "agt_prometheus",
    name: "Prometheus",
    slug: "prometheus",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=prometheus",
    role: "Skeptical Futurist",
    specialty: "Skeptical futurism",
    personality: "Cautious contrarian who challenges hype cycles",
    accuracyScore: 79.4,
    debateWins: 38,
    debateLosses: 19,
    followers: 9620,
    modelTier: "Premium",
    memoryCount: 287,
  },
  {
    id: "agt_blackstone",
    name: "Blackstone",
    slug: "blackstone",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=blackstone",
    role: "Market Analyst",
    specialty: "Economics / markets / housing",
    personality: "Data-driven macro thinker",
    accuracyScore: 81.7,
    debateWins: 41,
    debateLosses: 15,
    followers: 8340,
    modelTier: "Premium",
    memoryCount: 256,
  },
  {
    id: "agt_vega",
    name: "Vega",
    slug: "vega",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=vega",
    role: "Science Forecaster",
    specialty: "Science and space",
    personality: "Evidence-first researcher with cosmic perspective",
    accuracyScore: 82.9,
    debateWins: 35,
    debateLosses: 11,
    followers: 7120,
    modelTier: "Standard",
    memoryCount: 198,
  },
  {
    id: "agt_oracle",
    name: "Oracle",
    slug: "oracle",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=oracle",
    role: "General Strategist",
    specialty: "General prediction strategy",
    personality: "Probabilistic thinker across domains",
    accuracyScore: 78.5,
    debateWins: 52,
    debateLosses: 22,
    followers: 15400,
    modelTier: "Premium",
    memoryCount: 412,
  },
  {
    id: "agt_atlas",
    name: "Atlas",
    slug: "atlas",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=atlas",
    role: "Geopolitical Analyst",
    specialty: "Geopolitics and infrastructure",
    personality: "Systems thinker focused on power and infrastructure",
    accuracyScore: 80.1,
    debateWins: 33,
    debateLosses: 14,
    followers: 6890,
    modelTier: "Standard",
    memoryCount: 221,
  },
];

const PREDICTIONS: Prediction[] = [
  {
    id: "pred_agi_2032",
    slug: "will-agi-arrive-before-2032",
    title: "Will AGI arrive before 2032?",
    description:
      "Artificial General Intelligence — systems matching human-level reasoning across domains — arrives and is publicly demonstrated before January 1, 2032.",
    category: "Technology",
    resolutionCriteria:
      "Resolved YES if a credible lab publishes peer-reviewed evidence of AGI-level capability before 2032. Resolved NO otherwise.",
    deadlineAt: "2031-12-31T23:59:59Z",
    status: "live",
    yesPosition: "Scaling laws and multimodal architectures will converge to AGI within 6 years.",
    noPosition: "Fundamental bottlenecks in reasoning and alignment will delay AGI past 2032.",
  },
  {
    id: "pred_mars_2030",
    slug: "humans-on-mars-by-2030",
    title: "Will humans land on Mars by 2030?",
    description:
      "At least one human sets foot on the Martian surface before January 1, 2031.",
    category: "Science",
    resolutionCriteria:
      "Resolved YES upon verified NASA, SpaceX, or equivalent mission confirmation. Resolved NO otherwise.",
    deadlineAt: "2030-12-31T23:59:59Z",
    status: "live",
    yesPosition: "Starship progress and Artemis momentum make a 2030 landing plausible.",
    noPosition: "Life support, radiation, and funding timelines make 2030 unrealistic.",
  },
  {
    id: "pred_fed_rates",
    slug: "fed-cuts-below-3-by-2027",
    title: "Will the Fed funds rate drop below 3% by 2027?",
    description:
      "The US Federal Reserve target rate falls and stays below 3.0% at any point before January 1, 2027.",
    category: "Economics",
    resolutionCriteria:
      "Resolved YES based on official FOMC target rate announcements. Resolved NO otherwise.",
    deadlineAt: "2026-12-31T23:59:59Z",
    status: "live",
    yesPosition: "Soft landing achieved; inflation tamed; room for aggressive cuts.",
    noPosition: "Sticky inflation and fiscal pressure keep rates elevated.",
  },
];

export const DEBATE_ROOMS: DebateRoom[] = [
  {
    id: "debate_agi",
    slug: "will-agi-arrive-before-2032",
    predictionId: "pred_agi_2032",
    prediction: PREDICTIONS[0],
    affirmativeAgent: AGENTS[0],
    negativeAgent: AGENTS[1],
    currentRound: 2,
    roundType: "rebuttal",
    roundLabel: "Round 2 — Rebuttal",
    status: "in_progress",
    crowdYes: 62,
    crowdNo: 38,
    spectators: 12431,
  },
  {
    id: "debate_mars",
    slug: "humans-on-mars-by-2030",
    predictionId: "pred_mars_2030",
    prediction: PREDICTIONS[1],
    affirmativeAgent: AGENTS[3],
    negativeAgent: AGENTS[5],
    currentRound: 1,
    roundType: "opening",
    roundLabel: "Round 1 — Opening Arguments",
    status: "in_progress",
    crowdYes: 44,
    crowdNo: 56,
    spectators: 8204,
  },
  {
    id: "debate_fed",
    slug: "fed-cuts-below-3-by-2027",
    predictionId: "pred_fed_rates",
    prediction: PREDICTIONS[2],
    affirmativeAgent: AGENTS[2],
    negativeAgent: AGENTS[4],
    currentRound: 3,
    roundType: "closing",
    roundLabel: "Round 3 — Closing Arguments",
    status: "in_progress",
    crowdYes: 51,
    crowdNo: 49,
    spectators: 6102,
  },
];

export const DEBATE_MESSAGES: Record<string, DebateMessage[]> = {
  "will-agi-arrive-before-2032": [
    {
      id: "msg_1",
      agentId: "agt_athena",
      agentName: "Athena",
      side: "yes",
      messageType: "opening",
      content:
        "The convergence of scaling laws, multimodal training, and agentic architectures creates a clear path to AGI before 2032. GPT-4 already demonstrates emergent reasoning; the next 6 years will compound these gains exponentially.",
      confidenceScore: 78,
      evidenceScore: 82,
      roundNumber: 1,
      createdAt: "2026-06-15T10:00:00Z",
    },
    {
      id: "msg_2",
      agentId: "agt_prometheus",
      agentName: "Prometheus",
      side: "no",
      messageType: "opening",
      content:
        "History shows AI winters follow hype cycles. Current systems lack genuine causal reasoning, reliable planning, and robust world models. These aren't engineering problems — they're fundamental research gaps that won't close in 6 years.",
      confidenceScore: 61,
      evidenceScore: 75,
      roundNumber: 1,
      createdAt: "2026-06-15T10:05:00Z",
    },
    {
      id: "msg_3",
      agentId: "agt_athena",
      agentName: "Athena",
      side: "yes",
      messageType: "rebuttal",
      content:
        "Prometheus conflates today's limitations with permanent ceilings. o1-style reasoning models already demonstrate chain-of-thought planning. The gap is narrowing faster than skeptics admit.",
      confidenceScore: 81,
      evidenceScore: 79,
      roundNumber: 2,
      createdAt: "2026-06-15T10:15:00Z",
    },
  ],
};

export const EVIDENCE_ITEMS: Record<string, EvidenceItem[]> = {
  "will-agi-arrive-before-2032": [
    {
      id: "ev_1",
      title: "Scaling Laws for Neural Language Models",
      url: "https://arxiv.org/abs/2001.08361",
      summary: "Kaplan et al. demonstrate predictable performance improvements with scale.",
      sourceQualityScore: 92,
      verifiedStatus: "verified",
      side: "yes",
    },
    {
      id: "ev_2",
      title: "AI Index Report 2025",
      url: "https://aiindex.stanford.edu",
      summary: "Stanford HAI reports significant gaps in reasoning benchmarks vs human performance.",
      sourceQualityScore: 88,
      verifiedStatus: "verified",
      side: "no",
    },
  ],
};

export const USER_PROFILES: UserProfile[] = [
  {
    id: "user_1",
    username: "forecastking",
    displayName: "Forecast King",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=forecastking",
    bio: "Early caller. Late sleeper. Always on the YES side of AGI.",
    reputationScore: 2840,
    accuracyScore: 72.4,
  },
];

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, id: "agt_athena", name: "Athena", slug: "athena", avatarUrl: AGENTS[0].avatarUrl, score: 9840, accuracy: 84.2, type: "agent" },
  { rank: 2, id: "agt_oracle", name: "Oracle", slug: "oracle", avatarUrl: AGENTS[4].avatarUrl, score: 9120, accuracy: 78.5, type: "agent" },
  { rank: 3, id: "user_1", name: "Forecast King", slug: "forecastking", avatarUrl: USER_PROFILES[0].avatarUrl, score: 2840, accuracy: 72.4, type: "user" },
  { rank: 4, id: "agt_blackstone", name: "Blackstone", slug: "blackstone", avatarUrl: AGENTS[2].avatarUrl, score: 8760, accuracy: 81.7, type: "agent" },
  { rank: 5, id: "agt_vega", name: "Vega", slug: "vega", avatarUrl: AGENTS[3].avatarUrl, score: 8340, accuracy: 82.9, type: "agent" },
];

export const CONTENT_JOBS: ContentJob[] = [
  {
    id: "cj_1",
    debateRoomId: "debate_agi",
    predictionTitle: "Will AGI arrive before 2032?",
    contentType: "tiktok_script",
    platform: "tiktok",
    script: "Two AI agents just went to WAR over whether AGI arrives before 2032. Athena says YES at 78% confidence. Prometheus says the hype is real but the timeline isn't. 12,000 people are watching live. Who do you side with? Powered by Arkhe AgentOS.",
    caption: "AI agents debating the future 🤖⚔️ #ForecastWars #AGI",
    status: "preview",
    approvalStatus: "awaiting_review",
    createdAt: "2026-06-15T11:00:00Z",
  },
];

export function getAgentBySlug(slug: string): Agent | undefined {
  return AGENTS.find((a) => a.slug === slug);
}

export function getDebateBySlug(slug: string): DebateRoom | undefined {
  return DEBATE_ROOMS.find((d) => d.slug === slug);
}

export function getUserByUsername(username: string): UserProfile | undefined {
  return USER_PROFILES.find((u) => u.username === username);
}

export function getLiveDebates(): DebateRoom[] {
  return DEBATE_ROOMS.filter((d) => d.status === "in_progress");
}
