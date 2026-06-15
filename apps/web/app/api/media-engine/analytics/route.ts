import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/media-engine/db";

// GET  — fetch all analytics snapshots with joined post + topic data
// POST — create or upsert an analytics snapshot for a given manual_post_id
export async function GET() {
  try {
    const db = getServiceClient();
    const { data, error } = await db
      .from("me_analytics_snapshots")
      .select(`
        *,
        post:me_manual_posts(
          id, platform, post_url, channel, posted_at,
          package:me_video_packages(
            topic:me_topics(id, title, channel)
          )
        )
      `)
      .order("recorded_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ snapshots: data ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getServiceClient();
    const body = await req.json();
    const { manual_post_id, ...fields } = body;

    if (!manual_post_id) {
      return NextResponse.json({ error: "manual_post_id is required" }, { status: 400 });
    }

    const payload = {
      manual_post_id,
      channel:           fields.channel          ?? null,
      upload_date:       fields.upload_date       ?? null,
      post_url:          fields.post_url          ?? null,
      views_1h:          Number(fields.views_1h)          || 0,
      views_24h:         Number(fields.views_24h)         || 0,
      views_7d:          Number(fields.views_7d)          || 0,
      likes:             Number(fields.likes)             || 0,
      comments:          Number(fields.comments)          || 0,
      shares:            Number(fields.shares)            || 0,
      profile_clicks:    Number(fields.profile_clicks)    || 0,
      link_clicks:       Number(fields.link_clicks)       || 0,
      followers_gained:  Number(fields.followers_gained)  || 0,
      estimated_cost:    Number(fields.estimated_cost)    || 0,
      estimated_revenue: Number(fields.estimated_revenue) || 0,
      notes:             fields.notes ?? "",
    };

    // Check if a snapshot already exists for this post
    const { data: existing } = await db
      .from("me_analytics_snapshots")
      .select("id")
      .eq("manual_post_id", manual_post_id)
      .maybeSingle();

    let snapshotId: string;

    if (existing?.id) {
      // Update existing snapshot
      const { error } = await db
        .from("me_analytics_snapshots")
        .update({ ...payload, recorded_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
      snapshotId = existing.id;
    } else {
      // Insert new snapshot
      const { data: inserted, error } = await db
        .from("me_analytics_snapshots")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      snapshotId = inserted.id;
    }

    return NextResponse.json({ snapshotId }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
