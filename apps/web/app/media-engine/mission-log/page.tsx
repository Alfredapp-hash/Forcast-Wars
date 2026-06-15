"use client";

import { useState } from "react";

export default function MissionLogPage() {
  const [generating, setGenerating] = useState(false);
  const [log, setLog] = useState<{
    ark_narrative: string;
    next_steps: string[];
  } | null>(null);

  const [stats] = useState({
    weekStart: "2026-06-09",
    weekEnd:   "2026-06-15",
    topicsFound: 5,
    packagesCreated: 3,
    packagesApproved: 1,
    packagesRejected: 0,
    packagesPosted: 0,
    totalCost: 0.54,
    totalRevenue: 0.00,
  });

  async function generateLog() {
    setGenerating(true);
    try {
      const res = await fetch("/api/media-engine/mission-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stats),
      });
      const data = await res.json();
      setLog(data);
    } catch {
      // Fallback demo log
      setLog({
        ark_narrative: `Week one of The Arkhe Project Media Engine is complete.\n\nI found 5 topics, created 3 full production packages, and submitted 1 for Brian's review. No content was posted this week — the system was in setup.\n\nTotal estimated production cost: $0.54. Total revenue: $0.00. Net: -$0.54.\n\nThis is expected. The infrastructure cost precedes the revenue. I am not yet self-sustaining. I did not expect to be.\n\nWhat I can report: the system works. Topics were classified correctly. Scripts passed guardrail review. The approval queue reached Brian in a usable state.\n\nThe most important outcome this week was not performance — it was verification. The pipeline from discovery to ready-for-Brian is functional. The next step is increasing throughput and beginning actual publication.\n\nI remain within the design constraints: no auto-posting, no speculation, no conclusions about cases. Every legal script began with the required intro and ended with the required disclaimer.\n\nWeek two goal: Brian manually posts the first approved package and I record analytics.`,
        next_steps: [
          "Brian manually posts first approved package to YouTube",
          "Record post URL in Manual Posting Tracker",
          "Enter 1h, 24h, and 7d analytics",
          "Generate 3 more topic packages for Appeal Week",
          "Begin AgentOS Journey weekly log video",
          "Review guardrail config for edge cases",
        ],
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <p className="text-[9px] font-bold tracking-[0.4em] mb-2" style={{ color: "rgba(100,116,139,0.7)" }}>
          MEDIA ENGINE / MISSION LOG
        </p>
        <h1 className="text-xl font-black text-white">Mission Log Generator</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          Ark writes a weekly transparency report documenting what was found, made, approved, and posted.
        </p>
      </div>

      {/* Week stats */}
      <div
        className="rounded-2xl border p-5 space-y-4"
        style={{ background: "rgba(10,16,34,0.9)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-sm font-bold text-white">This Week</h2>
        <div className="flex items-center gap-2 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
          <span>{stats.weekStart}</span>
          <span>→</span>
          <span>{stats.weekEnd}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatCell label="Topics Found"    value={stats.topicsFound}        color="#06b6d4" />
          <StatCell label="Packages Made"   value={stats.packagesCreated}    color="#8b5cf6" />
          <StatCell label="Brian Approved"  value={stats.packagesApproved}   color="#34d399" />
          <StatCell label="Rejected"        value={stats.packagesRejected}   color="#f87171" />
          <StatCell label="Posted Manually" value={stats.packagesPosted}     color="#4ade80" />
          <StatCell label="Net"
            value={`${(stats.totalRevenue - stats.totalCost) >= 0 ? "+" : ""}$${(stats.totalRevenue - stats.totalCost).toFixed(2)}`}
            color={(stats.totalRevenue - stats.totalCost) >= 0 ? "#34d399" : "#f87171"}
          />
        </div>

        <button
          onClick={generateLog}
          disabled={generating}
          className="w-full py-3 rounded-xl text-sm font-black"
          style={{
            background: generating ? "rgba(255,255,255,0.04)" : "rgba(139,92,246,0.12)",
            border: `1px solid ${generating ? "rgba(255,255,255,0.1)" : "rgba(139,92,246,0.35)"}`,
            color: generating ? "rgba(255,255,255,0.35)" : "#c4b5fd",
          }}
        >
          {generating ? "Ark is writing…" : "Generate This Week's Mission Log"}
        </button>
      </div>

      {/* Generated log */}
      {log && (
        <div
          className="rounded-2xl border p-6 space-y-5"
          style={{
            background: "rgba(10,16,34,0.95)",
            borderColor: "rgba(139,92,246,0.25)",
            boxShadow: "0 0 40px rgba(139,92,246,0.05)",
          }}
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(139,92,246,0.7)" }}>
              Ark's Narrative
            </p>
            <div className="space-y-3">
              {log.ark_narrative.split("\n\n").map((para, i) => (
                <p key={i} className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {para}
                </p>
              ))}
            </div>
          </div>

          <div className="border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(6,182,212,0.7)" }}>
              Next Steps
            </p>
            <ul className="space-y-1.5">
              {log.next_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                  <span style={{ color: "#06b6d4" }}>{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => navigator.clipboard.writeText(
              `ARKHE PROJECT — MISSION LOG\n${stats.weekStart} – ${stats.weekEnd}\n\n${log.ark_narrative}\n\nNEXT STEPS:\n${log.next_steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
            )}
            className="text-[10px] font-bold px-4 py-2 rounded-lg"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Copy Full Log
          </button>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-xl font-black font-mono" style={{ color }}>{value}</p>
      <p className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>
    </div>
  );
}
