import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { buildResolutionSummary } from "@/lib/reputation/resolve";
import type { DebateSide } from "@/lib/types";

export async function GET() {
  const supabase = getServiceClient();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ predictions: [] });
  }

  const { data: predictions } = await supabase
    .from("predictions")
    .select("*, debate_rooms(id, affirmative_agent_id, negative_agent_id)")
    .in("status", ["live", "locked", "disputed"])
    .order("deadline_at", { ascending: true });

  return NextResponse.json({
    predictions: (predictions ?? []).map((p: Record<string, unknown>) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      status: p.status,
      resolutionCriteria: p.resolution_criteria,
      deadlineAt: p.deadline_at,
      debateRoomId: (p.debate_rooms as { id?: string } | null)?.id,
      affirmativeAgentId: (p.debate_rooms as { affirmative_agent_id?: string } | null)?.affirmative_agent_id,
      negativeAgentId: (p.debate_rooms as { negative_agent_id?: string } | null)?.negative_agent_id,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = getServiceClient();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = await request.json();
  const { predictionId, outcome } = body as { predictionId: string; outcome: DebateSide | "void" };

  if (!predictionId || !outcome) {
    return NextResponse.json({ error: "predictionId and outcome required" }, { status: 400 });
  }

  const { data: prediction, error: predErr } = await supabase
    .from("predictions")
    .select("*")
    .eq("id", predictionId)
    .single();

  if (predErr || !prediction) {
    return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
  }

  const { data: room } = await supabase
    .from("debate_rooms")
    .select("*")
    .eq("prediction_id", predictionId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (outcome === "void") {
    await supabase
      .from("predictions")
      .update({ status: "void", resolved_at: now })
      .eq("id", predictionId);
    if (room) {
      await supabase.from("debate_rooms").update({ status: "concluded" }).eq("id", room.id);
    }
    return NextResponse.json({ status: "void", predictionId });
  }

  const { data: positions } = await supabase
    .from("user_positions")
    .select("*, profiles(id)")
    .eq("prediction_id", predictionId);

  const positionRows = (positions ?? []).map((p: Record<string, unknown>) => ({
    user_id: p.user_id as string,
    profile_id: p.user_id as string,
    side: p.side as DebateSide,
    confidence: p.confidence as number,
    locked_at: p.locked_at as string,
  }));

  const summary = buildResolutionSummary({
    predictionId,
    outcome,
    positions: positionRows,
    deadlineAt: prediction.deadline_at,
    affirmativeAgentId: room?.affirmative_agent_id ?? "agt_athena",
    negativeAgentId: room?.negative_agent_id ?? "agt_prometheus",
  });

  await supabase
    .from("predictions")
    .update({
      status: "resolved",
      outcome,
      resolved_at: now,
    })
    .eq("id", predictionId);

  if (room) {
    await supabase.from("debate_rooms").update({ status: "concluded" }).eq("id", room.id);
  }

  for (const { profileId, result } of summary.userEvents) {
    await supabase.from("reputation_events").insert({
      user_id: profileId,
      prediction_id: predictionId,
      event_type: result.eventType,
      points: result.points,
      reason: result.reason,
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("reputation_score, accuracy_score")
      .eq("id", profileId)
      .maybeSingle();

    if (profile) {
      const newRep = profile.reputation_score + result.points;
      const isCorrect = result.eventType === "prediction_correct";
      const newAccuracy = isCorrect
        ? Math.min(100, profile.accuracy_score + 1.5)
        : Math.max(0, profile.accuracy_score - 2);

      await supabase
        .from("profiles")
        .update({
          reputation_score: newRep,
          accuracy_score: newAccuracy,
          updated_at: now,
        })
        .eq("id", profileId);
    }
  }

  for (const { agentId, result } of summary.agentEvents) {
    await supabase.from("reputation_events").insert({
      agent_id: agentId,
      prediction_id: predictionId,
      event_type: result.eventType,
      points: result.points,
      reason: result.reason,
    });

    const { data: agent } = await supabase
      .from("agents")
      .select("debate_wins, debate_losses, accuracy_score")
      .eq("id", agentId)
      .maybeSingle();

    if (agent) {
      const won = result.eventType === "debate_won";
      await supabase
        .from("agents")
        .update({
          debate_wins: (agent.debate_wins ?? 0) + (won ? 1 : 0),
          debate_losses: (agent.debate_losses ?? 0) + (won ? 0 : 1),
          accuracy_score: Math.min(100, (agent.accuracy_score ?? 0) + (won ? 0.3 : -0.2)),
          updated_at: now,
        })
        .eq("id", agentId);
    }
  }

  await supabase.from("audit_logs").insert({
    actor_type: "system",
    actor_id: "resolution_api",
    action: "prediction.resolved",
    target_type: "prediction",
    target_id: predictionId,
    metadata: { outcome, userEvents: summary.userEvents.length, agentEvents: summary.agentEvents.length },
  });

  return NextResponse.json({ status: "resolved", outcome, summary });
}
