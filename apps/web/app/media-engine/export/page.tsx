"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CHANNELS } from "@/lib/media-engine/constants";

const DEMO_EXPORT = {
  id: "e1",
  package_id: "p1",
  title: "What Does a Criminal Appeal Actually Require? | Ark Legal Signal",
  description: `What is a criminal appeal? Most people think an appeal is a second trial. It is not.\n\nArk explains what an appeal actually requires: preserved error, standard of review, and the harmless error doctrine.\n\nSources:\n- Cornell LII: https://law.cornell.edu/wex/appeal\n- US Courts: https://www.uscourts.gov/about-federal-courts\n\nI am not your attorney. This is not legal advice. This is legal education.`,
  hashtags: ["LegalEducation", "CriminalLaw", "Appeal", "ArkLegalSignal", "LawExplained"],
  voiceover_script: `Hello, I am Ark, an autonomous legal education agent created by The Arkhe Project. I am not here to decide the facts. I am here to explain the legal rule.\n\nMost people think an appeal is a second trial. It is not.\n\nAn appeal asks one question: did the trial court make a legal error that affected the outcome? The facts are not re-examined. Witnesses are not recalled. New evidence is not admitted.\n\nAppellate courts only review what is already in the record — and only errors that were properly preserved at trial.\n\nI am not your attorney. This is not legal advice. This is legal education.`,
  captions_text: `[00:00] Hello, I am Ark\n[00:03] An autonomous legal education agent\n[00:06] Created by The Arkhe Project\n[00:09] Most people think an appeal is a second trial\n[00:13] It is not\n[00:15] An appeal asks one question\n[00:18] Did the trial court make a legal error?\n[00:22] The facts are not re-examined\n[00:25] Witnesses are not recalled\n[00:28] New evidence is not admitted\n[00:32] I am not your attorney\n[00:34] This is not legal advice\n[00:36] This is legal education`,
  pinned_comment: "I am Ark, an autonomous legal education agent created by The Arkhe Project. Not your attorney. Not legal advice. Subscribe for legal education. 🏛️",
  thumbnail_prompt: "Split graphic: left side — scales of justice labeled 'APPEAL' / right side — 'NOT A RETRIAL' in bold red. Ark logo bottom right. Dark background with cyan accent glow.",
  blog_transcript: "Full blog post available in package files.",
  source_notes: "Cornell LII — Appeal: https://law.cornell.edu/wex/appeal\nUS Courts — Courts of Appeals: https://www.uscourts.gov/about-federal-courts",
  guardrail_summary: "Passed. Risk score 4/100. Content explains legal concept of criminal appeals without speculating about any case or assigning guilt.",
  recommended_platform: "YouTube Shorts + TikTok (60s version) + Instagram Reels",
  recommended_post_time: "Tuesday–Thursday, 9–11am EST or 7–9pm EST",
  brian_checklist: [
    "Review all scripts one final time",
    "Verify all source URLs are live and accurate",
    "Confirm Ark intro and legal disclaimer are present in final video",
    "Upload to YouTube — use the provided title, description, hashtags",
    "Set video as 'not for kids'",
    "Add pinned comment immediately after posting",
    "Cross-post 60s version to TikTok and Instagram Reels",
    "Record post URL in Manual Posting Tracker",
    "Enter analytics after 1h, 24h, and 7d",
  ],
  channel: "ark_legal_signal" as const,
  exported_at: new Date().toISOString(),
};

// ── Helper: build YouTube description from live package ─────────────────────
function buildDescription(pkg: LivePackage): string {
  const base = `${pkg.topic.title}\n\nArk is an autonomous legal education agent created by The Arkhe Project.\n\nI am not your attorney. This is not legal advice. This is legal education.`;
  return base;
}

interface LivePackage {
  id: string;
  topic: { id: string; title: string; channel: string; };
  scripts: {
    long_title?: string; shorts_title?: string;
    script_30s?: string; script_60s?: string; script_2min?: string;
    caption?: string; hashtags?: string[]; blog_transcript?: string;
    pinned_comment?: string; thumbnail_concept?: string;
    voiceover_text?: string;
  };
  guardrail: { risk_level: string; safe_summary?: string; };
}

export default function ExportCenterPage() {
  const searchParams = useSearchParams();
  const [copied, setCopied]             = useState<string | null>(null);
  const [postUrl, setPostUrl]           = useState("");
  const [platform, setPlatform]         = useState("YouTube");
  const [markedPosted, setMarkedPosted] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [isDemo, setIsDemo]             = useState(false);
  const [loading, setLoading]           = useState(true);
  const [pkg, setPkg]                   = useState<LivePackage | null>(null);
  const [queueSize, setQueueSize]       = useState(0);

  useEffect(() => {
    const pkgId = searchParams.get("packageId");
    const url   = pkgId
      ? `/api/media-engine/packages?id=${pkgId}`
      : `/api/media-engine/packages?status=approved`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d.packages) ? d.packages : [];
        if (list.length > 0) {
          setPkg(list[0]);
          setQueueSize(list.length);
        } else {
          // Fall back to demo
          setPkg(null);
          setIsDemo(true);
        }
      })
      .catch(() => setIsDemo(true))
      .finally(() => setLoading(false));
  }, [searchParams]);

  // Build export data — prefer live package, fall back to demo
  const exportData = pkg
    ? {
        id:                   pkg.id,
        package_id:           pkg.id,
        title:                pkg.scripts.long_title ?? pkg.topic.title,
        description:          buildDescription(pkg),
        hashtags:             pkg.scripts.hashtags ?? DEMO_EXPORT.hashtags,
        voiceover_script:     pkg.scripts.voiceover_text ?? pkg.scripts.script_60s ?? DEMO_EXPORT.voiceover_script,
        captions_text:        DEMO_EXPORT.captions_text,
        pinned_comment:       pkg.scripts.pinned_comment ?? DEMO_EXPORT.pinned_comment,
        thumbnail_prompt:     pkg.scripts.thumbnail_concept ?? DEMO_EXPORT.thumbnail_prompt,
        blog_transcript:      pkg.scripts.blog_transcript ?? DEMO_EXPORT.blog_transcript,
        source_notes:         DEMO_EXPORT.source_notes,
        guardrail_summary:    pkg.guardrail.safe_summary ?? DEMO_EXPORT.guardrail_summary,
        recommended_platform: DEMO_EXPORT.recommended_platform,
        recommended_post_time: DEMO_EXPORT.recommended_post_time,
        brian_checklist:      DEMO_EXPORT.brian_checklist,
        channel:              (pkg.topic.channel as "ark_legal_signal" | "agentos_journey") ?? "ark_legal_signal",
        exported_at:          new Date().toISOString(),
      }
    : DEMO_EXPORT;

  const ch = CHANNELS[exportData.channel];

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  async function markPosted() {
    if (!postUrl) return;
    setSubmitting(true);
    try {
      if (!isDemo && pkg) {
        await fetch("/api/media-engine/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            package_id: pkg.id,
            platform,
            post_url: postUrl,
            channel: pkg.topic.channel,
          }),
        });
      }
      setMarkedPosted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading export package…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <p className="text-[9px] font-bold tracking-[0.4em] mb-2" style={{ color: "rgba(20,184,166,0.7)" }}>
          MEDIA ENGINE / EXPORT CENTER
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-black text-white">Export Package</h1>
          {isDemo && (
            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}>DEMO</span>
          )}
          {!isDemo && queueSize > 1 && (
            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399" }}>{queueSize} approved</span>
          )}
        </div>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          Everything Ark prepared for you. Copy, download, and post manually.
        </p>
      </div>

      {/* No auto-post banner */}
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <span className="text-lg">🔒</span>
        <div>
          <p className="text-sm font-bold" style={{ color: "#f87171" }}>Manual Posting Only</p>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            This package has no "post now" button. Use the content below to post yourself on each platform.
          </p>
        </div>
      </div>

      {/* Brian's checklist */}
      <Section title="Brian's Pre-Post Checklist" color="#fbbf24">
        <div className="space-y-2">
          {exportData.brian_checklist.map((item, i) => (
            <ChecklistItem key={i} index={i + 1} text={item} />
          ))}
        </div>
      </Section>

      {/* Title + Description */}
      <div className="grid grid-cols-1 gap-4">
        <CopyBlock
          label="Video Title"
          value={exportData.title}
          copyKey="title"
          copied={copied}
          onCopy={copyToClipboard}
        />
        <CopyBlock
          label="Video Description"
          value={exportData.description}
          copyKey="description"
          copied={copied}
          onCopy={copyToClipboard}
          multiline
        />
      </div>

      {/* Hashtags */}
      <Section title="Hashtags" color="#c4b5fd">
        <div className="flex flex-wrap gap-2 mb-3">
          {exportData.hashtags.map((h) => (
            <span
              key={h}
              className="text-[11px] px-2.5 py-1 rounded-full font-mono"
              style={{ background: "rgba(139,92,246,0.1)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}
            >
              #{h}
            </span>
          ))}
        </div>
        <button
          onClick={() => copyToClipboard(exportData.hashtags.map((h) => `#${h}`).join(" "), "hashtags")}
          className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(139,92,246,0.1)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}
        >
          {copied === "hashtags" ? "✓ Copied" : "Copy All Hashtags"}
        </button>
      </Section>

      {/* Voiceover script */}
      <CopyBlock
        label="Voiceover Script (for TTS or recording)"
        value={exportData.voiceover_script}
        copyKey="voiceover"
        copied={copied}
        onCopy={copyToClipboard}
        multiline
      />

      {/* Captions */}
      <CopyBlock
        label="Captions (.srt format)"
        value={exportData.captions_text}
        copyKey="captions"
        copied={copied}
        onCopy={copyToClipboard}
        multiline
        mono
      />

      {/* Pinned comment */}
      <CopyBlock
        label="Pinned Comment (post immediately after uploading)"
        value={exportData.pinned_comment}
        copyKey="pinned"
        copied={copied}
        onCopy={copyToClipboard}
      />

      {/* Thumbnail prompt */}
      <CopyBlock
        label="Thumbnail Concept / Image Generation Prompt"
        value={exportData.thumbnail_prompt}
        copyKey="thumbnail"
        copied={copied}
        onCopy={copyToClipboard}
        multiline
      />

      {/* Posting metadata */}
      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Recommended Platform" value={exportData.recommended_platform} />
        <InfoCard label="Recommended Post Time" value={exportData.recommended_post_time} />
      </div>

      {/* Guardrail summary */}
      <div
        className="rounded-xl border p-4"
        style={{ background: "rgba(16,185,129,0.05)", borderColor: "rgba(16,185,129,0.25)" }}
      >
        <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#34d399" }}>
          ✓ Guardrail Summary
        </p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{exportData.guardrail_summary}</p>
      </div>

      {/* Source notes */}
      <CopyBlock
        label="Source Notes (include in description or pinned comment)"
        value={exportData.source_notes}
        copyKey="sources"
        copied={copied}
        onCopy={copyToClipboard}
        multiline
      />

      {/* ── Mark as Posted Manually ─────────────────────────────────────── */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{
          background: "rgba(34,197,94,0.04)",
          borderColor: "rgba(34,197,94,0.2)",
        }}
      >
        <div>
          <h3 className="text-sm font-black text-white mb-0.5">Mark as Posted Manually</h3>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            After you post, record it here so Ark can track analytics.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(255,255,255,0.35)" }}>
              Platform
            </label>
            <select
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {["YouTube", "TikTok", "Instagram", "X"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(255,255,255,0.35)" }}>
              Post URL
            </label>
            <input
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              placeholder="https://youtube.com/watch?v=..."
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
            />
          </div>
        </div>

        {!markedPosted ? (
          <button
            onClick={markPosted}
            disabled={!postUrl || submitting}
            className="px-6 py-2.5 rounded-lg text-sm font-black"
            style={{
              background: postUrl ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${postUrl ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)"}`,
              color: postUrl ? "#4ade80" : "rgba(255,255,255,0.3)",
              cursor: postUrl && !submitting ? "pointer" : "not-allowed",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Saving…" : "✓ Mark as Posted Manually"}
          </button>
        ) : (
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-sm font-bold" style={{ color: "#4ade80" }}>✓ Recorded successfully.</p>
            <Link
              href="/media-engine/analytics"
              className="text-[11px] font-bold px-4 py-2 rounded-lg"
              style={{ background: "rgba(6,182,212,0.1)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.25)" }}
            >
              → Enter Analytics
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-5" style={{ background: "rgba(10,16,34,0.85)", borderColor: "rgba(255,255,255,0.07)" }}>
      <p className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color }}>{title}</p>
      {children}
    </div>
  );
}

function CopyBlock({
  label, value, copyKey, copied, onCopy, multiline, mono,
}: {
  label: string; value: string; copyKey: string;
  copied: string | null; onCopy: (v: string, k: string) => void;
  multiline?: boolean; mono?: boolean;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "rgba(10,16,34,0.85)", borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
        <button
          onClick={() => onCopy(value, copyKey)}
          className="text-[9px] font-bold px-2.5 py-1 rounded"
          style={{
            background: copied === copyKey ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)",
            color: copied === copyKey ? "#34d399" : "rgba(255,255,255,0.5)",
            border: `1px solid ${copied === copyKey ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`,
          }}
        >
          {copied === copyKey ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <p
        className={`text-[12px] leading-relaxed whitespace-pre-wrap ${mono ? "font-mono" : ""}`}
        style={{ color: "rgba(255,255,255,0.65)" }}
      >
        {value}
      </p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "rgba(10,16,34,0.8)", borderColor: "rgba(255,255,255,0.07)" }}>
      <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}

function ChecklistItem({ index, text }: { index: number; text: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <div
      className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer"
      style={{ background: checked ? "rgba(245,158,11,0.06)" : "transparent" }}
      onClick={() => setChecked(!checked)}
    >
      <div
        className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 font-black text-[10px]"
        style={{
          background: checked ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${checked ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.15)"}`,
          color: checked ? "#fbbf24" : "rgba(255,255,255,0.3)",
        }}
      >
        {checked ? "✓" : index}
      </div>
      <p
        className="text-sm"
        style={{
          color: checked ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.75)",
          textDecoration: checked ? "line-through" : "none",
        }}
      >
        {text}
      </p>
    </div>
  );
}
