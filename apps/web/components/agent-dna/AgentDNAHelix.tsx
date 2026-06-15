"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AgentNodeData, AgentType, HelixSegment, statusStyles } from "./types";
import { sampleAgents } from "./sampleAgents";
import { AgentNode } from "./AgentNode";
import { AgentTooltip } from "./AgentTooltip";
import { AgentDetailCard } from "./AgentDetailCard";
import { MessageParticles } from "./MessageParticles";
import { HelixCanvas, HELIX_W, HELIX_H } from "./HelixCanvas";
import { AgentCommunicationParticles, AgentMessage, AgentPosition } from "./AgentCommunicationParticles";

const TOTAL_SEGMENTS = 18;

// Hermes (type:"system") is the center core. All other agents sort onto two strands.
const STRAND_A: AgentType[] = ["core", "memory", "voice", "planner", "analytics", "scheduler"];
const STRAND_B: AgentType[] = ["content", "finance", "browser", "code"];

const HUD_LABELS = [
  { text: "OPS — INTEL",    x: 26,  y: 64,  drift: 0   },
  { text: "OUTPUT — BUILD", x: 576, y: 64,  drift: 0.6 },
  { text: "MEMORY",         x: 26,  y: 210, drift: 1.0 },
  { text: "CONTENT",        x: 584, y: 195, drift: 0.4 },
  { text: "FINANCE",        x: 584, y: 370, drift: 0.8 },
  { text: "CORE",           x: 26,  y: 360, drift: 1.4 },
];

function CornerAccent({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const size = 28;
  const isBR = pos[0] === "b";
  const isR  = pos[1] === "r";
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        top:    isBR ? undefined : 0,
        bottom: isBR ? 0 : undefined,
        left:   isR  ? undefined : 0,
        right:  isR  ? 0 : undefined,
        width: size,
        height: size,
        borderTop:    isBR ? undefined : "1px solid rgba(6,182,212,0.45)",
        borderBottom: isBR ? "1px solid rgba(6,182,212,0.45)" : undefined,
        borderLeft:   isR  ? undefined : "1px solid rgba(6,182,212,0.45)",
        borderRight:  isR  ? "1px solid rgba(6,182,212,0.45)" : undefined,
        borderTopLeftRadius:     pos === "tl" ? 32 : 0,
        borderTopRightRadius:    pos === "tr" ? 32 : 0,
        borderBottomLeftRadius:  pos === "bl" ? 32 : 0,
        borderBottomRightRadius: pos === "br" ? 32 : 0,
      }}
    />
  );
}

// ── Hermes center node ───────────────────────────────────────────────────────
function HermesNode({ agent, reducedMotion, isSelected, onHoverStart, onHoverEnd, onClick }: {
  agent: AgentNodeData; reducedMotion: boolean; isSelected: boolean;
  onHoverStart: () => void; onHoverEnd: () => void; onClick: () => void;
}) {
  const S = 62;
  return (
    <div className="absolute" style={{ left: HELIX_W/2, top: HELIX_H/2, transform: "translate(-50%,-50%)", zIndex: 200, cursor: "pointer" }}
      onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd} onClick={onClick}>
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ width: S*5.5, height: S*5.5, left: -(S*5.5-S)/2, top: -(S*5.5-S)/2,
          background: "radial-gradient(ellipse, rgba(6,182,212,0.055) 0%, transparent 65%)" }}
        animate={reducedMotion ? {} : { scale: [1,1.08,1], opacity: [0.5,1,0.5] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ width: S*3.2, height: S*3.2, left: -(S*3.2-S)/2, top: -(S*3.2-S)/2,
          border: "1px solid rgba(6,182,212,0.22)", boxShadow: "0 0 10px rgba(6,182,212,0.06)" }}
        animate={reducedMotion ? {} : { rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }} />
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ width: S*2.1, height: S*2.1, left: -(S*2.1-S)/2, top: -(S*2.1-S)/2,
          border: "1px dashed rgba(139,92,246,0.28)" }}
        animate={reducedMotion ? {} : { rotate: -360 }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }} />
      {isSelected && (
        <div className="absolute rounded-full pointer-events-none" style={{ width: S+18, height: S+18, left: -9, top: -9,
          border: "2px solid rgba(6,182,212,0.75)",
          boxShadow: "0 0 24px rgba(6,182,212,0.35), 0 0 48px rgba(6,182,212,0.15)" }} />
      )}
      <div style={{ width: S, height: S, borderRadius: "50%",
        background: "radial-gradient(ellipse at 36% 30%, rgba(6,182,212,0.55) 0%, rgba(139,92,246,0.32) 40%, rgba(4,6,16,0.97) 100%)",
        border: "2px solid rgba(6,182,212,0.8)",
        boxShadow: "0 0 36px rgba(6,182,212,0.48), 0 0 72px rgba(6,182,212,0.24), 0 0 130px rgba(139,92,246,0.18), inset 0 1px 20px rgba(6,182,212,0.14)",
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <div className="absolute pointer-events-none" style={{ top: "13%", left: "20%", width: "42%", height: "20%",
          borderRadius: "50%", background: "rgba(255,255,255,0.22)", filter: "blur(3px)" }} />
        <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.14em", color: "rgba(255,255,255,0.97)",
          textShadow: "0 0 16px rgba(6,182,212,1), 0 0 32px rgba(6,182,212,0.55)", position: "relative", zIndex: 1 }}>
          HERMES
        </span>
      </div>
      <div className="absolute pointer-events-none select-none" style={{ top: S+8, left: "50%", transform: "translateX(-50%)",
        fontSize: 7, fontWeight: 900, letterSpacing: "0.2em", color: "rgba(6,182,212,0.45)", whiteSpace: "nowrap" }}>
        MESSAGE CORE
      </div>
    </div>
  );
}

export function AgentDNAHelix({
  agents = sampleAgents,
  mode = "dashboard",
  messages = [],
  onPositionsUpdate,
}: {
  agents?: AgentNodeData[];
  mode?: "dashboard" | "demo" | "marketing";
  messages?: AgentMessage[];
  onPositionsUpdate?: (positions: AgentPosition[]) => void;
}) {
  const reducedMotion = useReducedMotion() ?? false;

  const [segments, setSegments]   = useState<HelixSegment[]>([]);
  const [hoveredId, setHoveredId]   = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSegments = useCallback((segs: HelixSegment[]) => setSegments(segs), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Hermes extraction + strand sort ──────────────────────────────────────
  const hermesAgent  = agents.find((a) => a.type === "system" || a.id === "hermes") ?? null;
  const helixAgents  = agents.filter((a) => a.type !== "system" && a.id !== "hermes");

  const strandA = helixAgents
    .filter((a) => STRAND_A.includes(a.type as AgentType))
    .sort((a, b) => STRAND_A.indexOf(a.type as AgentType) - STRAND_A.indexOf(b.type as AgentType));
  const strandB = helixAgents
    .filter((a) => STRAND_B.includes(a.type as AgentType))
    .sort((a, b) => STRAND_B.indexOf(a.type as AgentType) - STRAND_B.indexOf(b.type as AgentType));

  const classified  = new Set([...strandA, ...strandB].map((a) => a.id));
  const strandAFull = [...strandA, ...helixAgents.filter((a) => !classified.has(a.id))];

  const agentPlacements: Array<{ agent: AgentNodeData; x: number; y: number; depth: number; strand: "A"|"B" }> =
    segments.length > 0 ? [
      ...strandAFull.map((agent, i) => {
        const segIdx = Math.min(Math.floor((i / Math.max(strandAFull.length, 1)) * TOTAL_SEGMENTS), TOTAL_SEGMENTS - 1);
        const seg = segments[segIdx];
        return { agent, x: seg.x1, y: seg.y, depth: seg.depth1, strand: "A" as const };
      }),
      ...strandB.map((agent, i) => {
        const segIdx = Math.min(Math.floor((i / Math.max(strandB.length, 1)) * TOTAL_SEGMENTS), TOTAL_SEGMENTS - 1);
        const seg = segments[segIdx];
        return { agent, x: seg.x2, y: seg.y, depth: seg.depth2, strand: "B" as const };
      }),
    ] : [];

  // Build pixel position map for directed particles
  const agentPositions: AgentPosition[] = [
    ...(hermesAgent ? [{ id: hermesAgent.id, x: HELIX_W / 2, y: HELIX_H / 2 }] : []),
    ...agentPlacements.map((p) => ({ id: p.agent.id, x: p.x, y: p.y })),
  ];

  // Notify parent when positions update (for live event routing)
  useEffect(() => {
    if (agentPositions.length > 1) onPositionsUpdate?.(agentPositions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments]);

  const allAgents     = hermesAgent ? [hermesAgent, ...helixAgents] : helixAgents;
  const activeCount   = allAgents.filter((a) => a.status === "active").length;
  const revenueCount  = allAgents.filter((a) => a.revenueLinked).length;
  const totalCost     = allAgents.reduce((s, a) => s + (a.costPerHour ?? 0), 0);
  const thinkingCount = allAgents.filter((a) => a.status === "thinking").length;

  const hoveredAgent     = allAgents.find((a) => a.id === hoveredId) ?? null;
  const selectedAgent    = allAgents.find((a) => a.id === selectedId) ?? null;
  const hoveredPlacement = agentPlacements.find((p) => p.agent.id === hoveredId);
  const isHermesHovered  = hoveredId === hermesAgent?.id;

  const handleNodeClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setHoveredId(null);
  }, []);

  return (
    <div
      className="relative w-full"
      style={{ maxWidth: 900, margin: "0 auto" }}
      onClick={() => setSelectedId(null)}
    >
      {/* ── Main card ─────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          borderRadius: 32,
          background: "linear-gradient(168deg, rgba(10,16,34,0.98) 0%, rgba(5,8,18,1) 100%)",
          border: "1px solid rgba(255,255,255,0.065)",
          boxShadow: `
            0 0 0 1px rgba(6,182,212,0.05),
            0 0 80px rgba(6,182,212,0.09),
            0 0 160px rgba(139,92,246,0.07),
            0 40px 100px rgba(0,0,0,0.75)
          `,
        }}
      >
        {/* Corner chrome accents */}
        <CornerAccent pos="tl" />
        <CornerAccent pos="tr" />
        <CornerAccent pos="bl" />
        <CornerAccent pos="br" />

        {/* Top edge cyan glow line */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: 1,
            borderRadius: "32px 32px 0 0",
            background: "linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.5) 30%, rgba(139,92,246,0.4) 70%, transparent 100%)",
          }}
        />

        {/* Background: radial glows + fine grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 55% 45% at 50% 25%, rgba(6,182,212,0.055) 0%, transparent 70%),
              radial-gradient(ellipse 45% 55% at 50% 75%, rgba(139,92,246,0.045) 0%, transparent 70%),
              linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "100% 100%, 100% 100%, 36px 36px, 36px 36px",
          }}
        />

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div className="relative z-10 flex items-start justify-between px-8 pt-7 pb-3">
          <div>
            <p className="text-[9px] font-bold tracking-[0.4em] text-slate-600 mb-1.5">
              ARKHE / AGENTOS
            </p>
            <h2 className="text-xl font-black text-white tracking-tight leading-none">
              AGENT OPERATING NETWORK
            </h2>
            <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
              Hermes core · {strandAFull.length} ops · {strandB.length} output agents
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <motion.span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#34d399", boxShadow: "0 0 8px #34d399" }}
                animate={reducedMotion ? {} : { opacity: [1, 0.25, 1] }}
                transition={{ duration: 2.2, repeat: Infinity }}
              />
              <span
                className="text-[9px] font-black tracking-[0.25em] px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.28)",
                  color: "#34d399",
                }}
              >
                RUNTIME ONLINE
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-px" style={{ background: "#06b6d4", boxShadow: "0 0 4px #06b6d4" }} />
                <span className="text-[8px] text-slate-600 tracking-widest">OPS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(6,182,212,0.8)", boxShadow: "0 0 6px #06b6d4" }} />
                <span className="text-[8px] text-slate-600 tracking-widest">HERMES</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-px" style={{ background: "#8b5cf6", boxShadow: "0 0 4px #8b5cf6" }} />
                <span className="text-[8px] text-slate-600 tracking-widest">OUTPUT</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── HELIX AREA ──────────────────────────────────────────────── */}
        <div
          className="relative"
          style={{ height: HELIX_H }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Canvas layer — helix geometry */}
          <div
            className="absolute pointer-events-none"
            style={{ left: "50%", transform: "translateX(-50%)", width: HELIX_W, height: HELIX_H }}
          >
            <HelixCanvas reducedMotion={reducedMotion} onSegments={handleSegments} />
          </div>

          {/* Ambient particle layer */}
          <div
            className="absolute pointer-events-none"
            style={{ left: "50%", transform: "translateX(-50%)", width: HELIX_W, height: HELIX_H }}
          >
            <MessageParticles segments={segments} reducedMotion={reducedMotion} />
          </div>

          {/* Directed agent-to-agent communication particles */}
          <div
            className="absolute pointer-events-none"
            style={{ left: "50%", transform: "translateX(-50%)", width: HELIX_W, height: HELIX_H }}
          >
            <AgentCommunicationParticles
              agentPositions={agentPositions}
              messages={messages}
              canvasWidth={HELIX_W}
              canvasHeight={HELIX_H}
              reducedMotion={reducedMotion}
            />
          </div>

          {/* HUD labels */}
          {HUD_LABELS.map((label) => (
            <motion.div
              key={label.text}
              className="absolute pointer-events-none select-none"
              style={{ left: label.x, top: label.y }}
              animate={reducedMotion ? {} : { y: [0, -4 - label.drift * 1.5, 0], opacity: [0.18, 0.28, 0.18] }}
              transition={{ duration: 5 + label.drift, repeat: Infinity, ease: "easeInOut", delay: label.drift * 0.5 }}
            >
              <span className="text-[8px] font-black tracking-[0.28em] text-slate-600">
                {label.text}
              </span>
            </motion.div>
          ))}

          {/* Connection lines: Hermes → agents */}
          <svg className="absolute pointer-events-none"
            style={{ left: "50%", transform: "translateX(-50%)", width: HELIX_W, height: HELIX_H }}>
            {agentPlacements.map((p) => {
              const n = (p.depth + 1) / 2;
              const color = statusStyles[p.agent.status].glowHex;
              return (
                <line key={`conn-${p.agent.id}`}
                  x1={HELIX_W / 2} y1={HELIX_H / 2} x2={p.x} y2={p.y}
                  stroke={color} strokeWidth={0.5 + n * 0.9}
                  strokeOpacity={0.07 + n * 0.13} strokeDasharray="3 9" />
              );
            })}
          </svg>

          {/* Nodes layer */}
          <div className="absolute pointer-events-none"
            style={{ left: "50%", transform: "translateX(-50%)", width: HELIX_W, height: HELIX_H }}>
            {agentPlacements.map((p, i) => (
              <div key={p.agent.id} className="pointer-events-auto">
                <AgentNode agent={p.agent} x={p.x} y={p.y} depth={p.depth}
                  isSelected={selectedId === p.agent.id} reducedMotion={reducedMotion} tabIndex={i + 1}
                  onHoverStart={() => { if (!selectedId) setHoveredId(p.agent.id); }}
                  onHoverEnd={() => setHoveredId(null)}
                  onClick={() => handleNodeClick(p.agent.id)} />
              </div>
            ))}

            {hermesAgent && (
              <div className="pointer-events-auto">
                <HermesNode agent={hermesAgent} reducedMotion={reducedMotion}
                  isSelected={selectedId === hermesAgent.id}
                  onHoverStart={() => { if (!selectedId) setHoveredId(hermesAgent.id); }}
                  onHoverEnd={() => setHoveredId(null)}
                  onClick={() => handleNodeClick(hermesAgent.id)} />
              </div>
            )}

            <AnimatePresence>
              {hoveredAgent && !selectedId && (
                <AgentTooltip agent={hoveredAgent}
                  x={isHermesHovered ? HELIX_W/2 : (hoveredPlacement?.x ?? HELIX_W/2)}
                  y={isHermesHovered ? HELIX_H/2 : (hoveredPlacement?.y ?? HELIX_H/2)}
                  containerWidth={HELIX_W} />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── BOTTOM METRICS ──────────────────────────────────────────── */}
        <div
          className="relative z-10 px-8 py-5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          {/* Metric separator line */}
          <div
            className="absolute top-0 left-8 right-8 pointer-events-none"
            style={{
              height: 1,
              background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.2) 30%, rgba(139,92,246,0.2) 70%, transparent)",
            }}
          />
          <div className="grid grid-cols-4 gap-4">
            <MetricCell label="Active"       value={activeCount}           color="#06b6d4" />
            <MetricCell label="Thinking"     value={thinkingCount}         color="#8b5cf6" />
            <MetricCell label="Rev. Linked"  value={revenueCount}          color="#10b981" />
            <MetricCell label="Cost / hr"    value={`$${totalCost.toFixed(2)}`} color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* ── Floating detail card ─────────────────────────────────────── */}
      <AnimatePresence>
        {selectedAgent && (
          <div
            className="absolute top-4 right-0 z-50"
            style={{ transform: "translateX(calc(100% + 20px))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <AgentDetailCard
              agent={selectedAgent}
              allAgents={allAgents}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Metric cell ──────────────────────────────────────────────────────────────
function MetricCell({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="text-center">
      <p
        className="text-2xl font-black font-mono tabular-nums"
        style={{ color, textShadow: `0 0 24px ${color}66` }}
      >
        {value}
      </p>
      <p className="text-[9px] text-slate-600 tracking-[0.2em] uppercase mt-0.5">
        {label}
      </p>
    </div>
  );
}
