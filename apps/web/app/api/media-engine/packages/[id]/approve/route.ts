import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/media-engine/db";

const ACTION_STATUS_MAP: Record<string, string> = {
  approve:        "approved",
  reject:         "rejected",
  revise:         "revision_requested",
  save_for_later: "ready_for_brian",
  mark_too_risky: "too_risky",
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getServiceClient();
    const { action, notes } = await req.json();

    if (!action || !ACTION_STATUS_MAP[action]) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // 1. Record the approval action
    const { error: approvalErr } = await db.from("me_approvals").insert({
      package_id:   params.id,
      action,
      notes:        notes ?? "",
      actioned_by:  "Brian",
    });
    if (approvalErr) throw approvalErr;

    // 2. Update package status
    const newStatus = ACTION_STATUS_MAP[action];
    const { error: pkgErr } = await db
      .from("me_video_packages")
      .update({ package_status: newStatus })
      .eq("id", params.id);
    if (pkgErr) throw pkgErr;

    // 3. Mirror status on the topic
    const { data: pkg, error: fetchErr } = await db
      .from("me_video_packages")
      .select("topic_id")
      .eq("id", params.id)
      .single();
    if (!fetchErr && pkg) {
      await db
        .from("me_topics")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", pkg.topic_id);
    }

    return NextResponse.json({ ok: true, newStatus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
