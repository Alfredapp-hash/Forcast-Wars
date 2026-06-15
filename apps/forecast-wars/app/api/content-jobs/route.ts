import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { CONTENT_JOBS } from "@/lib/mock-data";

export async function GET() {
  const supabase = getServiceClient();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { data } = await supabase
      .from("content_jobs")
      .select("*, predictions(title)")
      .in("status", ["preview", "draft"])
      .order("created_at", { ascending: false });

    if (data?.length) {
      return NextResponse.json({
        jobs: data.map((j: Record<string, unknown>) => ({
          id: j.id as string,
          predictionTitle: (j.predictions as { title?: string } | null)?.title ?? "Debate",
          contentType: j.content_type as string,
          platform: j.platform as string,
          script: j.script as string,
          caption: j.caption as string,
          status: j.status as string,
          approvalStatus: j.approval_status as string,
          createdAt: j.created_at as string,
        })),
      });
    }
  }

  return NextResponse.json({ jobs: CONTENT_JOBS });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { id, status, approvalStatus } = body;

  const supabase = getServiceClient();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data, error } = await supabase
      .from("content_jobs")
      .update({
        status: status ?? "approved",
        approval_status: approvalStatus ?? status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  return NextResponse.json({
    id,
    status: status ?? "approved",
    approvalStatus: approvalStatus ?? status,
    updatedAt: new Date().toISOString(),
  });
}
