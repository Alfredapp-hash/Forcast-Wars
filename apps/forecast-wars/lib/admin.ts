import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export function isAdminUser(user: User | null, profileIsAdmin?: boolean): boolean {
  if (!user) return false;
  if (profileIsAdmin) return true;

  const allowlist = process.env.FORECAST_WARS_ADMIN_EMAILS?.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist?.length && user.email) {
    return allowlist.includes(user.email.toLowerCase());
  }

  return false;
}

export async function requireAdmin(): Promise<
  { ok: true; user: User } | { ok: false; response: Response }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!isAdminUser(user, profile?.is_admin)) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  return { ok: true, user };
}
