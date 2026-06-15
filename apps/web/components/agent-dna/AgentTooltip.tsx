"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AgentNodeData, statusStyles } from "./types";

interface AgentTooltipProps {
  agent: AgentNodeData;
  x: number;
  y: number;
  containerWidth: number;
}

export function AgentTooltip({ agent, x, y, containerWidth }: AgentTooltipProps) {
  const style = statusStyles[agent.status];

  // Flip to left side if close to right edge
  const tooltipWidth = 220;
  const flipLeft = x + tooltipWidth + 32 > containerWidth;
  const offsetX = flipLeft ? -(tooltipWidth + 16) : 16;

  return (
    <AnimatePresence>
      <motion.div
        key={agent.id + "-tooltip"}
        initial={{ opacity: 0, scale: 0.92, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 4 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="absolute z-50 pointer-events-none"
        style={{ left: x + offsetX, top: y - 12, width: tooltipWidth }}
      >
        <div className="glass-card rounded-xl p-3 text-xs space-y-1.5"
          style={{ boxShadow: `0 0 24px ${style.glowHex}33, 0 8px 32px rgba(0,0,0,0.5)` }}>
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${style.ring} ${style.bg} ${style.text}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: style.glowHex }}
              />
              {style.label.toUpperCase()}
            </span>
          </div>

          <p className="font-semibold text-white leading-tight">{agent.name}</p>

          {agent.task && (
            <p className="text-slate-400 leading-tight">{agent.task}</p>
          )}

          <div className="border-t border-white/5 pt-1.5 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Load</span>
              <span className="text-slate-200 font-mono">{agent.load}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Memory</span>
              <span className="text-slate-200 font-mono">{agent.memoryUse}%</span>
            </div>
            {agent.costPerHour !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-500">Cost/hr</span>
                <span className="text-slate-200 font-mono">
                  ${agent.costPerHour.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Revenue</span>
              <span
                className={
                  agent.revenueLinked ? "text-emerald-400" : "text-slate-500"
                }
              >
                {agent.revenueLinked ? "Linked" : "No"}
              </span>
            </div>
          </div>

          {agent.lastEvent && (
            <p className="text-slate-500 text-[10px] border-t border-white/5 pt-1.5">
              ↳ {agent.lastEvent}
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
