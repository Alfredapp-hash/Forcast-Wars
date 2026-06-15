"use client";

// ─────────────────────────────────────────────────────────────────────────────
// AgentCommunicationParticles
// Draws directed particles traveling from one specific agent node to another.
// Each particle represents a REAL message event in the Arkhe pipeline.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";

export interface AgentMessage {
  id: string;
  fromId: string;
  toId: string;
  color: string;
  label: string;
  startTime: number;   // performance.now() when spawned
  duration: number;    // ms — how long the particle travels
}

export interface AgentPosition {
  id: string;
  x: number;
  y: number;
}

interface Props {
  agentPositions: AgentPosition[];
  messages: AgentMessage[];
  canvasWidth: number;
  canvasHeight: number;
  reducedMotion: boolean;
}

const TRAIL_LENGTH = 7;

export function AgentCommunicationParticles({
  agentPositions, messages, canvasWidth, canvasHeight, reducedMotion,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);

  // Build position lookup
  const posMap = useRef<Record<string, AgentPosition>>({});
  useEffect(() => {
    posMap.current = Object.fromEntries(agentPositions.map((p) => [p.id, p]));
  }, [agentPositions]);

  const msgsRef = useRef<AgentMessage[]>([]);
  useEffect(() => { msgsRef.current = messages; }, [messages]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function tick() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = performance.now();

      for (const msg of msgsRef.current) {
        const from = posMap.current[msg.fromId];
        const to   = posMap.current[msg.toId];
        if (!from || !to) continue;

        const elapsed = now - msg.startTime;
        const raw = Math.min(elapsed / msg.duration, 1);
        // Ease in-out cubic
        const t = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;

        // Main particle position
        const px = from.x + (to.x - from.x) * t;
        const py = from.y + (to.y - from.y) * t;

        // Fade: ramp up first 15%, full from 15-80%, fade out last 20%
        let alpha = 1;
        if (raw < 0.15) alpha = raw / 0.15;
        else if (raw > 0.80) alpha = 1 - (raw - 0.80) / 0.20;

        // ── Trail dots (behind the particle) ──────────────────────────────
        for (let i = TRAIL_LENGTH; i >= 1; i--) {
          const trailT = Math.max(0, t - i * 0.04);
          const tx = from.x + (to.x - from.x) * trailT;
          const ty = from.y + (to.y - from.y) * trailT;
          const trailAlpha = alpha * (1 - i / TRAIL_LENGTH) * 0.45;
          const trailR = 2.5 * (1 - i / TRAIL_LENGTH);

          ctx.beginPath();
          ctx.arc(tx, ty, trailR, 0, Math.PI * 2);
          ctx.fillStyle = hexWithAlpha(msg.color, trailAlpha);
          ctx.fill();
        }

        // ── Connection beam (faint line between nodes) ───────────────────
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = hexWithAlpha(msg.color, 0.06 * alpha);
        ctx.lineWidth = 1;
        ctx.stroke();

        // ── Main glow ────────────────────────────────────────────────────
        const glowR = 14;
        const glow = ctx.createRadialGradient(px, py, 0, px, py, glowR);
        glow.addColorStop(0, hexWithAlpha(msg.color, 0.6 * alpha));
        glow.addColorStop(0.4, hexWithAlpha(msg.color, 0.25 * alpha));
        glow.addColorStop(1, hexWithAlpha(msg.color, 0));
        ctx.beginPath();
        ctx.arc(px, py, glowR, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // ── Core dot ─────────────────────────────────────────────────────
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = hexWithAlpha("#ffffff", 0.85 * alpha);
        ctx.fill();

        // ── Reception burst when particle arrives (t > 0.88) ─────────────
        if (raw > 0.88) {
          const burstAlpha = alpha * ((raw - 0.88) / 0.12) * 0.7;
          const burstR = 6 + (raw - 0.88) / 0.12 * 18;
          const burst = ctx.createRadialGradient(to.x, to.y, 0, to.x, to.y, burstR);
          burst.addColorStop(0, hexWithAlpha(msg.color, burstAlpha));
          burst.addColorStop(1, hexWithAlpha(msg.color, 0));
          ctx.beginPath();
          ctx.arc(to.x, to.y, burstR, 0, Math.PI * 2);
          ctx.fillStyle = burst;
          ctx.fill();
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      width={canvasWidth}
      height={canvasHeight}
    />
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const byte = Math.round(a * 255).toString(16).padStart(2, "0");
  return `${hex}${byte}`;
}

// ── Pipeline event definitions ────────────────────────────────────────────────
// Maps each production stage to a from→to agent pair + color + label.

export interface PipelineEvent {
  fromId: string;
  toId: string;
  color: string;
  label: string;
  durationMs: number;
}

export const PIPELINE_EVENTS: Record<string, PipelineEvent> = {
  // Scout finds a topic → reports to Hermes
  topic_discovered: {
    fromId: "ark-scout", toId: "hermes",
    color: "#06b6d4", label: "Topic discovered",
    durationMs: 1600,
  },
  // Hermes routes to Classifier
  classify_request: {
    fromId: "hermes", toId: "ark-classifier",
    color: "#06b6d4", label: "Classify request",
    durationMs: 1400,
  },
  // Classifier returns result to Hermes
  classify_result: {
    fromId: "ark-classifier", toId: "hermes",
    color: "#22d3ee", label: "Issue classified",
    durationMs: 1200,
  },
  // Hermes stores context in Memory
  memory_write: {
    fromId: "hermes", toId: "ark-memory",
    color: "#6366f1", label: "Context stored",
    durationMs: 1000,
  },
  // Hermes sends selected topic to Script Generator
  script_request: {
    fromId: "hermes", toId: "ark-script",
    color: "#8b5cf6", label: "Script request",
    durationMs: 1800,
  },
  // Script Generator streams back to Hermes
  script_result: {
    fromId: "ark-script", toId: "hermes",
    color: "#c4b5fd", label: "Scripts ready",
    durationMs: 1400,
  },
  // Hermes routes scripts to Guardrail
  guardrail_check: {
    fromId: "hermes", toId: "ark-guardrail",
    color: "#f59e0b", label: "Guardrail check",
    durationMs: 1600,
  },
  // Guardrail returns risk report
  guardrail_passed: {
    fromId: "ark-guardrail", toId: "hermes",
    color: "#34d399", label: "Guardrail passed",
    durationMs: 1200,
  },
  guardrail_flagged: {
    fromId: "ark-guardrail", toId: "hermes",
    color: "#f87171", label: "Guardrail flagged",
    durationMs: 1200,
  },
  // Hermes sends to Package Builder
  package_build: {
    fromId: "hermes", toId: "ark-package",
    color: "#8b5cf6", label: "Building package",
    durationMs: 1400,
  },
  // Package ready → to Hermes
  package_ready: {
    fromId: "ark-package", toId: "hermes",
    color: "#a78bfa", label: "Package ready",
    durationMs: 1200,
  },
  // Hermes routes Memory to read context
  memory_read: {
    fromId: "ark-memory", toId: "hermes",
    color: "#6366f1", label: "Context retrieved",
    durationMs: 900,
  },
  // Revenue monitor updates
  revenue_update: {
    fromId: "ark-revenue", toId: "hermes",
    color: "#f59e0b", label: "Cost tracked",
    durationMs: 1100,
  },
  // Voice prep notified of approved script
  voice_ready: {
    fromId: "hermes", toId: "ark-voice",
    color: "#10b981", label: "Script approved",
    durationMs: 1400,
  },
};
