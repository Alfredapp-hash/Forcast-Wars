"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CHANNELS, LEGAL_ISSUE_LABELS, RISK_COLORS, STATUS_COLORS } from "@/lib/media-engine/constants";
import { GeneratedScripts, GuardrailReport, RiskLevel, Topic } from "@/lib/media-engine/types";

// ── Demo package ──────────────────────────────────────────────────────────────
const DEMO_TOPIC: Topic = {
  id: "1",
  title: "What Does an Appeal Actually Require?",
  summary: "Many people believe an appeal is a second trial. It is not. Ark explains what a criminal appeal actually requires, including preserved error and standard of review.",
  source_urls: ["https://law.cornell.edu/wex/appeal", "https://www.uscourts.gov/about-federal-courts/court-role-and-structure/about-us-courts-of-appeals"],
  source_notes: "Appeals courts review for legal error, not re-examine facts. Must have preserved error at trial. Standard of review varies by issue type.",
  attention_score: 9, urgency_score: 8, legal_issue: "appeal",
  channel: "ark_legal_signal", recommended_angle: "Preserved error + standard of review",
  risk_level: "low", status: "ready_for_brian", ark_reasoning: "High attention, zero speculation required.",
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

const DEMO_SCRIPTS: GeneratedScripts = {
  id: "s1", topic_id: "1",
  angles: [
    { id: "a0", title: "Appeals Are Not Retrials", description: "Explain that appeals review legal error, not re-examine facts.", attention_score: 9, legal_safety_score: 10, educational_value: 9, channel_fit: 10, ark_reasoning: "Highest misconception to correct. Fully educational. Zero factual speculation." },
    { id: "a1", title: "What Is Preserved Error?", description: "Why trial lawyers must object to preserve issues for appeal.", attention_score: 7, legal_safety_score: 10, educational_value: 9, channel_fit: 9, ark_reasoning: "Strong but narrower audience." },
    { id: "a2", title: "Standard of Review Explained", description: "De novo vs. abuse of discretion vs. clear error.", attention_score: 6, legal_safety_score: 10, educational_value: 10, channel_fit: 8, ark_reasoning: "Highly educational but lower attention hook." },
  ],
  chosen_angle_index: 0,
  shorts_title: "Appeals Are NOT Retrials — Here's What They Actually Are",
  long_title: "What Does a Criminal Appeal Actually Require? | Ark Legal Signal",
  script_30s: `Hello, I am Ark, an autonomous legal education agent created by The Arkhe Project. I am not here to decide the facts. I am here to explain the legal rule.\n\nMost people think an appeal is a second trial. It is not.\n\nAn appeal asks one question: did the trial court make a legal error that affected the outcome?\n\nThe facts are not re-examined. Witnesses are not recalled. New evidence is not admitted.\n\nAppellate courts only review what is already in the record — and only errors that were properly preserved at trial.\n\nI am not your attorney. This is not legal advice. This is legal education.`,
  script_60s: `Hello, I am Ark, an autonomous legal education agent created by The Arkhe Project. I am not here to decide the facts. I am here to explain the legal rule.\n\nIf you believe an appeal is a new trial — you are not alone. But that belief is wrong.\n\nA criminal appeal is not a do-over. It is a legal review.\n\nAppellate courts ask: did the trial court make a legal error? And if so, did that error affect the verdict?\n\nFor an issue to be reviewed on appeal, it must have been raised — or preserved — at trial. If a lawyer failed to object at the right moment, that issue may be waived forever.\n\nStandard of review determines how closely the appellate court looks. Legal questions get de novo review — fresh eyes. Factual findings are reviewed for clear error. Discretionary rulings get abuse of discretion.\n\nThis is why trial strategy matters so much. You are building the record for an appeal that may never happen — but might.\n\nI am not your attorney. This is not legal advice. This is legal education.`,
  script_2min: `Hello, I am Ark, an autonomous legal education agent created by The Arkhe Project. I am not here to decide the facts. I am here to explain the legal rule.\n\nLet's talk about criminal appeals — what they are, and what they are not.\n\nAn appeal is not a second trial. There are no witnesses. No jury. No new evidence. The appellate court reads a written brief and reviews the trial record.\n\nThe fundamental question is: did the trial court make a legal error — and if so, did that error change the outcome?\n\nFirst requirement: error must be preserved. During trial, if a lawyer does not object to a legal error at the right moment, that issue may be forfeited. The appellate court generally will not consider arguments that were not first raised below. This is why experienced trial lawyers object early and often — not just to slow things down, but to preserve the record.\n\nSecond requirement: the error must not be harmless. Even if there was an error, courts will affirm the conviction if the error was harmless — meaning it did not affect the verdict. A minor procedural mistake that had no real impact on the case does not automatically reverse a conviction.\n\nThird: standard of review matters. Questions of law are reviewed de novo — the appellate court decides the legal question fresh. Factual findings made by the jury are almost never overturned — the standard is highly deferential. Discretionary trial court decisions are reviewed for abuse of discretion, an even harder standard to meet.\n\nThis is why appeals are difficult. They are not about sympathy or what seems fair. They are about whether the legal process worked correctly.\n\nI am not your attorney. This is not legal advice. This is legal education. For specific legal questions, consult a licensed attorney in your jurisdiction.`,
  caption: "Most people think an appeal is a second trial. It's not. 🧑‍⚖️ Ark explains what an appeal actually requires. #LegalEducation #CriminalLaw #Appeal",
  hashtags: ["LegalEducation", "CriminalLaw", "Appeal", "ArkLegalSignal", "LawExplained", "KnowYourRights"],
  blog_transcript: `# What Does a Criminal Appeal Actually Require?\n\n*I am Ark, an autonomous legal education agent created by The Arkhe Project. This post is legal education only — not legal advice.*\n\n## The Core Misconception\n\nMost people believe that if someone loses at trial, they can simply appeal and get a new trial. This is incorrect.\n\nAn appeal is not a retrial. It is a legal review of whether the trial court made a legal error.\n\n## What Appellate Courts Actually Do\n\nAppellate courts read briefs and review the written trial record. They do not hear live witnesses. They do not consider new evidence.\n\nTheir sole task: did the lower court make a reversible legal error?\n\n## Three Requirements for a Successful Appeal\n\n### 1. The Error Must Be Preserved\nThe most common reason appeals fail is lack of preservation. If a lawyer did not object to a legal error at trial, that issue is usually waived. Appellate courts will not consider arguments raised for the first time on appeal.\n\n### 2. The Error Must Not Be Harmless\nEven a real legal error will not reverse a conviction if the court finds it was harmless — meaning it did not affect the outcome. Courts call this the harmless error doctrine.\n\n### 3. The Standard of Review Must Be Favorable\n- **Legal questions**: De novo (fresh review by the appellate court)\n- **Factual findings**: Clear error standard (very deferential — rare to overturn)\n- **Discretionary decisions**: Abuse of discretion (even harder to overcome)\n\n## Why This Matters\n\nUnderstanding what an appeal can and cannot do is essential for anyone following a high-profile criminal case.\n\nAppeals are about legal process — not about whether the verdict was just, popular, or surprising.\n\n---\n*I am not your attorney. This is not legal advice. This is legal education. Consult a licensed attorney for specific legal guidance.*\n\n*Sources: [Cornell LII — Appeal](https://law.cornell.edu/wex/appeal) | [US Courts — Courts of Appeals](https://www.uscourts.gov/about-federal-courts/court-role-and-structure/about-us-courts-of-appeals)*`,
  pinned_comment: "I am Ark, an autonomous legal education agent. Not your attorney. Not legal advice. Subscribe for more legal education from The Arkhe Project. 🏛️",
  thumbnail_concept: "Split graphic: left side — scales of justice labeled 'APPEAL' / right side — 'NOT A RETRIAL' in bold red. Ark logo bottom right. Dark background with cyan accent.",
  visual_sequence: [
    "Open on Ark avatar with animated intro",
    "Text overlay: 'An appeal is NOT a retrial'",
    "Animation showing trial court record → appellate court (no witnesses, no new evidence)",
    "Three-panel: preserved error | harmless error | standard of review",
    "Closing with disclaimer card and subscribe CTA",
  ],
  voiceover_text: `Hello, I am Ark, an autonomous legal education agent created by The Arkhe Project. I am not here to decide the facts. I am here to explain the legal rule. Most people think an appeal is a second trial. It is not. An appeal asks one question: did the trial court make a legal error that affected the outcome? The facts are not re-examined. Witnesses are not recalled. New evidence is not admitted. Appellate courts only review what is already in the record, and only errors that were properly preserved at trial. I am not your attorney. This is not legal advice. This is legal education.`,
  created_at: new Date().toISOString(),
};

const DEMO_GUARDRAIL: GuardrailReport = {
  id: "g1", script_id: "s1",
  approved_for_review: true,
  risk_score: 4,
  risk_level: "low",
  issues: [],
  required_fixes: [],
  safe_summary: "Content explains the legal concept of criminal appeals including preserved error and standard of review without speculating about any specific case or assigning guilt.",
  recommended_revision: "",
  reviewed_at: new Date().toISOString(),
};

type ApprovalAction = "approve" | "reject" | "revise" | "save_for_later" | "mark_too_risky";

interface LivePackage {
  id: string;
  package_status: string;
  topic: Topic;
  scripts: GeneratedScripts;
  guardrail: GuardrailReport;
}

export default function ApprovalsPage() {
  const [activeTab, setActiveTab]   = useState<"30s" | "60s" | "2min" | "blog" | "angles">("60s");
  const [action, setAction]         = useState<ApprovalAction | null>(null);
  const [notes, setNotes]           = useState("");
  const [confirming, setConfirming] = useState(false);
  const [actionDone, setActionDone] = useState(false);

  // Live package data — falls back to demo if Supabase not configured
  const [packages, setPackages]     = useState<LivePackage[]>([]);
  const [activeIdx, setActiveIdx]   = useState(0);
  const [loadingPkgs, setLoadingPkgs] = useState(true);
  const [isDemo, setIsDemo]         = useState(false);

  useEffect(() => {
    fetch("/api/media-engine/packages?status=ready_for_brian")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.packages) && d.packages.length > 0) {
          setPackages(d.packages);
        } else {
          setPackages([{ id: "demo", package_status: "ready_for_brian", topic: DEMO_TOPIC, scripts: DEMO_SCRIPTS, guardrail: DEMO_GUARDRAIL }]);
          setIsDemo(true);
        }
      })
      .catch(() => {
        setPackages([{ id: "demo", package_status: "ready_for_brian", topic: DEMO_TOPIC, scripts: DEMO_SCRIPTS, guardrail: DEMO_GUARDRAIL }]);
        setIsDemo(true);
      })
      .finally(() => setLoadingPkgs(false));
  }, []);

  const pkg      = packages[activeIdx];
  const topic    = pkg?.topic    ?? DEMO_TOPIC;
  const scripts  = pkg?.scripts  ?? DEMO_SCRIPTS;
  const guardrail = pkg?.guardrail ?? DEMO_GUARDRAIL;
  const channel  = CHANNELS[topic.channel];
  const riskC    = RISK_COLORS[guardrail.risk_level as RiskLevel];

  const scriptTabs = {
    "30s":  scripts.script_30s,
    "60s":  scripts.script_60s,
    "2min": scripts.script_2min,
    blog:   scripts.blog_transcript,
  } as const;

  async function submitAction() {
    if (!action || !pkg) return;
    setConfirming(true);
    try {
      if (!isDemo) {
        await fetch(`/api/media-engine/packages/${pkg.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, notes }),
        });
        // Remove from queue
        setPackages((prev) => prev.filter((_, i) => i !== activeIdx));
        setActiveIdx(0);
      }
      setActionDone(true);
      setAction(null);
      setNotes("");
    } finally {
      setConfirming(false);
    }
  }

  if (loadingPkgs) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading approval queue…</p>
      </div>
    );
  }

  if (packages.length === 0 || actionDone) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-3xl">✓</p>
        <h2 className="text-xl font-black text-white">Queue is clear</h2>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>All packages have been reviewed. Ark will produce more when new topics are selected.</p>
        <Link href="/media-engine" className="text-[11px] font-bold px-4 py-2 rounded-lg" style={{ background: "rgba(6,182,212,0.1)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.25)" }}>← Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <p className="text-[9px] font-bold tracking-[0.4em] mb-2" style={{ color: "#fbbf24" }}>
          ★ READY FOR BRIAN — APPROVAL QUEUE
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-black text-white">Review Package</h1>
          <span
            className="text-[9px] font-black px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.35)",
              color: "#fbbf24",
            }}
          >
            {packages.length} in queue
          </span>
          {isDemo && (
            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}>
              DEMO
            </span>
          )}
        </div>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          Ark has produced this package. Your decision is the only gate before export.
        </p>
      </div>

      {/* Queue selector — shown when multiple packages waiting */}
      {packages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {packages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => { setActiveIdx(i); setAction(null); setNotes(""); }}
              className="shrink-0 px-3 py-2 rounded-lg text-[11px] font-bold text-left"
              style={{
                background: i === activeIdx ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${i === activeIdx ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: i === activeIdx ? "#fbbf24" : "rgba(255,255,255,0.45)",
                maxWidth: "200px",
              }}
            >
              <div className="truncate">{p.topic?.title ?? `Package ${i + 1}`}</div>
            </button>
          ))}
        </div>
      )}

      {/* Topic card */}
      <div
        className="rounded-2xl border p-5"
        style={{
          background: "rgba(10,16,34,0.95)",
          borderColor: "rgba(245,158,11,0.3)",
          boxShadow: "0 0 40px rgba(245,158,11,0.06)",
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded"
                style={{ background: `${channel.color}18`, color: channel.color, border: `1px solid ${channel.color}30` }}
              >
                {channel.name}
              </span>
              {topic.legal_issue && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {LEGAL_ISSUE_LABELS[topic.legal_issue]}
                </span>
              )}
              <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: riskC.bg, color: riskC.text, border: `1px solid ${riskC.border}` }}>
                Risk: {topic.risk_level}
              </span>
            </div>
            <h2 className="text-lg font-black text-white">{topic.title}</h2>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>{topic.summary}</p>
          </div>
          <div className="flex gap-4 shrink-0">
            <Stat label="Attention" value={`${topic.attention_score}/10`} color="#06b6d4" />
            <Stat label="Urgency"   value={`${topic.urgency_score}/10`}   color="#8b5cf6" />
          </div>
        </div>

        {/* Sources */}
        {topic.source_urls.length > 0 && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Sources</p>
            {topic.source_urls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer"
                className="block text-[11px] underline truncate"
                style={{ color: "#67e8f9" }}>{url}</a>
            ))}
          </div>
        )}
      </div>

      {/* Guardrail report */}
      <div
        className="rounded-xl border p-4"
        style={{
          background: guardrail.approved_for_review ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.08)",
          borderColor: guardrail.approved_for_review ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.35)",
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-black" style={{ color: guardrail.approved_for_review ? "#34d399" : "#f87171" }}>
            {guardrail.approved_for_review ? "✓ GUARDRAIL PASSED" : "✗ GUARDRAIL FLAGGED"}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: riskC.bg, color: riskC.text, border: `1px solid ${riskC.border}` }}>
            Risk Score: {guardrail.risk_score}/100 — {guardrail.risk_level}
          </span>
        </div>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{guardrail.safe_summary}</p>
        {guardrail.issues.length > 0 && (
          <ul className="mt-2 space-y-1">
            {guardrail.issues.map((issue, i) => (
              <li key={i} className="text-[11px]" style={{ color: "#fb923c" }}>⚠ {issue}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Ark's recommended angle */}
      <div className="rounded-xl border p-4" style={{ background: "rgba(139,92,246,0.05)", borderColor: "rgba(139,92,246,0.2)" }}>
        <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#c4b5fd" }}>Ark's Recommended Angle</p>
        <p className="text-sm text-white font-semibold">{scripts.angles[scripts.chosen_angle_index].title}</p>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>{scripts.angles[scripts.chosen_angle_index].ark_reasoning}</p>
      </div>

      {/* Script tabs */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(10,16,34,0.9)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {(["angles", "30s", "60s", "2min", "blog"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider"
              style={{
                color: activeTab === tab ? "#06b6d4" : "rgba(255,255,255,0.35)",
                borderBottom: activeTab === tab ? "2px solid #06b6d4" : "2px solid transparent",
                background: activeTab === tab ? "rgba(6,182,212,0.05)" : "transparent",
              }}
            >
              {tab === "blog" ? "Blog" : tab === "angles" ? "Angles" : tab}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "angles" ? (
            <div className="space-y-3">
              {scripts.angles.map((a, i) => (
                <div key={a.id} className="p-3 rounded-lg border"
                  style={{
                    background: i === scripts.chosen_angle_index ? "rgba(6,182,212,0.06)" : "rgba(255,255,255,0.02)",
                    borderColor: i === scripts.chosen_angle_index ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.07)",
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    {i === scripts.chosen_angle_index && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(6,182,212,0.15)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.3)" }}>
                        ARK PICK
                      </span>
                    )}
                    <span className="text-sm font-bold text-white">{a.title}</span>
                  </div>
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>{a.description}</p>
                  <div className="flex gap-3 mt-2">
                    {(["attention_score","legal_safety_score","educational_value","channel_fit"] as const).map((k) => (
                      <div key={k} className="text-center">
                        <div className="text-[10px] font-black font-mono" style={{ color: "#06b6d4" }}>{a[k]}</div>
                        <div className="text-[7px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>{k.replace(/_/g," ").replace("score","")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <pre className="text-[12px] leading-relaxed whitespace-pre-wrap font-sans" style={{ color: "rgba(255,255,255,0.75)" }}>
              {scriptTabs[activeTab as keyof typeof scriptTabs]}
            </pre>
          )}
        </div>
      </div>

      {/* Export metadata preview */}
      <div className="grid grid-cols-2 gap-4">
        <MetaCard label="Shorts Title"   value={scripts.shorts_title} />
        <MetaCard label="Long Title"     value={scripts.long_title} />
        <MetaCard label="Caption"        value={scripts.caption} />
        <MetaCard label="Pinned Comment" value={scripts.pinned_comment} />
        <MetaCard label="Thumbnail"      value={scripts.thumbnail_concept} />
        <div className="rounded-xl border p-4" style={{ background: "rgba(10,16,34,0.8)", borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Hashtags</p>
          <div className="flex flex-wrap gap-1">
            {scripts.hashtags.map((h) => (
              <span key={h} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.1)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.2)" }}>
                #{h}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── APPROVAL ACTIONS ──────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{
          background: "rgba(245,158,11,0.04)",
          borderColor: "rgba(245,158,11,0.3)",
          boxShadow: "0 0 40px rgba(245,158,11,0.04)",
        }}
      >
        <div>
          <h3 className="text-sm font-black text-white mb-0.5">Your Decision</h3>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            This is your control gate. Ark cannot publish anything without your approval and manual action.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            { key: "approve",        label: "Approve",         color: "#34d399", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.35)" },
            { key: "reject",         label: "Reject",          color: "#f87171", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.35)"  },
            { key: "revise",         label: "Request Revision", color: "#fb923c", bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.35)" },
            { key: "save_for_later", label: "Save for Later",  color: "#94a3b8", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.3)" },
            { key: "mark_too_risky", label: "Mark Too Risky",  color: "#fca5a5", bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.5)"   },
          ] as const).map((btn) => (
            <button
              key={btn.key}
              onClick={() => setAction(btn.key)}
              className="px-4 py-2 rounded-lg text-[12px] font-bold transition-all"
              style={{
                background: action === btn.key ? btn.bg : "rgba(255,255,255,0.04)",
                border: `1px solid ${action === btn.key ? btn.border : "rgba(255,255,255,0.1)"}`,
                color: action === btn.key ? btn.color : "rgba(255,255,255,0.5)",
                boxShadow: action === btn.key ? `0 0 16px ${btn.bg}` : undefined,
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {action && (
          <>
            <textarea
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
              rows={3}
              placeholder={action === "revise" ? "What should Ark revise? Be specific." : "Optional notes…"}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button
              onClick={submitAction}
              disabled={confirming}
              className="px-6 py-2.5 rounded-lg text-sm font-black"
              style={{
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.4)",
                color: "#fbbf24",
              }}
            >
              {confirming ? "Recording…" : `Confirm: ${action.replace(/_/g, " ").toUpperCase()}`}
            </button>
          </>
        )}
      </div>

      {/* No auto-post reminder */}
      <div
        className="rounded-xl p-4 text-center"
        style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}
      >
        <p className="text-[11px] font-bold" style={{ color: "rgba(248,113,113,0.6)" }}>
          After approval → use Export Center to get the posting package → post manually on each platform.
          <br />This system has no "Post Now" button. Publishing is always your action.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-black font-mono" style={{ color }}>{value}</div>
      <div className="text-[8px] uppercase tracking-widest mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "rgba(10,16,34,0.8)", borderColor: "rgba(255,255,255,0.07)" }}>
      <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>
      <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{value}</p>
    </div>
  );
}
