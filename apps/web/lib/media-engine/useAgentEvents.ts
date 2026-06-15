"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useAgentEvents
// Generates a live stream of AgentMessage events driven by real pipeline state.
// Messages represent actual inter-agent communication — not random animation.
//
// Pipeline state → event schedule:
//   discovered/selected topics  → scout → hermes, hermes → classifier
//   drafting topics             → hermes → script, script → hermes
//   guardrail_review topics     → hermes → guardrail, guardrail → hermes
//   ready_for_brian packages    → hermes → package, package → hermes
//   approved                    → hermes → voice (approved signal)
//   always                      → memory read/write, revenue tracking
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { AgentMessage } from "@/components/agent-dna/AgentCommunicationParticles";
import { PIPELINE_EVENTS } from "@/components/agent-dna/AgentCommunicationParticles";
import { TopicStatus } from "./types";

export interface PipelineState {
  statusCounts: Partial<Record<TopicStatus, number>>;
}

export interface LiveEvent {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  color: string;
  timestamp: number;
}

// How often to potentially fire each event type when that pipeline stage is active
const STAGE_SCHEDULES: Array<{
  requiredStatuses: TopicStatus[];
  events: string[];        // keys from PIPELINE_EVENTS
  intervalMs: number;
  alwaysActive?: boolean;
}> = [
  // Scouting — fires when we have few topics, or always
  {
    requiredStatuses: ["discovered"],
    events: ["topic_discovered", "classify_request"],
    intervalMs: 3800,
  },
  // Classification result returns
  {
    requiredStatuses: ["selected"],
    events: ["classify_result", "memory_write"],
    intervalMs: 4200,
  },
  // Drafting — script generation in progress
  {
    requiredStatuses: ["drafting"],
    events: ["script_request", "script_result"],
    intervalMs: 3200,
  },
  // Guardrail check
  {
    requiredStatuses: ["guardrail_review"],
    events: ["guardrail_check", "guardrail_passed"],
    intervalMs: 3600,
  },
  // Package building / ready for Brian
  {
    requiredStatuses: ["ready_for_brian"],
    events: ["package_build", "package_ready"],
    intervalMs: 4800,
  },
  // Approved → voice notified
  {
    requiredStatuses: ["approved"],
    events: ["voice_ready"],
    intervalMs: 5500,
  },
  // Always-on background: memory + revenue
  {
    requiredStatuses: [],
    events: ["memory_read", "memory_write", "revenue_update"],
    intervalMs: 5000,
    alwaysActive: true,
  },
  // Scout is always scanning
  {
    requiredStatuses: [],
    events: ["topic_discovered", "classify_request"],
    intervalMs: 7000,
    alwaysActive: true,
  },
];

// Max concurrent messages visible at once
const MAX_MESSAGES = 6;
// How long a message stays in the active list after it started (ms)
const MESSAGE_TTL = 2200;

export function useAgentEvents(pipelineState: PipelineState): {
  messages: AgentMessage[];
  eventLog: LiveEvent[];
} {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [eventLog, setEventLog] = useState<LiveEvent[]>([]);
  const timersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const idCounterRef = useRef(0);

  const fireEvent = useCallback((eventKey: string) => {
    const def = PIPELINE_EVENTS[eventKey];
    if (!def) return;

    const id = `msg-${Date.now()}-${idCounterRef.current++}`;
    const msg: AgentMessage = {
      id,
      fromId:    def.fromId,
      toId:      def.toId,
      color:     def.color,
      label:     def.label,
      startTime: performance.now(),
      duration:  def.durationMs,
    };

    const logEntry: LiveEvent = {
      id,
      fromId:    def.fromId,
      toId:      def.toId,
      label:     def.label,
      color:     def.color,
      timestamp: Date.now(),
    };

    // Add to active messages
    setMessages((prev) => {
      const next = [...prev, msg];
      return next.slice(-MAX_MESSAGES);
    });

    // Add to event log (keep last 12 entries)
    setEventLog((prev) => [logEntry, ...prev].slice(0, 12));

    // Auto-remove after TTL
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, MESSAGE_TTL);
  }, []);

  // Rebuild timers whenever pipeline state changes
  useEffect(() => {
    // Clear existing timers
    timersRef.current.forEach(clearInterval);
    timersRef.current = [];

    for (const schedule of STAGE_SCHEDULES) {
      const isActive =
        schedule.alwaysActive ||
        schedule.requiredStatuses.some(
          (s) => (pipelineState.statusCounts[s] ?? 0) > 0
        );

      if (!isActive) continue;

      // Fire once immediately (staggered)
      const delay = Math.random() * 1500;
      const t0 = setTimeout(() => {
        const evtKey = schedule.events[Math.floor(Math.random() * schedule.events.length)];
        fireEvent(evtKey);
      }, delay);

      // Then fire on interval
      const interval = setInterval(() => {
        const evtKey = schedule.events[Math.floor(Math.random() * schedule.events.length)];
        fireEvent(evtKey);
      }, schedule.intervalMs + Math.random() * 1000);

      timersRef.current.push(interval);
      // Note: t0 is a Timeout not an Interval — store as any for cleanup
      // Cast to same type for cleanup array
      timersRef.current.push(t0 as unknown as ReturnType<typeof setInterval>);
    }

    return () => {
      timersRef.current.forEach(clearInterval);
      timersRef.current = [];
    };
  }, [
    // Re-evaluate when any status count changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(pipelineState.statusCounts),
    fireEvent,
  ]);

  return { messages, eventLog };
}
