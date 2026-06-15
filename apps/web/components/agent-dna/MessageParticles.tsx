"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { HelixSegment } from "./types";

interface MessageParticlesProps {
  segments: HelixSegment[];
  reducedMotion: boolean;
}

interface Particle {
  id: number;
  segmentIndex: number;
  side: "left" | "right";
  progress: number;
  speed: number;
  color: string;
  size: number;
  direction: 1 | -1;
}

const PARTICLE_COLORS = [
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#06b6d4",
  "#22d3ee", // light cyan
  "#a78bfa", // light violet
  "#06b6d4",
  "#7c3aed", // deep violet
  "#0891b2", // dark cyan
  "#10b981", // emerald (data)
  "#06b6d4",
];

const PARTICLE_COUNT = 11;

function initParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    segmentIndex: Math.floor(Math.random() * 16),
    side: i % 2 === 0 ? "left" : "right",
    progress: Math.random(),
    speed: 0.0008 + Math.random() * 0.0012,
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    size: 2 + Math.random() * 2.5,
    direction: Math.random() > 0.5 ? 1 : -1,
  }));
}

export function MessageParticles({ segments, reducedMotion }: MessageParticlesProps) {
  const particlesRef = useRef<Particle[]>(initParticles());
  const frameRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles = particlesRef.current;

    function tick() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const totalSegments = segments.length;
      if (totalSegments === 0) return;

      particles.forEach((p) => {
        // Advance along helix
        p.progress += p.speed * p.direction;
        if (p.progress > 1) {
          p.progress = 0;
          p.direction = p.direction === 1 ? -1 : 1;
        }
        if (p.progress < 0) {
          p.progress = 1;
          p.direction = p.direction === 1 ? -1 : 1;
        }

        // Interpolate position along all segments
        const rawIdx = p.progress * (totalSegments - 1);
        const loIdx = Math.floor(rawIdx);
        const hiIdx = Math.min(loIdx + 1, totalSegments - 1);
        const t = rawIdx - loIdx;

        const lo = segments[loIdx];
        const hi = segments[hiIdx];

        const px =
          p.side === "left"
            ? lo.x1 + (hi.x1 - lo.x1) * t
            : lo.x2 + (hi.x2 - lo.x2) * t;
        const py = lo.y + (hi.y - lo.y) * t;
        const depth =
          p.side === "left"
            ? lo.depth1 + (hi.depth1 - lo.depth1) * t
            : lo.depth2 + (hi.depth2 - lo.depth2) * t;

        const opacity = 0.25 + ((depth + 1) / 2) * 0.65;
        const radius = p.size * (0.6 + ((depth + 1) / 2) * 0.4);

        // Glow
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius * 3);
        gradient.addColorStop(0, `${p.color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`);
        gradient.addColorStop(1, `${p.color}00`);

        ctx.beginPath();
        ctx.arc(px, py, radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
        ctx.fill();
      });

      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [segments, reducedMotion]);

  if (reducedMotion) {
    // Static faint dots
    return (
      <div className="absolute inset-0 pointer-events-none">
        {particlesRef.current.slice(0, 6).map((p) => {
          const idx = Math.floor(p.progress * (segments.length - 1));
          const seg = segments[Math.min(idx, segments.length - 1)];
          if (!seg) return null;
          const px = p.side === "left" ? seg.x1 : seg.x2;
          return (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: px - p.size / 2,
                top: seg.y - p.size / 2,
                width: p.size,
                height: p.size,
                background: p.color,
                opacity: 0.25,
              }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      width={720}
      height={560}
    />
  );
}
