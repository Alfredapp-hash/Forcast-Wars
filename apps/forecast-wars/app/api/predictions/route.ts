import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/data";

const HERMES_URL = process.env.HERMES_URL ?? "http://localhost:4000";
const DEBATE_WEBHOOK_URL = process.env.ARKHE_DEBATE_WEBHOOK_URL ?? "http://127.0.0.1:9471";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      yesPosition,
      noPosition,
      resolutionCriteria,
      deadlineAt,
    } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "title and description required" }, { status: 400 });
    }

    const slug = slugify(title);
    const deadline = deadlineAt ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    let predictionId = `pred_${Date.now()}`;
    let debateRoomId: string | undefined;

    const supabase = getServiceClient();
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { data: prediction, error } = await supabase
        .from("predictions")
        .insert({
          slug,
          title,
          description,
          category: category ?? "Technology",
          yes_position: yesPosition ?? "YES",
          no_position: noPosition ?? "NO",
          resolution_criteria: resolutionCriteria ?? "Resolved by admin review.",
          deadline_at: deadline,
          status: "live",
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      predictionId = prediction.id;

      const { data: room } = await supabase
        .from("debate_rooms")
        .insert({
          prediction_id: predictionId,
          affirmative_agent_id: "agt_athena",
          negative_agent_id: "agt_prometheus",
          judge_agent_id: "agt_judge",
          fact_check_agent_id: "agt_factcheck",
          narrator_agent_id: "agt_narrator",
          current_round: 1,
          status: "in_progress",
        })
        .select()
        .single();

      debateRoomId = room?.id;
    }

    const envelope = {
      source: "webhook",
      role: "system",
      payload: {
        eventType: "prediction.created",
        predictionId,
        predictionSlug: slug,
        title,
        description,
        debateRoomId,
      },
      routingHint: "debate",
    };

    void fetch(`${HERMES_URL}/gateway/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    }).catch(() => {});

    if (debateRoomId) {
      void fetch(DEBATE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run_debate",
          predictionId,
          predictionSlug: slug,
          title,
          yesPosition,
          noPosition,
          debateRoomId,
          affirmativeAgentId: "agt_athena",
          negativeAgentId: "agt_prometheus",
        }),
      }).catch(() => {});
    }

    return NextResponse.json({
      predictionId,
      slug,
      debateRoomId,
      status: "live",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
