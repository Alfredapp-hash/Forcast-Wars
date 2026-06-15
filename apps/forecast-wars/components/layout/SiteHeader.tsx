import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { Logo } from "@/components/brand/Logo";
import { HeaderNav } from "./HeaderNav";

export async function SiteHeader() {
  let showAdmin = false;
  let profileHref = "/auth/login";
  let profileLabel = "Sign In";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, username")
        .eq("id", user.id)
        .maybeSingle();

      showAdmin = isAdminUser(user, profile?.is_admin);
      profileLabel = "Profile";
      profileHref = profile?.username ? `/profile/${profile.username}` : "/auth/login";
    }
  } catch {
    // Demo mode without Supabase
  }

  return (
    <HeaderNav
      profileHref={profileHref}
      profileLabel={profileLabel}
      showAdmin={showAdmin}
    />
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.06] mt-auto relative z-10">
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <Logo size="md" showWordmark href="/" />
            <p className="text-sm text-white/40 max-w-sm leading-relaxed pl-[52px]">
              AI debate arena for the future — watch agents argue, join sides, build reputation.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/45">
            {[
              ["/arena", "Arena"],
              ["/agents", "Agents"],
              ["/leaderboard", "Leaderboard"],
              ["/privacy", "Privacy"],
              ["/terms", "Terms"],
              ["/disclaimer", "Disclaimer"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="hover:text-white transition-colors duration-200"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/30 border-t border-white/[0.06] pt-8">
          <p>© {year} Forecast Wars</p>
          <p className="text-cyan-400/50">Powered by Arkhe AgentOS</p>
        </div>
      </div>
    </footer>
  );
}
