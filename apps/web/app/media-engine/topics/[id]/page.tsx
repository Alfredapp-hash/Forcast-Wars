"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CHANNELS, LEGAL_ISSUE_LABELS, RISK_COLORS, STATUS_COLORS, STATUS_LABELS } from "@/lib/media-engine/constants";
import { GeneratedScripts, GuardrailReport, Topic, TopicStatus } from "@/lib/media-engine/types";
import { ProduceStage, producePackage } from "@/lib/media-engine/client";

const STAGE_MESSAGES: Record<ProduceStage, string> = {
  idle:       "",
  generating: "Ark is generating scripts and selecting the best angle…",
  guardrail:  "Running legal guardrail check on all scripts…",
  saving:     "Saving package to database…",
  done:       "Package complete — moved to approval queue.",
  error:      "Something went wrong.",
};

const STAGE_COLORS: Record<ProduceStage, string> = {
  idle:       "transparent",
  generating: "#8b5cf6",
  guardrail:  "#f59e0b",
  saving:     "#06b6d4",
  done:       "#34d399",
  error:      "#f87171",
};

export default function TopicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [topic, setTopic]         = useState<Topic | null>(null);
  const [loading, setLoading]     = useState(true);
  const [stage, setStage]         = useState<ProduceStage>("idle");
  const [stageMsg, setStageMsg]   = useState("");
  const [result, setResult]       = useState<{
    packageId: string;
    riskLevel: string;
    approvedForReview: boolean;
  } | null>(null);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/media-engine/topics?id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        // topics endpoint returns array — find by id
        const found = Array.isArray(d.topics)
          ? d.topics.find((t: Topic) => t.id === id)
          : null;
        setTopic(found ?? null);
      })
      .catch(() => setTopic(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleProduce() {
    if (!topic) return;
    setError(null);
    setResult(null);
    try {
      const r = await producePackage(topic, (s, msg) => {
        setStage(s);
        setStageMsg(msg ?? STAGE_MESSAGES[s]);
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  async function updateStatus(status: TopicStatus) {
    if (!topic) return;
    await fetch(`/api/media-engine/topics/${topic.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTopic((t) => t ? { ...t, status } : t);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</p>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Topic not found.</p>
        <button onClick={() => router.back()} className="text-[11px]" style={{ color: "#67e8f9" }}>← Back</button>
      </div>
    );
  }

  const ch     = CHANNELS[topic.channel];
  const statusC = STATUS_COLORS[topic.status];
  const producing = stage !== "idle" && stage !== "done" && stage !== "error";
  const canProduce = ["discovered", "selected", "revision_requested"].includes(topic.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-[11px] font-bold"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        ← Back to Dashboard
      </button>

      {/* Topic header */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: "rgba(10,16,34,0.95)", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-full"
              style={{ background: statusC.bg, border: `1px solid ${statusC.border}`, color: statusC.text }}
            >
              {STATUS_LABELS[topic.status]}
            </span>
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded"
              style={{ background: `${ch.color}15`, color: ch.color, border: `1px solid ${ch.color}28` }}
            >
              {ch.name}
            </span>
            {topic.legal_issue && (
              <span className="text-[9px] font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
                {LEGAL_ISSUE_LABELS[topic.legal_issue]}
              </span>
            )}
          </div>
          <div className="flex gap-4">
            <Stat label="Attention" value={`${topic.attention_score}/10`} color="#06b6d4" />
            <Stat label="Urgency"   value={`${topic.urgency_score}/10`}   color="#8b5cf6" />
          </div>
        </div>

        <h1 className="text-xl font-black text-white leading-tight">{topic.title}</h1>
        {topic.summary && (
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            {topic.summary}
          </p>
        )}

        {topic.recommended_angle && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
              Recommended Angle
            </p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{topic.recommended_angle}</p>
          </div>
        )}

        {topic.ark_reasoning && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(139,92,246,0.6)" }}>
              Ark's Reasoning
            </p>
            <p className="text-[12px] italic" style={{ color: "rgba(255,255,255,0.45)" }}>{topic.ark_reasoning}</p>
          </div>
        )}

        {topic.source_notes && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
              Source Notes
            </p>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>{topic.source_notes}</p>
          </div>
        )}
      </div>

      {/* Status actions — only if not yet in produce pipeline */}
      {topic.status === "discovered" && (
        <div className="flex gap-2">
          <ActionBtn
            label="Mark as Selected"
            color="#06b6d4"
            onClick={() => updateStatus("selected")}
          />
          <ActionBtn
            label="Archive"
            color="#94a3b8"
            onClick={() => updateStatus("archived")}
          />
        </div>
      )}

      {/* ── PRODUCE BUTTON ─────────────────────────────────────────────────── */}
      {canProduce && (
        <div
          className="rounded-2xl border p-6 space-y-4"
          style={{
            background: "rgba(139,92,246,0.04)",
            borderColor: producing ? "rgba(139,92,246,0.4)" : "rgba(139,92,246,0.2)",
            boxShadow: producing ? "0 0 40px rgba(139,92,246,0.08)" : undefined,
            transition: "all 0.3s",
          }}
        >
          <div>
            <h2 className="text-sm font-black text-white mb-1">Produce with Ark</h2>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              Ark will generate 3 angle options, select the best, write all scripts (30s / 60s / 2min / blog), create captions, hashtags, thumbnail concept, and run a legal guardrail check. This produces a complete review package for your approval.
            </p>
          </div>

          {/* Stage indicator */}
          {stage !== "idle" && (
            <div
              className="rounded-xl p-3 flex items-center gap-3"
              style={{
                background: `${STAGE_COLORS[stage]}0d`,
                border: `1px solid ${STAGE_COLORS[stage]}30`,
                transition: "all 0.3s",
              }}
            >
              {producing && (
                <div
                  className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                  style={{ background: STAGE_COLORS[stage] }}
                />
              )}
              <p className="text-[12px] font-semibold" style={{ color: STAGE_COLORS[stage] }}>
                {stageMsg || STAGE_MESSAGES[stage]}
              </p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)" }}
            >
              <p className="text-sm font-bold" style={{ color: "#34d399" }}>
                ✓ Package ready for your review
              </p>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                Guardrail: {result.riskLevel} risk ·{" "}
                {result.approvedForReview
                  ? "Approved for Brian's review"
                  : "Flagged — check guardrail report before reviewing"}
              </p>
              <button
                onClick={() => router.push("/media-engine/approvals")}
                className="text-[11px] font-bold px-4 py-2 rounded-lg mt-1"
                style={{
                  background: "rgba(245,158,11,0.12)",
                  border: "1px solid rgba(245,158,11,0.35)",
                  color: "#fbbf24",
                }}
              >
                ★ Review in Approval Queue →
              </button>
            </div>
          )}

          {error && (
            <p className="text-[11px] font-bold" style={{ color: "#f87171" }}>
              Error: {error}
            </p>
          )}

          {!result && (
            <button
              onClick={handleProduce}
              disabled={producing}
              className="px-6 py-3 rounded-xl text-sm font-black w-full"
              style={{
                background: producing
                  ? "rgba(139,92,246,0.06)"
                  : "rgba(139,92,246,0.15)",
                border: `1px solid ${producing ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.45)"}`,
                color: producing ? "rgba(196,181,253,0.4)" : "#c4b5fd",
                cursor: producing ? "not-allowed" : "pointer",
              }}
            >
              {producing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
                  Ark is producing…
                </span>
              ) : (
                "⚡ Produce Package with Ark"
              )}
            </button>
          )}
        </div>
      )}

      {/* If already past drafting, show links */}
      {["ready_for_brian", "revision_requested", "approved", "exported", "posted_manually"].includes(topic.status) && (
        <div className="flex gap-3">
          <NavBtn
            label="★ Review in Approvals"
            href="/media-engine/approvals"
            color="#fbbf24"
          />
          {topic.status === "approved" && (
            <NavBtn label="Export Package" href="/media-engine/export" color="#2dd4bf" />
          )}
        </div>
      )}

      {/* Guardrail / too risky state */}
      {topic.status === "too_risky" && (
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          <p className="text-sm font-bold" style={{ color: "#f87171" }}>
            This topic was marked Too Risky by Brian.
          </p>
          <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            No further production will occur on this topic.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-black font-mono" style={{ color }}>{value}</div>
      <div className="text-[8px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</div>
    </div>
  );
}

function ActionBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-lg text-[11px] font-bold"
      style={{
        background: `${color}10`,
        border: `1px solid ${color}30`,
        color,
      }}
    >
      {label}
    </button>
  );
}

function NavBtn({ label, href, color }: { label: string; href: string; color: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className="px-5 py-2.5 rounded-xl text-[12px] font-bold"
      style={{
        background: `${color}10`,
        border: `1px solid ${color}30`,
        color,
      }}
    >
      {label}
    </button>
  );
}
