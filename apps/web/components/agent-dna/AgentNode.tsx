"use client";

import { motion } from "framer-motion";
import { AgentNodeData, statusStyles } from "./types";

interface AgentNodeProps {
  agent: AgentNodeData;
  x: number;
  y: number;
  depth: number;
  isSelected: boolean;
  reducedMotion: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
  tabIndex: number;
}

export function AgentNode({
  agent,
  x,
  y,
  depth,
  isSelected,
  reducedMotion,
  onHoverStart,
  onHoverEnd,
  onClick,
  tabIndex,
}: AgentNodeProps) {
  const style = statusStyles[agent.status];

  const n = (depth + 1) / 2; // 0=back 1=front
  // Perspective-correct scale: objects farther back shrink more dramatically
  const scale = 0.52 + n * 0.48;
  const opacity = 0.28 + n * 0.72;
  const blur = n > 0.55 ? 0 : (0.55 - n) * 5;
  const zIndex = Math.round(n * 100);

  // Core node size — front nodes are larger
  const size = Math.round(34 + n * 14);
  const haloSize = size * 3.2;
  const orbitSize = size * 1.55;

  const isActive = agent.status === "active" || agent.status === "thinking";
  const isPaused = agent.status === "paused";
  const isError = agent.status === "error";

  return (
    <motion.div
      className="absolute"
      style={{
        left: x,
        top: y,
        zIndex,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        translateX: "-50%",
        translateY: "-50%",
      }}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity, scale }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── Layer 1: Outer ambient halo (depth-scaled, very faint) */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: haloSize,
          height: haloSize,
          left: -(haloSize - size) / 2,
          top: -(haloSize - size) / 2,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${style.glowHex}14 0%, ${style.glowHex}06 40%, transparent 70%)`,
        }}
        animate={
          reducedMotion
            ? {}
            : { scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }
        }
        transition={{
          duration: isError ? 1.0 : 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* ── Layer 2: Outer pulse expand ring (active/error) */}
      {isActive && !isSelected && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: orbitSize,
            height: orbitSize,
            left: -(orbitSize - size) / 2,
            top: -(orbitSize - size) / 2,
            borderRadius: "50%",
            border: `1px solid ${style.glowHex}60`,
          }}
          animate={
            reducedMotion
              ? {}
              : {
                  scale: [1, 1.6, 1],
                  opacity: [0.6, 0, 0.6],
                }
          }
          transition={{
            duration: agent.status === "error" ? 1.1 : 2.8,
            repeat: Infinity,
            ease: "easeOut",
            delay: 0.3,
          }}
        />
      )}

      {/* ── Layer 3: Orbit status ring (spins when selected; dashes when active) */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: orbitSize,
          height: orbitSize,
          left: -(orbitSize - size) / 2,
          top: -(orbitSize - size) / 2,
          borderRadius: "50%",
          border: `1.5px ${isSelected ? "solid" : "dashed"} ${style.glowHex}`,
          opacity: isSelected ? 0.9 : isActive ? 0.35 : 0.15,
          boxShadow: isSelected ? `0 0 10px ${style.glowHex}55, inset 0 0 6px ${style.glowHex}22` : "none",
        }}
        animate={
          reducedMotion
            ? {}
            : isSelected
            ? { rotate: 360 }
            : isActive
            ? { rotate: [0, 180, 360], opacity: [0.35, 0.55, 0.35] }
            : {}
        }
        transition={
          isSelected
            ? { duration: 4, repeat: Infinity, ease: "linear" }
            : { duration: 8, repeat: Infinity, ease: "linear" }
        }
      />

      {/* ── Layer 4: Second counter-rotating orbit ring (selected only) */}
      {isSelected && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: orbitSize * 1.22,
            height: orbitSize * 1.22,
            left: -(orbitSize * 1.22 - size) / 2,
            top: -(orbitSize * 1.22 - size) / 2,
            borderRadius: "50%",
            border: `1px solid ${style.glowHex}40`,
          }}
          animate={reducedMotion ? {} : { rotate: -360 }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* ── Layer 5: Core button */}
      <button
        className="relative rounded-full flex flex-col items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          cursor: "pointer",
          background: `radial-gradient(ellipse at 35% 30%, ${style.glowHex}35 0%, ${style.glowHex}18 40%, rgba(5,10,20,0.92) 100%)`,
          border: `1.5px solid ${style.glowHex}${isSelected ? "CC" : "66"}`,
          boxShadow: `
            0 0 ${isSelected ? 28 : 10}px ${style.glowHex}${isSelected ? "88" : "44"},
            0 0 ${isSelected ? 60 : 20}px ${style.glowHex}${isSelected ? "33" : "18"},
            inset 0 1px 0 rgba(255,255,255,0.12),
            inset 0 0 12px ${style.glowHex}18
          `,
          opacity: isPaused ? 0.5 : 1,
        }}
        aria-label={`${agent.name} — ${style.label} — load ${agent.load}% memory ${agent.memoryUse}%`}
        aria-pressed={isSelected}
        tabIndex={tabIndex}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        onFocus={onHoverStart}
        onBlur={onHoverEnd}
        onClick={onClick}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {/* Inner specular highlight arc */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "14%",
            left: "18%",
            width: "45%",
            height: "22%",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
            filter: "blur(2px)",
          }}
        />

        {/* Status micro-pip */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 5,
            height: 5,
            top: "10%",
            right: "12%",
            background: style.glowHex,
            boxShadow: `0 0 5px ${style.glowHex}, 0 0 10px ${style.glowHex}88`,
          }}
          animate={
            isActive && !reducedMotion
              ? { opacity: [1, 0.2, 1], scale: [1, 1.3, 1] }
              : {}
          }
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Agent short name */}
        <span
          className="select-none font-black leading-none"
          style={{
            fontSize: Math.max(7, size * 0.22),
            letterSpacing: "0.06em",
            color: "rgba(255,255,255,0.92)",
            textShadow: `0 0 8px ${style.glowHex}BB`,
          }}
        >
          {agent.shortName}
        </span>
      </button>
    </motion.div>
  );
}
