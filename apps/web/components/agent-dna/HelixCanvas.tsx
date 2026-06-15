"use client";

import { useEffect, useRef } from "react";
import { HelixSegment } from "./types";

export const HELIX_W = 720;
export const HELIX_H = 560;
const TOTAL = 18;
const AMP = 130;
const CX = 360;
const RAIL_STEPS = 90;
const SPEED = 0.28;

type RailPt = { x: number; y: number; depth: number };

interface HelixCanvasProps {
  reducedMotion: boolean;
  onSegments: (segs: HelixSegment[]) => void;
}

export function HelixCanvas({ reducedMotion, onSegments }: HelixCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);
  const rafRef = useRef(0);
  const tsLastRef = useRef(0);
  const frameRef = useRef(0);
  const cbRef = useRef(onSegments);
  cbRef.current = onSegments;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = HELIX_W * dpr;
    canvas.height = HELIX_H * dpr;
    ctx.scale(dpr, dpr);

    // ── helpers ─────────────────────────────────────────────────────────
    function buildRail(phase: number, strand: 0 | 1): RailPt[] {
      return Array.from({ length: RAIL_STEPS + 1 }, (_, i) => {
        const t = i / RAIL_STEPS;
        const y = t * HELIX_H;
        const angle = t * TOTAL * 0.75 + phase + strand * Math.PI;
        return { x: CX + Math.sin(angle) * AMP, y, depth: Math.cos(angle) };
      });
    }

    function buildSegments(phase: number): HelixSegment[] {
      return Array.from({ length: TOTAL }, (_, i) => {
        const t = (i + 0.5) / TOTAL;
        const y = t * HELIX_H;
        const angle = t * TOTAL * 0.75 + phase;
        return {
          y,
          x1: CX + Math.sin(angle) * AMP,
          x2: CX + Math.sin(angle + Math.PI) * AMP,
          depth1: Math.cos(angle),
          depth2: Math.cos(angle + Math.PI),
        };
      });
    }

    // Draw one segment of a rail, varying opacity/width/glow by depth
    function drawRailSegmented(pts: RailPt[], color: string) {
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const depth = (p0.depth + p1.depth) / 2;
        const n = (depth + 1) / 2; // 0=back 1=front

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);

        if (n > 0.5) {
          // Front half — bloom + core
          const t = (n - 0.5) * 2; // 0..1

          // Outer bloom
          ctx.save();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 0.06 * t;
          ctx.strokeStyle = color;
          ctx.lineWidth = 18 * t;
          ctx.stroke();
          ctx.restore();

          // Glow bloom
          ctx.save();
          ctx.shadowBlur = 18 * t;
          ctx.shadowColor = color;
          ctx.globalAlpha = 0.18 + 0.32 * t;
          ctx.strokeStyle = color;
          ctx.lineWidth = 5 * t + 1;
          ctx.stroke();
          ctx.restore();

          // Core line
          ctx.save();
          ctx.shadowBlur = 5;
          ctx.shadowColor = color;
          ctx.globalAlpha = 0.6 + 0.38 * t;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.6 + t * 1.4;
          ctx.stroke();
          ctx.restore();

          // Specular highlight spine
          ctx.save();
          ctx.globalAlpha = 0.18 * t;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 0.6;
          ctx.stroke();
          ctx.restore();
        } else {
          // Back half — dim
          ctx.save();
          ctx.globalAlpha = 0.05 + n * 0.12;
          ctx.strokeStyle = color;
          ctx.lineWidth = 0.7;
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    function drawConnectorBars(segs: HelixSegment[]) {
      // Depth-sort: back → front
      const sorted = [...segs].sort(
        (a, b) => (a.depth1 + a.depth2) / 2 - (b.depth1 + b.depth2) / 2
      );

      sorted.forEach((seg) => {
        const avgD = (seg.depth1 + seg.depth2) / 2;
        const n = (avgD + 1) / 2;
        const isFront = avgD >= 0;

        ctx.save();
        if (isFront) {
          ctx.shadowBlur = 6 * n;
          ctx.shadowColor = "#a78bfa";
          ctx.globalAlpha = 0.12 + n * 0.42;
          ctx.strokeStyle = "#a78bfa";
          ctx.lineWidth = 0.5 + n * 1.8;
        } else {
          ctx.globalAlpha = 0.03 + n * 0.07;
          ctx.strokeStyle = "#a78bfa";
          ctx.lineWidth = 0.4;
        }
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y);
        ctx.lineTo(seg.x2, seg.y);
        ctx.stroke();
        ctx.restore();

        // Nucleotide dot at bar center (front only)
        if (n > 0.52) {
          const nx = (seg.x1 + seg.x2) / 2;
          const r = 1.5 + n * 2.5;
          const alpha = 0.2 + n * 0.6;

          // Glow halo around nucleotide
          ctx.save();
          ctx.shadowBlur = 8;
          ctx.shadowColor = "rgba(255,255,255,0.8)";
          ctx.globalAlpha = alpha * 0.5;
          ctx.beginPath();
          ctx.arc(nx, seg.y, r * 2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(167,139,250,0.3)";
          ctx.fill();
          ctx.restore();

          // Core dot
          ctx.save();
          ctx.shadowBlur = 4;
          ctx.shadowColor = "#ffffff";
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(nx, seg.y, r, 0, Math.PI * 2);
          const grad = ctx.createRadialGradient(nx, seg.y, 0, nx, seg.y, r);
          grad.addColorStop(0, "rgba(255,255,255,0.9)");
          grad.addColorStop(1, "rgba(167,139,250,0.5)");
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
        }
      });
    }

    function drawBackgroundDetail() {
      // Faint horizontal field lines
      ctx.save();
      ctx.globalAlpha = 1;
      for (let y = 0; y < HELIX_H; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(HELIX_W, y);
        ctx.strokeStyle = "rgba(99,102,241,0.018)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.restore();

      // Center spine
      ctx.save();
      ctx.setLineDash([3, 9]);
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(CX, 0);
      ctx.lineTo(CX, HELIX_H);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    function drawScanSweep(ts: number) {
      const t = (ts / 5500) % 1;
      const scanY = t * (HELIX_H + 80) - 40;
      const halfH = 45;

      const grad = ctx.createLinearGradient(0, scanY - halfH, 0, scanY + halfH);
      grad.addColorStop(0, "rgba(6,182,212,0)");
      grad.addColorStop(0.3, "rgba(6,182,212,0.03)");
      grad.addColorStop(0.5, "rgba(6,182,212,0.10)");
      grad.addColorStop(0.7, "rgba(6,182,212,0.03)");
      grad.addColorStop(1, "rgba(6,182,212,0)");

      ctx.save();
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - halfH, HELIX_W, halfH * 2);
      ctx.restore();

      // Thin bright line at scan center
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(HELIX_W, scanY);
      ctx.stroke();
      ctx.restore();
    }

    function drawHermesSpine(ts: number) {
      const cy = HELIX_H / 2;

      // Wide ambient glow column
      const colGrad = ctx.createLinearGradient(CX - 80, 0, CX + 80, 0);
      colGrad.addColorStop(0,    "rgba(6,182,212,0)");
      colGrad.addColorStop(0.25, "rgba(6,182,212,0.024)");
      colGrad.addColorStop(0.5,  "rgba(139,92,246,0.034)");
      colGrad.addColorStop(0.75, "rgba(6,182,212,0.024)");
      colGrad.addColorStop(1,    "rgba(6,182,212,0)");
      ctx.save();
      ctx.fillStyle = colGrad;
      ctx.fillRect(CX - 80, 0, 160, HELIX_H);
      ctx.restore();

      // Dashed center spine
      ctx.save();
      ctx.setLineDash([4, 8]);
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 1;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#06b6d4";
      ctx.beginPath();
      ctx.moveTo(CX, 0);
      ctx.lineTo(CX, HELIX_H);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Pulsing Hermes orb at vertical center
      const pulse = (Math.sin(ts / 1100) + 1) / 2;
      const r = 20 + pulse * 10;
      ctx.save();
      const orbGrad = ctx.createRadialGradient(CX, cy, 0, CX, cy, r * 4);
      orbGrad.addColorStop(0,    `rgba(6,182,212,${(0.28 + pulse * 0.12).toFixed(3)})`);
      orbGrad.addColorStop(0.25, `rgba(139,92,246,${(0.14 + pulse * 0.08).toFixed(3)})`);
      orbGrad.addColorStop(1,    "rgba(6,182,212,0)");
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(CX, cy, r * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Tick marks along spine
      const TICKS = 9;
      for (let i = 0; i < TICKS; i++) {
        const ty = (i / (TICKS - 1)) * HELIX_H;
        const isMid = Math.abs(ty - cy) < 8;
        ctx.save();
        ctx.globalAlpha = isMid ? 0.24 : (0.06 + 0.03 * Math.sin(ts / 700 + i));
        ctx.strokeStyle   = i % 2 === 0 ? "#06b6d4" : "#8b5cf6";
        ctx.lineWidth     = isMid ? 1.5 : 0.5;
        ctx.shadowBlur    = isMid ? 8 : 0;
        ctx.shadowColor   = "#06b6d4";
        ctx.beginPath();
        ctx.moveTo(CX - (isMid ? 8 : 4), ty);
        ctx.lineTo(CX + (isMid ? 8 : 4), ty);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── RAF draw loop ────────────────────────────────────────────────────
    function tick(ts: number) {
      const dt = tsLastRef.current ? (ts - tsLastRef.current) / 1000 : 0;
      tsLastRef.current = ts;

      if (!reducedMotion) {
        phaseRef.current += dt * SPEED;
      }

      const phase = phaseRef.current;

      ctx.clearRect(0, 0, HELIX_W, HELIX_H);

      const rail1 = buildRail(phase, 0);
      const rail2 = buildRail(phase, 1);
      const segs = buildSegments(phase);

      drawBackgroundDetail();
      drawHermesSpine(ts);

      // Back connector bars (drawn before rails so rails appear in front)
      const backSegs = segs.filter((s) => (s.depth1 + s.depth2) / 2 < 0);
      backSegs.forEach((seg) => {
        const avgD = (seg.depth1 + seg.depth2) / 2;
        const n = (avgD + 1) / 2;
        ctx.save();
        ctx.globalAlpha = 0.03 + n * 0.07;
        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y);
        ctx.lineTo(seg.x2, seg.y);
        ctx.stroke();
        ctx.restore();
      });

      // Rails
      drawRailSegmented(rail1, "#06b6d4");
      drawRailSegmented(rail2, "#8b5cf6");

      // Front connector bars + nucleotide dots (on top of rails)
      const frontSegs = segs.filter((s) => (s.depth1 + s.depth2) / 2 >= 0);
      frontSegs.forEach((seg) => {
        const avgD = (seg.depth1 + seg.depth2) / 2;
        const n = (avgD + 1) / 2;

        ctx.save();
        ctx.shadowBlur = 6 * n;
        ctx.shadowColor = "#a78bfa";
        ctx.globalAlpha = 0.12 + n * 0.44;
        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 0.6 + n * 1.8;
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y);
        ctx.lineTo(seg.x2, seg.y);
        ctx.stroke();
        ctx.restore();

        // Nucleotide dot
        const nx = (seg.x1 + seg.x2) / 2;
        const r = 1.5 + n * 2.5;
        const alpha = 0.25 + n * 0.65;

        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(255,255,255,0.7)";
        ctx.globalAlpha = alpha * 0.45;
        ctx.beginPath();
        ctx.arc(nx, seg.y, r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(167,139,250,0.25)";
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.shadowBlur = 5;
        ctx.shadowColor = "#ffffff";
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(nx, seg.y, r, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(nx, seg.y, 0, nx, seg.y, r);
        g.addColorStop(0, "rgba(255,255,255,0.95)");
        g.addColorStop(0.5, "rgba(200,170,255,0.7)");
        g.addColorStop(1, "rgba(139,92,246,0.4)");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
      });

      if (!reducedMotion) {
        drawScanSweep(ts);
      }

      // Notify parent (throttle to ~20fps)
      frameRef.current++;
      if (frameRef.current % 3 === 0) {
        cbRef.current(segs);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: HELIX_W, height: HELIX_H, display: "block" }}
      aria-hidden="true"
    />
  );
}
