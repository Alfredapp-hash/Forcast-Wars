export type AgentStatus =
  | "active"
  | "idle"
  | "thinking"
  | "paused"
  | "error"
  | "complete";

export type AgentType =
  | "core"
  | "memory"
  | "voice"
  | "planner"
  | "content"
  | "finance"
  | "browser"
  | "code"
  | "scheduler"
  | "analytics"
  | "system";

export type AgentNodeData = {
  id: string;
  name: string;
  shortName: string;
  type: AgentType;
  status: AgentStatus;
  load: number;
  memoryUse: number;
  task?: string;
  parentId?: string;
  revenueLinked?: boolean;
  costPerHour?: number;
  lastEvent?: string;
};

export const statusStyles: Record<
  AgentStatus,
  {
    glow: string;
    ring: string;
    text: string;
    bg: string;
    pulse: boolean;
    glowHex: string;
    label: string;
  }
> = {
  active: {
    glow: "shadow-cyan-500/70",
    ring: "border-cyan-300",
    text: "text-cyan-100",
    bg: "bg-cyan-500/15",
    pulse: true,
    glowHex: "#06b6d4",
    label: "Active",
  },
  thinking: {
    glow: "shadow-violet-500/70",
    ring: "border-violet-300",
    text: "text-violet-100",
    bg: "bg-violet-500/15",
    pulse: true,
    glowHex: "#8b5cf6",
    label: "Thinking",
  },
  idle: {
    glow: "shadow-slate-500/30",
    ring: "border-slate-400",
    text: "text-slate-300",
    bg: "bg-slate-500/10",
    pulse: false,
    glowHex: "#64748b",
    label: "Idle",
  },
  paused: {
    glow: "shadow-amber-500/50",
    ring: "border-amber-300",
    text: "text-amber-100",
    bg: "bg-amber-500/10",
    pulse: false,
    glowHex: "#f59e0b",
    label: "Paused",
  },
  error: {
    glow: "shadow-red-500/70",
    ring: "border-red-300",
    text: "text-red-100",
    bg: "bg-red-500/15",
    pulse: true,
    glowHex: "#ef4444",
    label: "Error",
  },
  complete: {
    glow: "shadow-emerald-500/60",
    ring: "border-emerald-300",
    text: "text-emerald-100",
    bg: "bg-emerald-500/15",
    pulse: false,
    glowHex: "#10b981",
    label: "Complete",
  },
};

export type HelixSegment = {
  y: number;
  x1: number;
  x2: number;
  depth1: number;
  depth2: number;
};
