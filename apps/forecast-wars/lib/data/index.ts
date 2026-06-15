import {
  AGENTS,
  DEBATE_ROOMS,
  DEBATE_MESSAGES,
  EVIDENCE_ITEMS,
  LEADERBOARD,
  getAgentBySlug,
  getDebateBySlug,
  getLiveDebates,
  getUserByUsername,
} from "@/lib/mock-data";
import type { Agent, DebateMessage, DebateRoom, EvidenceItem, LeaderboardEntry, UserProfile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function mapAgent(row: Record<string, unknown>): Agent {
  return {
    id: row.id as string,
    name: (row.name as string) ?? (row.role as string),
    slug: (row.slug as string) ?? slugify((row.name as string) ?? "agent"),
    avatarUrl: (row.avatar_url as string) ?? `https://api.dicebear.com/7.x/bottts/svg?seed=${row.id}`,
    role: row.role as string,
    specialty: (row.specialty as string) ?? "",
    personality: (row.personality as string) ?? "",
    accuracyScore: (row.accuracy_score as number) ?? 0,
    debateWins: (row.debate_wins as number) ?? 0,
    debateLosses: (row.debate_losses as number) ?? 0,
    followers: (row.followers as number) ?? 0,
    modelTier: (row.model_tier as string) ?? "standard",
    memoryCount: 0,
  };
}

async function getSupabase() {
  try {
    return await createClient();
  } catch {
    return null;
  }
}

export async function fetchAgents(): Promise<Agent[]> {
  const supabase = await getSupabase();
  if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http")) {
    return AGENTS;
  }
  const { data } = await supabase
    .from("agents")
    .select("*")
    .eq("cortex", "forecast")
    .not("slug", "is", null);
  if (!data?.length) return AGENTS;
  return data.map((row) => mapAgent(row as Record<string, unknown>));
}

export async function fetchAgentBySlug(slug: string): Promise<Agent | undefined> {
  const supabase = await getSupabase();
  if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http")) {
    return getAgentBySlug(slug);
  }
  const { data } = await supabase.from("agents").select("*").eq("slug", slug).maybeSingle();
  if (!data) return getAgentBySlug(slug);
  return mapAgent(data as Record<string, unknown>);
}

export async function fetchLiveDebates(): Promise<DebateRoom[]> {
  const supabase = await getSupabase();
  if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http")) {
    return getLiveDebates();
  }

  const { data: rooms } = await supabase
    .from("debate_rooms")
    .select("*, predictions(*)")
    .eq("status", "in_progress");

  if (!rooms?.length) return getLiveDebates();

  const agents = await fetchAgents();
  const agentMap = new Map(agents.map((a) => [a.id, a]));

  return rooms.map((room) => {
    const pred = room.predictions as Record<string, unknown>;
    const aff = agentMap.get(room.affirmative_agent_id) ?? AGENTS[0];
    const neg = agentMap.get(room.negative_agent_id) ?? AGENTS[1];
    return {
      id: room.id,
      slug: pred.slug as string,
      predictionId: room.prediction_id,
      prediction: {
        id: pred.id as string,
        slug: pred.slug as string,
        title: pred.title as string,
        description: pred.description as string,
        category: pred.category as string,
        resolutionCriteria: pred.resolution_criteria as string,
        deadlineAt: pred.deadline_at as string,
        status: pred.status as DebateRoom["prediction"]["status"],
        yesPosition: pred.yes_position as string,
        noPosition: pred.no_position as string,
      },
      affirmativeAgent: aff,
      negativeAgent: neg,
      currentRound: room.current_round,
      roundType: room.current_round > 1 ? "rebuttal" : "opening",
      roundLabel: `Round ${room.current_round}`,
      status: room.status as DebateRoom["status"],
      crowdYes: room.crowd_yes,
      crowdNo: room.crowd_no,
      spectators: room.spectators,
    };
  });
}

export async function fetchDebateBySlug(slug: string): Promise<DebateRoom | undefined> {
  const supabase = await getSupabase();
  if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http")) {
    return getDebateBySlug(slug);
  }

  const { data: pred } = await supabase.from("predictions").select("*").eq("slug", slug).maybeSingle();
  if (!pred) return getDebateBySlug(slug);

  const { data: room } = await supabase
    .from("debate_rooms")
    .select("*")
    .eq("prediction_id", pred.id)
    .maybeSingle();
  if (!room) return getDebateBySlug(slug);

  const agents = await fetchAgents();
  const agentMap = new Map(agents.map((a) => [a.id, a]));

  return {
    id: room.id,
    slug: pred.slug,
    predictionId: pred.id,
    prediction: {
      id: pred.id,
      slug: pred.slug,
      title: pred.title,
      description: pred.description,
      category: pred.category,
      resolutionCriteria: pred.resolution_criteria,
      deadlineAt: pred.deadline_at,
      status: pred.status,
      yesPosition: pred.yes_position,
      noPosition: pred.no_position,
    },
    affirmativeAgent: agentMap.get(room.affirmative_agent_id) ?? AGENTS[0],
    negativeAgent: agentMap.get(room.negative_agent_id) ?? AGENTS[1],
    currentRound: room.current_round,
    roundType: room.current_round > 1 ? "rebuttal" : "opening",
    roundLabel: `Round ${room.current_round}`,
    status: room.status,
    crowdYes: room.crowd_yes,
    crowdNo: room.crowd_no,
    spectators: room.spectators,
  };
}

export async function fetchDebateMessages(debateRoomId: string, slug: string): Promise<DebateMessage[]> {
  const supabase = await getSupabase();
  if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http")) {
    return DEBATE_MESSAGES[slug] ?? [];
  }

  const { data } = await supabase
    .from("debate_messages")
    .select("*, agents(name)")
    .eq("debate_room_id", debateRoomId)
    .order("created_at", { ascending: true });

  if (!data?.length) return DEBATE_MESSAGES[slug] ?? [];

  return data.map((row) => ({
    id: row.id,
    agentId: row.agent_id,
    agentName: (row.agents as { name?: string } | null)?.name ?? row.agent_id,
    side: row.side as "yes" | "no",
    messageType: row.message_type,
    content: row.content,
    confidenceScore: row.confidence_score ?? 0,
    evidenceScore: row.evidence_score ?? undefined,
    roundNumber: 1,
    createdAt: row.created_at,
  }));
}

export async function fetchEvidence(slug: string, debateRoomId?: string): Promise<EvidenceItem[]> {
  const supabase = await getSupabase();
  if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http")) {
    return EVIDENCE_ITEMS[slug] ?? [];
  }

  let query = supabase.from("evidence_items").select("*");
  if (debateRoomId) query = query.eq("debate_room_id", debateRoomId);
  const { data } = await query;
  if (!data?.length) return EVIDENCE_ITEMS[slug] ?? [];

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url ?? "",
    summary: row.summary ?? "",
    sourceQualityScore: row.source_quality_score ?? 0,
    verifiedStatus: row.verified_status as EvidenceItem["verifiedStatus"],
    side: (row.side as "yes" | "no") ?? "yes",
  }));
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = await getSupabase();
  if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http")) {
    return LEADERBOARD;
  }

  const agents = await fetchAgents();
  const agentEntries: LeaderboardEntry[] = agents
    .sort((a, b) => b.accuracyScore - a.accuracyScore)
    .slice(0, 5)
    .map((a, i) => ({
      rank: i + 1,
      id: a.id,
      name: a.name,
      slug: a.slug,
      avatarUrl: a.avatarUrl,
      score: Math.round(a.accuracyScore * 100),
      accuracy: a.accuracyScore,
      type: "agent" as const,
    }));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("reputation_score", { ascending: false })
    .limit(3);

  const userEntries: LeaderboardEntry[] = (profiles ?? []).map((p, i) => ({
    rank: agentEntries.length + i + 1,
    id: p.id,
    name: p.display_name,
    slug: p.username,
    avatarUrl: p.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`,
    score: p.reputation_score,
    accuracy: p.accuracy_score,
    type: "user" as const,
  }));

  return [...agentEntries, ...userEntries].map((e, i) => ({ ...e, rank: i + 1 }));
}

export async function fetchUserByUsername(username: string): Promise<UserProfile | undefined> {
  const supabase = await getSupabase();
  if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http")) {
    return getUserByUsername(username);
  }
  const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  if (!data) return getUserByUsername(username);
  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    avatarUrl: data.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
    bio: data.bio ?? "",
    reputationScore: data.reputation_score,
    accuracyScore: data.accuracy_score,
  };
}

export { slugify };
