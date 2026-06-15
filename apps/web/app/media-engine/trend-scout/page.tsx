"use client";

import { useState } from "react";
import { CHANNELS, LEGAL_ISSUE_LABELS, RISK_COLORS, STATUS_COLORS } from "@/lib/media-engine/constants";
import { ChannelId, LegalIssueType, RiskLevel, Topic, TopicStatus } from "@/lib/media-engine/types";

const EMPTY_FORM = {
  title: "",
  summary: "",
  source_urls: "",
  source_notes: "",
  attention_score: 7,
  urgency_score: 7,
  legal_issue: "" as LegalIssueType | "",
  channel: "ark_legal_signal" as ChannelId,
  recommended_angle: "",
  risk_level: "low" as RiskLevel,
};

export default function TrendScoutPage() {
  const [form, setForm]           = useState(EMPTY_FORM);
  const [topics, setTopics]       = useState<Topic[]>([]);
  const [classifying, setClassifying] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  function setField<K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function classifyLegalIssue() {
    if (!form.title || !form.summary) return;
    setClassifying(true);
    try {
      const res = await fetch("/api/media-engine/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, summary: form.summary }),
      });
      const data = await res.json();
      if (data.legal_issue) {
        setField("legal_issue", data.legal_issue);
        if (data.recommended_angle) setField("recommended_angle", data.recommended_angle);
      }
    } finally {
      setClassifying(false);
    }
  }

  async function saveTopic() {
    if (!form.title) return;
    setSaving(true);
    const payload = {
      title:             form.title,
      summary:           form.summary,
      source_urls:       form.source_urls.split("\n").map((u) => u.trim()).filter(Boolean),
      source_notes:      form.source_notes,
      attention_score:   form.attention_score,
      urgency_score:     form.urgency_score,
      legal_issue:       form.legal_issue || null,
      channel:           form.channel,
      recommended_angle: form.recommended_angle,
      risk_level:        form.risk_level,
    };

    let savedTopic: Topic | null = null;
    try {
      const res = await fetch("/api/media-engine/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      savedTopic = data.topic ?? null;
    } catch {
      // Supabase not configured — fall back to local state
    }

    const topic: Topic = savedTopic ?? {
      id: crypto.randomUUID(),
      ...payload,
      source_urls: payload.source_urls,
      status: "discovered",
      ark_reasoning: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTopics((prev) => [topic, ...prev]);
    setForm(EMPTY_FORM);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <p className="text-[9px] font-bold tracking-[0.4em] mb-2" style={{ color: "rgba(6,182,212,0.55)" }}>
          MEDIA ENGINE / TREND SCOUT
        </p>
        <h1 className="text-xl font-black text-white">Trend Scout</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          Enter topics manually. Ark classifies and prepares them for production.
        </p>
      </div>

      {/* Topic entry form */}
      <div
        className="rounded-2xl border p-6 space-y-5"
        style={{ background: "rgba(10,16,34,0.9)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-sm font-bold text-white">New Topic</h2>

        {/* Title */}
        <div>
          <label className="text-[10px] font-bold tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>
            Topic Title *
          </label>
          <input
            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            placeholder="e.g. What Does an Appeal Actually Require?"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
          />
        </div>

        {/* Summary */}
        <div>
          <label className="text-[10px] font-bold tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>
            Summary
          </label>
          <textarea
            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            rows={3}
            placeholder="1–3 sentence description of the topic and why it matters now."
            value={form.summary}
            onChange={(e) => setField("summary", e.target.value)}
          />
        </div>

        {/* Channel + Legal Issue row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>
              Channel
            </label>
            <select
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
              value={form.channel}
              onChange={(e) => setField("channel", e.target.value as ChannelId)}
            >
              {(["ark_legal_signal", "agentos_journey"] as const).map((c) => (
                <option key={c} value={c}>{CHANNELS[c].name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
                Legal Issue
              </label>
              <button
                className="text-[9px] font-bold px-2 py-1 rounded"
                style={{ background: "rgba(6,182,212,0.1)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.2)" }}
                onClick={classifyLegalIssue}
                disabled={classifying || !form.title}
              >
                {classifying ? "Classifying…" : "Auto-classify"}
              </button>
            </div>
            <select
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
              value={form.legal_issue}
              onChange={(e) => setField("legal_issue", e.target.value as LegalIssueType | "")}
            >
              <option value="">— Select —</option>
              {Object.entries(LEGAL_ISSUE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Scores row */}
        <div className="grid grid-cols-3 gap-4">
          <ScoreSlider label="Attention" value={form.attention_score} onChange={(v) => setField("attention_score", v)} />
          <ScoreSlider label="Urgency"   value={form.urgency_score}   onChange={(v) => setField("urgency_score", v)} />
          <div>
            <label className="text-[10px] font-bold tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>
              Risk Level
            </label>
            <select
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
              value={form.risk_level}
              onChange={(e) => setField("risk_level", e.target.value as RiskLevel)}
            >
              {(["low", "medium", "high", "critical"] as const).map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Recommended angle */}
        <div>
          <label className="text-[10px] font-bold tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>
            Recommended Angle
          </label>
          <input
            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            placeholder="The specific teaching angle Ark should use"
            value={form.recommended_angle}
            onChange={(e) => setField("recommended_angle", e.target.value)}
          />
        </div>

        {/* Source URLs */}
        <div>
          <label className="text-[10px] font-bold tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>
            Source URLs (one per line)
          </label>
          <textarea
            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none font-mono"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            rows={3}
            placeholder="https://..."
            value={form.source_urls}
            onChange={(e) => setField("source_urls", e.target.value)}
          />
        </div>

        {/* Source notes */}
        <div>
          <label className="text-[10px] font-bold tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>
            Source Notes
          </label>
          <textarea
            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            rows={2}
            placeholder="What do the sources say? Key facts Ark can use."
            value={form.source_notes}
            onChange={(e) => setField("source_notes", e.target.value)}
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            onClick={saveTopic}
            disabled={saving || !form.title}
            className="px-5 py-2.5 rounded-lg text-sm font-bold"
            style={{
              background: form.title ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${form.title ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.1)"}`,
              color: form.title ? "#67e8f9" : "rgba(255,255,255,0.3)",
              cursor: form.title ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Saving…" : "Save Topic → Discovered"}
          </button>
          {saved && (
            <span className="text-[11px] font-bold" style={{ color: "#34d399" }}>
              ✓ Topic saved
            </span>
          )}
        </div>
      </div>

      {/* Saved topics this session */}
      {topics.length > 0 && (
        <section>
          <h2 className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
            Added This Session
          </h2>
          <div className="space-y-2">
            {topics.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl border"
                style={{ background: "rgba(10,16,34,0.8)", borderColor: "rgba(255,255,255,0.07)" }}
              >
                <div>
                  <p className="text-sm font-semibold text-white">{t.title}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {CHANNELS[t.channel].name} · {t.legal_issue?.replace(/_/g, " ") ?? "No legal issue"}
                  </p>
                </div>
                <span
                  className="text-[9px] font-bold px-2 py-1 rounded-full"
                  style={{
                    background: STATUS_COLORS.discovered.bg,
                    border: `1px solid ${STATUS_COLORS.discovered.border}`,
                    color: STATUS_COLORS.discovered.text,
                  }}
                >
                  Discovered
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
          {label}
        </label>
        <span className="text-[11px] font-black font-mono" style={{ color: "#06b6d4" }}>{value}/10</span>
      </div>
      <input
        type="range" min={1} max={10} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-cyan-400"
      />
    </div>
  );
}
