"use client";

import { useEffect, useState } from "react";
import { CHANNELS } from "@/lib/media-engine/constants";
import { ChannelId } from "@/lib/media-engine/types";

interface AnalyticsRow {
  id: string;
  title: string;
  channel: ChannelId;
  platform: string;
  post_url: string;
  upload_date: string;
  views_1h: number;
  views_24h: number;
  views_7d: number;
  likes: number;
  comments: number;
  shares: number;
  followers_gained: number;
  estimated_cost: number;
  estimated_revenue: number;
}

const DEMO_ROWS: AnalyticsRow[] = [
  {
    id: "1",
    title: "What Does a Criminal Appeal Actually Require?",
    channel: "ark_legal_signal",
    platform: "YouTube",
    post_url: "",
    upload_date: "",
    views_1h: 0, views_24h: 0, views_7d: 0,
    likes: 0, comments: 0, shares: 0, followers_gained: 0,
    estimated_cost: 0.18,
    estimated_revenue: 0,
  },
];

const STAT_FIELDS: Array<{ key: keyof AnalyticsRow; label: string; color: string; prefix?: string }> = [
  { key: "views_1h",          label: "Views 1h",   color: "#06b6d4" },
  { key: "views_24h",         label: "Views 24h",  color: "#8b5cf6" },
  { key: "views_7d",          label: "Views 7d",   color: "#a78bfa" },
  { key: "likes",             label: "Likes",      color: "#34d399" },
  { key: "comments",          label: "Comments",   color: "#67e8f9" },
  { key: "shares",            label: "Shares",     color: "#c4b5fd" },
  { key: "followers_gained",  label: "Followers",  color: "#fbbf24" },
  { key: "estimated_cost",    label: "Cost",       color: "#f87171", prefix: "$" },
  { key: "estimated_revenue", label: "Revenue",    color: "#4ade80", prefix: "$" },
];

// Extra shape from the API join
interface LiveSnapshot extends AnalyticsRow {
  manual_post_id: string;  // snapshot's FK to me_manual_posts
  post?: {
    id: string; platform: string; post_url: string; channel: string; posted_at: string;
    package?: { topic?: { id: string; title: string; channel: string } };
  };
}

export default function AnalyticsPage() {
  const [rows, setRows]         = useState<AnalyticsRow[]>(DEMO_ROWS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuf, setEditBuf]   = useState<Partial<AnalyticsRow>>({});
  const [saving, setSaving]     = useState(false);
  const [isDemo, setIsDemo]     = useState(false);
  const [loaded, setLoaded]     = useState(false);

  // Map row.id → manual_post_id for saving
  const [postIdMap, setPostIdMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/media-engine/analytics")
      .then((r) => r.json())
      .then((d) => {
        const snaps: LiveSnapshot[] = Array.isArray(d.snapshots) ? d.snapshots : [];
        if (snaps.length > 0) {
          const mapped: AnalyticsRow[] = snaps.map((s) => ({
            id:               s.id,
            title:            s.post?.package?.topic?.title ?? s.post_url ?? "Unknown",
            channel:          (s.post?.channel ?? "ark_legal_signal") as ChannelId,
            platform:         s.post?.platform ?? "YouTube",
            post_url:         s.post_url ?? s.post?.post_url ?? "",
            upload_date:      s.upload_date ?? s.post?.posted_at?.split("T")[0] ?? "",
            views_1h:         s.views_1h,
            views_24h:        s.views_24h,
            views_7d:         s.views_7d,
            likes:            s.likes,
            comments:         s.comments,
            shares:           s.shares,
            followers_gained: s.followers_gained,
            estimated_cost:   Number(s.estimated_cost)   || 0,
            estimated_revenue: Number(s.estimated_revenue) || 0,
          }));
          setRows(mapped);
          // Build post ID map for saves
          const pmap: Record<string, string> = {};
          snaps.forEach((s) => { pmap[s.id] = s.manual_post_id; });
          setPostIdMap(pmap);
        } else {
          // Try posts API to see if there are posted items without snapshots yet
          return fetch("/api/media-engine/posts")
            .then((r) => r.json())
            .then((pd) => {
              const posts = Array.isArray(pd.posts) ? pd.posts : [];
              if (posts.length > 0) {
                const mapped: AnalyticsRow[] = posts.map((p: LiveSnapshot["post"]) => ({
                  id:               p?.id ?? crypto.randomUUID(),
                  title:            p?.package?.topic?.title ?? p?.post_url ?? "Unknown",
                  channel:          (p?.channel ?? "ark_legal_signal") as ChannelId,
                  platform:         p?.platform ?? "YouTube",
                  post_url:         p?.post_url ?? "",
                  upload_date:      p?.posted_at?.split("T")[0] ?? "",
                  views_1h: 0, views_24h: 0, views_7d: 0,
                  likes: 0, comments: 0, shares: 0, followers_gained: 0,
                  estimated_cost: 0, estimated_revenue: 0,
                }));
                setRows(mapped);
                const pmap: Record<string, string> = {};
                posts.forEach((p: { id: string }) => { pmap[p.id] = p.id; });
                setPostIdMap(pmap);
              } else {
                setIsDemo(true);
              }
            });
        }
      })
      .catch(() => setIsDemo(true))
      .finally(() => setLoaded(true));
  }, []);

  function startEdit(row: AnalyticsRow) {
    setEditingId(row.id);
    setEditBuf({ ...row });
  }

  async function saveEdit(id: string) {
    // Optimistic local update first
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...editBuf } : r));
    setEditingId(null);

    if (!isDemo) {
      const row = rows.find((r) => r.id === id);
      if (!row) return;
      const updated = { ...row, ...editBuf };
      const manual_post_id = postIdMap[id] ?? id;
      setSaving(true);
      try {
        await fetch("/api/media-engine/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            manual_post_id,
            channel:           updated.channel,
            upload_date:       updated.upload_date || null,
            post_url:          updated.post_url,
            views_1h:          updated.views_1h,
            views_24h:         updated.views_24h,
            views_7d:          updated.views_7d,
            likes:             updated.likes,
            comments:          updated.comments,
            shares:            updated.shares,
            followers_gained:  updated.followers_gained,
            estimated_cost:    updated.estimated_cost,
            estimated_revenue: updated.estimated_revenue,
          }),
        });
      } finally {
        setSaving(false);
      }
    }

    setEditBuf({});
  }

  const totalRevenue = rows.reduce((s, r) => s + r.estimated_revenue, 0);
  const totalCost    = rows.reduce((s, r) => s + r.estimated_cost, 0);
  const net          = totalRevenue - totalCost;

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <p className="text-[9px] font-bold tracking-[0.4em] mb-2" style={{ color: "rgba(167,139,250,0.7)" }}>
          MEDIA ENGINE / ANALYTICS
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-black text-white">Analytics Tracker</h1>
          {loaded && (
            <span
              className="text-[8px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: isDemo ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
                border: `1px solid ${isDemo ? "rgba(245,158,11,0.25)" : "rgba(16,185,129,0.25)"}`,
                color: isDemo ? "#fbbf24" : "#34d399",
              }}
            >
              {isDemo ? "DEMO" : "● LIVE"}
            </span>
          )}
          {saving && (
            <span className="text-[8px] font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>Saving…</span>
          )}
        </div>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          Enter performance data after Brian posts manually. Ark uses this data for mission logs.
        </p>
      </div>

      {/* Summary totals */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} color="#4ade80" />
        <SummaryCard label="Total Cost"    value={`$${totalCost.toFixed(2)}`}    color="#f87171" />
        <SummaryCard
          label="Net"
          value={`${net >= 0 ? "+" : ""}$${net.toFixed(2)}`}
          color={net >= 0 ? "#34d399" : "#f87171"}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(10,16,34,0.9)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <h2 className="text-sm font-bold text-white">Published Content</h2>
          <button
            onClick={() => {
              const newRow: AnalyticsRow = {
                id: crypto.randomUUID(), title: "New Post", channel: "ark_legal_signal",
                platform: "YouTube", post_url: "", upload_date: new Date().toISOString().split("T")[0],
                views_1h: 0, views_24h: 0, views_7d: 0, likes: 0, comments: 0,
                shares: 0, followers_gained: 0, estimated_cost: 0, estimated_revenue: 0,
              };
              setRows((p) => [newRow, ...p]);
              startEdit(newRow);
            }}
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(6,182,212,0.1)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.25)" }}
          >
            + Add Entry
          </button>
        </div>

        {rows.map((row) => {
          const ch = CHANNELS[row.channel];
          const isEditing = editingId === row.id;
          return (
            <div
              key={row.id}
              className="border-b p-5"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      className="w-full px-2 py-1 rounded text-sm text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
                      value={editBuf.title ?? row.title}
                      onChange={(e) => setEditBuf((b) => ({ ...b, title: e.target.value }))}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white">{row.title}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-bold" style={{ color: ch.color }}>{ch.name}</span>
                    <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>{row.platform}</span>
                    {row.upload_date && (
                      <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>{row.upload_date}</span>
                    )}
                  </div>
                  {isEditing && (
                    <input
                      className="mt-2 w-full px-2 py-1 rounded text-[11px] text-white outline-none font-mono"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                      placeholder="Post URL"
                      value={editBuf.post_url ?? row.post_url}
                      onChange={(e) => setEditBuf((b) => ({ ...b, post_url: e.target.value }))}
                    />
                  )}
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => startEdit(row)}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg shrink-0"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    Enter Data
                  </button>
                ) : (
                  <button
                    onClick={() => saveEdit(row.id)}
                    disabled={saving}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg shrink-0"
                    style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)", opacity: saving ? 0.6 : 1 }}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-9 gap-2">
                {STAT_FIELDS.map((f) => (
                  <div key={f.key} className="text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        className="w-full text-center px-1 py-1 rounded text-[11px] font-mono outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: f.color }}
                        value={(editBuf[f.key] as number) ?? (row[f.key] as number)}
                        onChange={(e) => setEditBuf((b) => ({ ...b, [f.key]: parseFloat(e.target.value) || 0 }))}
                      />
                    ) : (
                      <p className="text-sm font-black font-mono" style={{ color: f.color }}>
                        {f.prefix}{(row[f.key] as number).toLocaleString()}
                      </p>
                    )}
                    <p className="text-[7px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {f.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              No posts recorded yet. Post content manually, then add entries here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "rgba(10,16,34,0.85)", borderColor: "rgba(255,255,255,0.07)" }}>
      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>
      <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
    </div>
  );
}
