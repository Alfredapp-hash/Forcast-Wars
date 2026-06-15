import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/media-engine/db";

export async function GET(req: NextRequest) {
  try {
    const db = getServiceClient();
    const status = req.nextUrl.searchParams.get("status");

    // Join packages → topics → scripts → guardrail
    let query = db
      .from("me_video_packages")
      .select(`
        id, package_status, created_at,
        topic:me_topics(*),
        scripts:me_generated_scripts(*),
        guardrail:me_guardrail_reports(*)
      `)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("package_status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ packages: data ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getServiceClient();
    const body = await req.json();
    const { topic_id, scripts, guardrail } = body;

    if (!topic_id || !scripts || !guardrail) {
      return NextResponse.json({ error: "topic_id, scripts, guardrail required" }, { status: 400 });
    }

    // 1. Save generated scripts
    const { data: scriptRow, error: scriptErr } = await db
      .from("me_generated_scripts")
      .insert({
        topic_id,
        angles:             scripts.angles,
        chosen_angle_index: scripts.chosen_angle_index ?? 0,
        script_30s:         scripts.script_30s,
        script_60s:         scripts.script_60s,
        script_2min:        scripts.script_2min,
        shorts_title:       scripts.shorts_title,
        long_title:         scripts.long_title,
        caption:            scripts.caption,
        hashtags:           scripts.hashtags,
        blog_transcript:    scripts.blog_transcript,
        pinned_comment:     scripts.pinned_comment,
        thumbnail_concept:  scripts.thumbnail_concept,
        visual_sequence:    scripts.visual_sequence,
        voiceover_text:     scripts.voiceover_text,
      })
      .select()
      .single();

    if (scriptErr) throw scriptErr;

    // 2. Save guardrail report
    const { data: guardrailRow, error: guardErr } = await db
      .from("me_guardrail_reports")
      .insert({
        script_id:            scriptRow.id,
        approved_for_review:  guardrail.approved_for_review,
        risk_score:           guardrail.risk_score,
        risk_level:           guardrail.risk_level,
        issues:               guardrail.issues ?? [],
        required_fixes:       guardrail.required_fixes ?? [],
        safe_summary:         guardrail.safe_summary ?? "",
        recommended_revision: guardrail.recommended_revision ?? "",
      })
      .select()
      .single();

    if (guardErr) throw guardErr;

    // 3. Determine package status
    const packageStatus = guardrail.approved_for_review ? "ready_for_brian" : "guardrail_review";

    // 4. Create video package
    const { data: pkg, error: pkgErr } = await db
      .from("me_video_packages")
      .insert({
        topic_id,
        script_id:      scriptRow.id,
        guardrail_id:   guardrailRow.id,
        package_status: packageStatus,
      })
      .select()
      .single();

    if (pkgErr) throw pkgErr;

    // 5. Advance topic status
    await db
      .from("me_topics")
      .update({ status: packageStatus, updated_at: new Date().toISOString() })
      .eq("id", topic_id);

    return NextResponse.json({ packageId: pkg.id, packageStatus }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
