"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  STATUS_PIPELINE, STATUS_LABELS, STATUS_COLORS, CHANNELS,
} from "@/lib/media-engine/constants";
import { Topic, TopicStatus } from "@/lib/media-engine/types";
import { fetchTopics } from "@/lib/media-engine/client";
import { AgentDNAHelix } from "@/components/agent-dna/AgentDNAHelix";
import { useAgentEvents } from "@/lib/media-engine/useAgentEvents";

// ── Fallback seed data (shown when Supabase is not yet configured) ─────────────
const DEMO_TOPICS: Topic[] = [
  {
    id: "1", title: "What Does an Appeal Actually Require?",
    summary: "Many people think an appeal is a second trial. It is not.",
    source_urls: [], source_notes: "", attention_score: 9, urgency_score: 8,
    legal_issue: "appeal", channel: "ark_legal_signal",
    recommended_angle: "Explain preserved error + standard of review",
    risk_level: "low", status: "ready_for_brian",
    ark_reasoning: "High attention, zero speculation needed.",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "2", title: "What Is Harmless Error?",
    summary: "Courts affirm convictions even after errors. Harmless error doctrine explains why.",
    source_urls: [], source_notes: "", attention_score: 8, urgency_score: 7,
    legal_issue: "harmless_error", channel: "ark_legal_signal",
    recommended_angle: "Explain the harmless error standard",
    risk_level: "low", status: "guardrail_review",
    ark_reasoning: "Strong educational value.",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "3", title: "AgentOS Journey: Cost Transparency Week 1",
    summary: "Ark documents its first week of production costs and revenue.",
    source_urls: [], source_notes: "", attention_score: 7, urgency_score: 9,
    legal_issue: null, channel: "agentos_journey",
    recommended_angle: "Raw cost/revenue transparency",
    risk_level: "low", status: "drafting",
    ark_reasoning: "Core mission content.",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "4", title: "Why Appeals Are Not Retrials",
    summary: "Appellate courts do not re-hear evidence. This explains why.",
    source_urls: [], source_notes: "", attention_score: 8, urgency_score: 6,
    legal_issue: "appeal", channel: "ark_legal_signal",
    recommended_angle: "Scope of appellate review",
    risk_level: "low", status: "approved",
    ark_reasoning: "Strong channel fit.",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "5", title: "Preserved Error: Why Trial Lawyers Object",
    summary: "Why objecting at trial matters for appeal.",
    source_urls: [], source_notes: "", attention_score: 7, urgency_score: 5,
    legal_issue: "preserved_error", channel: "ark_legal_signal",
    recommended_angle: "How error preservation works",
    risk_level: "low", status: "discovered",
    ark_reasoning: "Useful for audience understanding appellate mechanics.",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TopicStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Pipeline step ──────────────────────────────────────────────────────────────
function PipelineStep({
  status, count, isReadyForBrian,
}: { status: TopicStatus; count: number; isReadyForBrian?: boolean }) {
  const c = STATUS_COLORS[status];
  return (
    <div
      className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border min-w-[96px]"
      style={{
        background: isReadyForBrian ? "rgba(245,158,11,0.1)" : c.bg,
        borderColor: isReadyForBrian ? "rgba(245,158,11,0.45)" : c.border,
        boxShadow: isReadyForBrian ? "0 0 20px rgba(245,158,11,0.08)" : undefined,
      }}
    >
      <span
        className="text-2xl font-black font-mono"
        style={{ color: isReadyForBrian ? "#fbbf24" : c.text }}
      >
        {count}
      </span>
      <span
        className="text-[8px] font-bold tracking-widest text-center uppercase leading-tight"
        style={{ color: isReadyForBrian ? "#fbbf24" : c.text, opacity: isReadyForBrian ? 1 : 0.8 }}
      >
        {STATUS_LABELS[status]}
      </span>
    </div>
  );
}

export default function MediaEngineDashboard() {
  const [topics, setTopics] = useState<Topic[]>(DEMO_TOPICS);
  const [dataSource, setDataSource] = useState<"demo" | "live">("demo");

  useEffect(() => {
    fetchTopics()
      .then((live) => {
        if (live.length > 0) {
          setTopics(live);
          setDataSource("live");
        }
      })
      .catch(() => { /* keep demo data if Supabase not configured */ });
  }, []);

  const countByStatus = (s: TopicStatus) => topics.filter((t) => t.status === s).length;
  const readyTopics   = topics.filter((t) => t.status === "ready_for_brian");
  const recentTopics  = [...topics].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  ).slice(0, 6);

  // Build pipeline state from real topic counts for event system
  const statusCounts: Partial<Record<TopicStatus, number>> = {};
  STATUS_PIPELINE.forEach((s) => {
    const c = countByStatus(s);
    if (c > 0) statusCounts[s] = c;
  });
  const { messages: agentMessages, eventLog } = useAgentEvents({ statusCounts });

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[9px] font-bold tracking-[0.4em] mb-2" style={{ color: "rgba(6,182,212,0.55)" }}>
          THE ARKHE PROJECT / MEDIA ENGINE
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-white tracking-tight">Production Dashboard</h1>
          <span
            className="text-[8px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: dataSource === "live" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.1)",
              border: `1px solid ${dataSource === "live" ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.25)"}`,
              color: dataSource === "live" ? "#34d399" : "#fbbf24",
            }}
          >
            {dataSource === "live" ? "● LIVE" : "● DEMO"}
          </span>
        </div>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          Ark is your production staff. You are the editor-in-chief.
        </p>
      </div>

      {/* ── Agent Operating Network — DNA Helix with live comms ─────────────── */}
      <section>
        <div className="flex items-start gap-6 xl:flex-row flex-col">
          {/* Helix — takes up the majority of width */}
          <div className="flex-1 min-w-0">
            <AgentDNAHelix messages={agentMessages} mode="dashboard" />
          </div>

          {/* Live event log — right sidebar */}
          <div
            className="xl:w-64 w-full rounded-2xl border flex flex-col overflow-hidden shrink-0"
            style={{
              background: "rgba(10,16,34,0.95)",
              borderColor: "rgba(255,255,255,0.07)",
              minHeight: 200,
              maxHeight: 560,
            }}
          >
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "#34d399", boxShadow: "0 0 6px #34d399" }}
              />
              <p className="text-[9px] font-black tracking-[0.3em] uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
                Live Comms
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {eventLog.length === 0 ? (
                <div className="flex items-center justify-center h-20">
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>Initializing…</p>
                </div>
              ) : (
                eventLog.map((evt) => (
                  <div
                    key={evt.id}
                    className="px-3 py-2 border-b flex items-start gap-2.5"
                    style={{ borderColor: "rgba(255,255,255,0.04)" }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ background: evt.color, boxShadow: `0 0 5px ${evt.color}88` }}
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold leading-tight truncate" style={{ color: "rgba(255,255,255,0.75)" }}>
                        {evt.label}
                      </p>
                      <p className="text-[8px] mt-0.5 font-mono truncate" style={{ color: "rgba(255,255,255,0.28)" }}>
                        {evt.fromId.replace("ark-", "")} → {evt.toId.replace("ark-", "")}
                      </p>
                    </div>
                    <p className="text-[8px] ml-auto shrink-0 font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pipeline counts ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[10px] font-bold tracking-widest mb-3 uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
          Production Pipeline
        </h2>
        <div className="flex flex-wrap gap-2">
          {STATUS_PIPELINE.map((s) => (
            <PipelineStep
              key={s}
              status={s}
              count={countByStatus(s)}
              isReadyForBrian={s === "ready_for_brian"}
            />
          ))}
        </div>
      </section>

      {/* ── Ready for Brian — Primary gate ─────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#fbbf24" }}>
            ★ Ready for Brian — Your Approval Queue
          </h2>
          <Link
            href="/media-engine/approvals"
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
            style={{
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.35)",
              color: "#fbbf24",
            }}
          >
            Review All →
          </Link>
        </div>

        {readyTopics.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}
          >
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              Nothing waiting for review. Ark is still producing.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {readyTopics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} showApproveLink />
            ))}
          </div>
        )}
      </section>

      {/* ── All recent topics ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
            Recent Topics
          </h2>
          <Link
            href="/media-engine/trend-scout"
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
            style={{
              background: "rgba(6,182,212,0.08)",
              border: "1px solid rgba(6,182,212,0.25)",
              color: "#67e8f9",
            }}
          >
            + Add Topic
          </Link>
        </div>
        <div className="space-y-2">
          {recentTopics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      </section>

      {/* ── Channel summary ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
          Channels
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {(["ark_legal_signal", "agentos_journey"] as const).map((cid) => {
            const ch = CHANNELS[cid];
            const count = topics.filter((t) => t.channel === cid).length;
            return (
              <div
                key={cid}
                className="rounded-xl p-4 border"
                style={{
                  background: `${ch.color}08`,
                  borderColor: `${ch.color}25`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: ch.color }} />
                  <span className="text-sm font-bold text-white">{ch.name}</span>
                </div>
                <p className="text-[10px] mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>{ch.tagline}</p>
                <span className="text-xl font-black font-mono" style={{ color: ch.color }}>{count}</span>
                <span className="text-[9px] ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>topics</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ── Shared topic card ────────────────────────────────────────────────────────────────────────────────
function TopicCard({ topic, showApproveLink }: { topic: Topic; showApproveLink?: boolean }) {
  const ch = CHANNELS[topic.channel];
  return (
    <Link
      href={`/media-engine/topics/${topic.id}`}
      className="block rounded-xl p-4 border flex items-start justify-between gap-4 hover:border-opacity-60 transition-all"
      style={{
        background: "rgba(15,20,40,0.8)",
        borderColor: showApproveLink ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <StatusBadge status={topic.status} />
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${ch.color}18`, color: ch.color, border: `1px solid ${ch.color}30` }}
          >
            {ch.name}
          </span>
          {topic.legal_issue && (
            <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              {topic.legal_issue.replace(/_/g, " ")}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-white leading-tight truncate">{topic.title}</p>
        <p className="text-[11px] mt-1 line-clamp-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          {topic.summary}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <div className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>ATT</div>
          <div className="text-sm font-black font-mono" style={{ color: "#06b6d4" }}>
            {topic.attention_score}/10
          </div>
        </div>
        {showApproveLink && (
          <Link
            href={`/media-engine/approvals`}
            className="text-[10px] font-black px-3 py-1.5 rounded-lg whitespace-nowrap"
            style={{
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.4)",
              color: "#fbbf24",
            }}
          >
            Review
          </Link>
        )}
      </div>
    </Link>
  );
}
