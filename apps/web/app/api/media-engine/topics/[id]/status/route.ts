import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/media-engine/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getServiceClient();
    const { status } = await req.json();

    const { error } = await db
      .from("me_topics")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
