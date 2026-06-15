import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/media-engine/db";

export async function GET(req: NextRequest) {
  try {
    const db = getServiceClient();
    const status = req.nextUrl.searchParams.get("status");

    let query = db
      .from("me_topics")
      .select("*")
      .order("updated_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ topics: data ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getServiceClient();
    const body = await req.json();

    const { data, error } = await db
      .from("me_topics")
      .insert({
        title:             body.title,
        summary:           body.summary ?? "",
        source_notes:      body.source_notes ?? "",
        attention_score:   body.attention_score ?? 5,
        urgency_score:     body.urgency_score ?? 5,
        legal_issue:       body.legal_issue ?? null,
        channel:           body.channel ?? "ark_legal_signal",
        recommended_angle: body.recommended_angle ?? "",
        risk_level:        body.risk_level ?? "low",
        status:            "discovered",
        ark_reasoning:     body.ark_reasoning ?? "",
      })
      .select()
      .single();

    if (error) throw error;

    // Insert source URLs as separate rows
    if (Array.isArray(body.source_urls) && body.source_urls.length > 0) {
      await db.from("me_source_links").insert(
        body.source_urls.map((url: string) => ({
          topic_id: data.id,
          url,
        }))
      );
    }

    return NextResponse.json({ topic: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
