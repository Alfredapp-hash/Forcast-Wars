"use client";

import { motion } from "framer-motion";
import { X, Activity, Brain, Cpu, DollarSign, Zap } from "lucide-react";
import { AgentNodeData, statusStyles } from "./types";

interface AgentDetailCardProps {
  agent: AgentNodeData;
  allAgents: AgentNodeData[];
  onClose: () => void;
}

function typeIcon(type: AgentNodeData["type"]) {
  const icons: Record<string, React.ReactNode> = {
    core: <Cpu size={12} />,
    memory: <Brain size={12} />,
    finance: <DollarSign size={12} />,
    system: <Zap size={12} />,
  };
  return icons[type] ?? <Activity size={12} />;
}

function LoadBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
      />
    </div>
  );
}

export function AgentDetailCard({ agent, allAgents, onClose }: AgentDetailCardProps) {
  const style = statusStyles[agent.status];
  const parent = allAgents.find((a) => a.id === agent.parentId);
  const totalCostPerHour = allAgents.reduce(
    (sum, a) => sum + (a.costPerHour ?? 0),
    0
  );

  return (
    <motion.div
      key={agent.id + "-detail"}
      initial={{ opacity: 0, x: 24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.96 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="glass-card rounded-2xl overflow-hidden"
      style={{
        width: 280,
        boxShadow: `0 0 40px ${style.glowHex}22, 0 16px 64px rgba(0,0,0,0.6)`,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-start justify-between"
        style={{ background: `${style.glowHex}12`, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${style.ring} ${style.bg} ${style.text}`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.glowHex }} />
              {style.label.toUpperCase()}
            </span>
            {agent.revenueLinked && (
              <span className="text-[10px] text-emerald-400 font-bold">
                $ LINKED
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-white leading-tight mt-1">
            {agent.name}
          </h3>
          <p className="text-[11px] text-slate-400 capitalize flex items-center gap-1 mt-0.5">
            {typeIcon(agent.type)}
            {agent.type}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 ml-2 flex-shrink-0"
          aria-label="Close detail card"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Task */}
        {agent.task && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
              Current Task
            </p>
            <p className="text-xs text-slate-200 leading-relaxed">{agent.task}</p>
          </div>
        )}

        {/* Metrics */}
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-slate-500">LOAD</span>
              <span className="text-slate-300 font-mono">{agent.load}%</span>
            </div>
            <LoadBar value={agent.load} color={style.glowHex} />
          </div>
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-slate-500">MEMORY</span>
              <span className="text-slate-300 font-mono">{agent.memoryUse}%</span>
            </div>
            <LoadBar value={agent.memoryUse} color="#8b5cf6" />
          </div>
        </div>

        {/* Cost */}
        <div className="flex justify-between text-xs py-1.5 border-t border-white/5">
          <span className="text-slate-500">Cost/hr</span>
          <span className="text-slate-200 font-mono font-semibold">
            ${(agent.costPerHour ?? 0).toFixed(2)}
          </span>
        </div>

        {/* Lineage */}
        <div className="space-y-1.5 border-t border-white/5 pt-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">
            Agent Lineage
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Parent</span>
              <span className="text-slate-300">
                {parent?.name ?? "Core Orchestrator"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Connected via</span>
              <span className="text-slate-300">Hermes Bus</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Role</span>
              <span className="text-slate-300 capitalize">
                {agent.status === "active"
                  ? "Processing"
                  : agent.status === "thinking"
                  ? "Reasoning"
                  : agent.status === "paused"
                  ? "Waiting"
                  : agent.status}
              </span>
            </div>
          </div>
        </div>

        {/* Last event */}
        {agent.lastEvent && (
          <div className="text-[10px] text-slate-500 bg-white/3 rounded-lg px-2.5 py-1.5 border border-white/5">
            ↳ {agent.lastEvent}
          </div>
        )}
      </div>
    </motion.div>
  );
}
