import Link from "next/link";
import { ReactNode } from "react";
import { NO_AUTO_POST_NOTICE, PRODUCTION_RULE } from "@/lib/media-engine/constants";

const NAV_ITEMS = [
  { href: "/media-engine",               label: "Dashboard",         icon: "⬡" },
  { href: "/media-engine/trend-scout",   label: "Trend Scout",       icon: "◎" },
  { href: "/media-engine/approvals",     label: "Ready for Brian",   icon: "◈", highlight: true },
  { href: "/media-engine/export",        label: "Export Center",     icon: "⬡" },
  { href: "/media-engine/analytics",     label: "Analytics",         icon: "◉" },
  { href: "/media-engine/mission-log",   label: "Mission Log",       icon: "◌" },
];

export default function MediaEngineLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: "rgba(5,8,18,1)", color: "#e2e8f0" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col w-56 shrink-0 border-r"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          background: "linear-gradient(180deg, rgba(10,16,34,0.98) 0%, rgba(5,8,18,1) 100%)",
        }}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <p className="text-[8px] font-bold tracking-[0.4em] mb-1" style={{ color: "rgba(6,182,212,0.5)" }}>
            THE ARKHE PROJECT
          </p>
          <h1 className="text-[13px] font-black tracking-tight text-white leading-tight">
            MEDIA ENGINE
          </h1>
          <p className="text-[9px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            Ark Production System
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all"
              style={
                item.highlight
                  ? {
                      background: "rgba(245,158,11,0.1)",
                      border: "1px solid rgba(245,158,11,0.25)",
                      color: "#fbbf24",
                    }
                  : { color: "rgba(255,255,255,0.45)" }
              }
            >
              <span className="text-[11px]">{item.icon}</span>
              {item.label}
              {item.highlight && (
                <span
                  className="ml-auto text-[8px] font-black px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "rgba(245,158,11,0.2)",
                    border: "1px solid rgba(245,158,11,0.4)",
                    color: "#fbbf24",
                  }}
                >
                  ★
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Production rule footer */}
        <div className="px-4 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <p className="text-[8px] leading-relaxed" style={{ color: "rgba(255,255,255,0.2)" }}>
            {PRODUCTION_RULE}
          </p>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-screen overflow-auto">
        {/* No-auto-post banner */}
        <div
          className="shrink-0 px-6 py-2 text-center text-[9px] font-bold tracking-widest"
          style={{
            background: "rgba(239,68,68,0.06)",
            borderBottom: "1px solid rgba(239,68,68,0.15)",
            color: "rgba(248,113,113,0.7)",
          }}
        >
          {NO_AUTO_POST_NOTICE}
        </div>

        <div className="flex-1 p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
