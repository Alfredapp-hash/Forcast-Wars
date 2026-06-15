import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/media-engine/db";

// GET  — list manual posts with joined package + topic + analytics
// POST — record that Brian manually posted content
export async function GET() {
  try {
    const db = getServiceClient();
    const { data, error } = await db
      .from("me_manual_posts")
      .select(`
        id, platform, post_url, channel, notes, posted_at,
        package:me_video_packages(
          id, package_status,
          topic:me_topics(id, title, channel, status),
          scripts:me_generated_scripts(long_title, shorts_title)
        ),
        analytics:me_analytics_snapshots(*)
      `)
      .order("posted_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ posts: data ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getServiceClient();
    const body = await req.json();
    const { package_id, platform, post_url, channel, notes } = body;

    if (!package_id || !platform) {
      return NextResponse.json({ error: "package_id and platform are required" }, { status: 400 });
    }

    // 1. Record the manual post
    const { data: post, error: postErr } = await db
      .from("me_manual_posts")
      .insert({ package_id, platform, post_url: post_url ?? "", channel: channel ?? null, notes: notes ?? "" })
      .select()
      .single();

    if (postErr) throw postErr;

    // 2. Advance package status to exported → posted_manually
    await db
      .from("me_video_packages")
      .update({ package_status: "posted_manually" })
      .eq("id", package_id);

    // 3. Mirror on topic (look up topic_id from package)
    const { data: pkg } = await db
      .from("me_video_packages")
      .select("topic_id")
      .eq("id", package_id)
      .single();

    if (pkg?.topic_id) {
      await db
        .from("me_topics")
        .update({ status: "posted_manually", updated_at: new Date().toISOString() })
        .eq("id", pkg.topic_id);
    }

    return NextResponse.json({ postId: post.id }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
