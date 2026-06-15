import type { ArkheEvent } from "@arkhe/contracts";
import { createEventId, SCHEMA_VERSION } from "@arkhe/contracts";
import type { HumanMemoryStore, LocalMemoryStore } from "@arkhe/memory";
import type { ModelRouter } from "@arkhe/model-router";
import type { SupabaseSync } from "@arkhe/supabase-sync";

export interface DreamingStatus {
  enabled: boolean;
  lastRunAt?: string;
  lastReflection?: string;
  eventCount: number;
}

/** Reflection job that compresses recent events into human + neural memories. */
export class DreamingService {
  private timer: NodeJS.Timeout | null = null;
  private status: DreamingStatus = {
    enabled: false,
    eventCount: 0,
  };

  constructor(
    private readonly deps: {
      localMemory: LocalMemoryStore;
      humanMemory: HumanMemoryStore;
      modelRouter: ModelRouter;
      supabaseSync: SupabaseSync;
      publish?: (e: ArkheEvent) => void;
    },
  ) {}

  start(intervalMs = Number(process.env.ARKHE_DREAM_INTERVAL_MS ?? 21_600_000)): void {
    if (this.timer || process.env.ARKHE_DREAMING === "0") return;
    this.status.enabled = true;
    this.timer = setInterval(() => {
      void this.run("scheduled");
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.status.enabled = false;
  }

  getStatus(): DreamingStatus {
    return { ...this.status };
  }

  async run(reason = "manual", opts: { scope?: "general" | "media" | "both" } = {}): Promise<DreamingStatus> {
    const scope = opts.scope ?? "both";
    const events = this.deps.localMemory.allEvents().slice(-80);
    this.status.eventCount = events.length;

    if (events.length === 0) {
      this.status.lastRunAt = new Date().toISOString();
      this.status.lastReflection = "No recent events to reflect on.";
      return this.getStatus();
    }

    const existingHumanMemory = await this.deps.humanMemory.read();

    if (scope !== "media") {
      const prompt = buildReflectionPrompt(events, existingHumanMemory, reason);
      const route = await this.deps.modelRouter.run({
        taskClass: "critique_output",
        input: prompt,
        agentRole: "Ark Vault Agent",
      });

      const reflection = normalizeReflection(route.output);
      await this.deps.humanMemory.appendReflection(reflection);
      await this.deps.supabaseSync.createReflection({
        content: reflection,
        agentId: "agt_resident_vault",
        importance: 0.9,
        tags: ["dream", "reflection", "ark_vault"],
      });
    }

    // Media / Attention Cortex dreaming (attn-6): performance data drives learning + Neural Mesh evolution.
    // Triggered manually (dream_now with scope=media or media_dream_now), on strong signals via ingest,
    // or opportunistically inside a general dream run when attention/media events are present in the window.
    const mediaEventsAll = events.filter((e) =>
      e.eventType.startsWith("attention.") ||
      e.eventType.startsWith("trend.") ||
      e.eventType.startsWith("opportunity.") ||
      e.eventType.startsWith("content.") ||
      e.eventType.startsWith("video.") ||
      e.eventType.startsWith("analytics.media") ||
      e.eventType.startsWith("media.dream") ||
      e.eventType.startsWith("publish.")
    );
    if ((scope !== "general") && mediaEventsAll.length > 0) {
      await this.performMediaReflection(mediaEventsAll, existingHumanMemory, reason);
    }

    this.status.lastRunAt = new Date().toISOString();
    return this.getStatus();
  }

  /** Rate-limited ingest hook called from the daemon event pipeline for auto media dreaming on performance signals. */
  ingest(event: ArkheEvent): void {
    const et = event.eventType;
    if (et !== "analytics.media.report" && et !== "video.published" && et !== "attention.scan.completed") return;
    const now = Date.now();
    if (now - this.lastMediaDreamTs < this.MEDIA_DREAM_COOLDOWN_MS) return;
    this.lastMediaDreamTs = now;
    // Non-blocking targeted media reflection (will see the just-appended event in localMemory)
    void this.run("auto:" + et, { scope: "media" }).catch((e: unknown) => {
      // eslint-disable-next-line no-console
      console.warn("[dreaming] auto media dream failed:", (e as any)?.message ?? e);
    });
  }

  /** Dedicated entrypoint for IPC media_dream_now / scope=media. Reuses the media path. */
  async runMediaDream(reason = "manual-media"): Promise<DreamingStatus> {
    return this.run(reason, { scope: "media" });
  }

  private lastMediaDreamTs = 0;
  private readonly MEDIA_DREAM_COOLDOWN_MS = 12_000;

  private async performMediaReflection(mediaEvents: ArkheEvent[], memoriesMd: string, reason: string): Promise<void> {
    // Determine the current "campaign" by most recent high-signal event with a topic
    const rev = [...mediaEvents].reverse();
    const campaign = rev.find((e) =>
      (e.eventType === "video.published" || e.eventType === "analytics.media.report" || e.eventType === "opportunity.selected" || e.eventType === "content.generated") &&
      !!(e.payload as any)?.topic
    ) || mediaEvents[mediaEvents.length - 1];
    const topic = ((campaign?.payload as any)?.topic as string) || "general media";

    // Collect events belonging to this campaign (same topic or temporally close to the key publish/report)
    const campaignTs = campaign ? Date.parse(campaign.ts) : Date.now();
    const campaignEvents = mediaEvents.filter((e) => {
      const t = (e.payload as any)?.topic as string | undefined;
      const ets = Date.parse(e.ts);
      return (t && t === topic) || Math.abs(ets - campaignTs) < 6 * 60_000;
    });

    // Latest performance report for this loop
    const reportEvt = rev.find((e) => e.eventType === "analytics.media.report");
    const report = (reportEvt?.payload || {}) as {
      views?: number; ctr?: number; watchTimeAvgSec?: number; retentionPct?: number; subsDelta?: number; summary?: string;
    };
    const perf = {
      views: report.views ?? 0,
      ctr: report.ctr ?? 0,
      watchTimeAvgSec: report.watchTimeAvgSec ?? 0,
      retentionPct: report.retentionPct ?? 0,
      subsDelta: report.subsDelta ?? 0,
    };
    const performanceDeltaEst = computePerformanceDelta(perf);

    // Prior media/attention reflections for continuity (avoid duplication)
    const priorReflections = extractPriorAttentionReflections(memoriesMd).slice(-2).join("\n---\n");

    const prompt = buildMediaReflectionPromptV2({
      campaignEvents,
      topic,
      perf,
      performanceDeltaEst,
      priorReflections,
      reason,
      memoriesMd,
    });

    const route = await this.deps.modelRouter.run({
      taskClass: "critique_output",
      input: prompt,
      agentRole: "Dreaming Agent (Media)",
    });

    const parsed = parseMediaReflectionOutput(route.output);
    let reflection = parsed.reflection || normalizeReflection(route.output);

    // Guarantee 80/20 is explicitly referenced in the final durable reflection (per spec)
    if (!/80[\/% ]*20|80 percent|twenty percent/i.test(reflection)) {
      reflection += " The 80/20 valuable (AI/tools/productivity) vs meta (how the cortex manufactured attention) strategy was central to this assessment.";
    }

    const synapseUpdates = (parsed.synapseUpdates && parsed.synapseUpdates.length > 0)
      ? parsed.synapseUpdates
      : computeSynapseUpdatesFromPerf(perf, topic);

    const proposedNewAgentRole = parsed.proposedNewAgentRole || (performanceDeltaEst > 0.12 ? "Viral Short Strategist" : undefined);

    const finalPerfDelta = parsed.perfDelta ?? performanceDeltaEst;

    // Emit the canonical full AttentionEvent so it flows to bus -> ipc broadcast + SynapseEngine.ingest (which will emit the synapse.* deltas)
    if (this.deps.publish) {
      this.deps.publish({
        id: createEventId(),
        ts: new Date().toISOString(),
        schemaVersion: SCHEMA_VERSION,
        eventType: "media.dream.reflection",
        payload: {
          topic,
          reflection,
          performanceDelta: finalPerfDelta,
          synapseUpdates,
          proposedNewAgentRole,
          views: perf.views,
          ctr: perf.ctr,
          watchTimeAvgSec: perf.watchTimeAvgSec,
          retentionPct: perf.retentionPct,
          subsDelta: perf.subsDelta,
          summary: reflection.slice(0, 280),
          tags: ["attention", "media", "dream", "performance"],
        },
      } as any);
    }

    // L1: append a clearly tagged Attention Cortex section (not just a bullet under Recent Reflections)
    const dateStr = new Date().toISOString().slice(0, 10);
    const sectionHeader = `## Attention Cortex Reflection — ${dateStr} — Topic: ${topic}`;
    const sectionBody = `${sectionHeader}\n\n${reflection}\n\nPerformance snapshot: views=${perf.views}, ctr=${(perf.ctr||0).toFixed(4)}, retention=${perf.retentionPct}%, subsDelta=${perf.subsDelta} (est. delta ${finalPerfDelta.toFixed(3)}).\nSynapse deltas applied to Neural Mesh: ${JSON.stringify(synapseUpdates)}.\n${proposedNewAgentRole ? `Proposed emergent specialist: ${proposedNewAgentRole}\n` : ""}80/20 content strategy was factored into the diagnosis and recommendations for Trend Intelligence / Opportunity / Content / Video Production / YouTube / Marketing agents.\n`;
    const current = await this.deps.humanMemory.read();
    if (!current.includes(sectionHeader)) {
      await this.deps.humanMemory.write(current.trimEnd() + "\n\n" + sectionBody);
    }

    // L2: high-importance reflection in agent_memories (via existing helper) + structured row in media_reflections
    await this.deps.supabaseSync.createReflection({
      content: reflection,
      agentId: "agt_resident_dreaming_media",
      importance: 0.96,
      tags: ["attention", "media", "dream", "reflection", "performance", topic.toLowerCase().replace(/\s+/g, "_")],
    });
    await this.deps.supabaseSync.createMediaReflection?.({
      reflection,
      performanceDelta: finalPerfDelta,
      proposedNewAgentRole,
    });

    this.status.lastReflection = reflection;
  }
}

function buildReflectionPrompt(events: ArkheEvent[], memoriesMd: string, reason: string): string {
  const compactEvents = events.map((event) => ({
    type: event.eventType,
    ts: event.ts,
    missionId: event.missionId,
    agentId: event.agentId,
    summary: summarizeEvent(event),
  }));

  return [
    "Reflect on the recent Arkhe AgentOS activity.",
    `Reason: ${reason}`,
    "Return 1-3 durable memories or patterns. Avoid duplicating existing memories.",
    "Existing MEMORIES.md:",
    memoriesMd.slice(-4000),
    "Recent events:",
    JSON.stringify(compactEvents, null, 2),
  ].join("\n\n");
}

function summarizeEvent(event: ArkheEvent): string {
  const payload = event.payload as {
    message?: string;
    title?: string;
    summary?: string;
    transcript?: string;
    outputPreview?: string;
    reason?: string;
  };
  return (
    payload.message ??
    payload.title ??
    payload.summary ??
    payload.transcript ??
    payload.outputPreview ??
    payload.reason ??
    event.eventType
  ).slice(0, 240);
}

function normalizeReflection(output: string): string {
  return output
    .replace(/\s+/g, " ")
    .replace(/^[-*\d.\s]+/, "")
    .trim()
    .slice(0, 1200);
}

function buildMediaReflectionPromptV2(args: {
  campaignEvents: ArkheEvent[];
  topic: string;
  perf: { views: number; ctr: number; watchTimeAvgSec: number; retentionPct: number; subsDelta: number };
  performanceDeltaEst: number;
  priorReflections: string;
  reason: string;
  memoriesMd: string;
}): string {
  const compact = args.campaignEvents.map((event) => ({
    type: event.eventType,
    ts: event.ts,
    summary: summarizeEvent(event),
    topic: (event.payload as any)?.topic,
    opportunityScore: (event.payload as any)?.opportunityScore,
    views: (event.payload as any)?.views,
    ctr: (event.payload as any)?.ctr,
    retention: (event.payload as any)?.retentionPct,
    provider: (event.payload as any)?.videoProvider,
    asset: (event.payload as any)?.assetType,
  }));

  return [
    "You are the Dreaming Agent (Media) — the reflection specialist for Arkhe AgentOS Attention Cortex (Trend Intelligence → Opportunity → Content → Video Production → YouTube → Marketing → Analytics → dream → evolve).",
    "The system just completed an autonomous media mission and received real performance data. Your job is to close the learning loop.",
    "",
    "CRITICAL STRATEGY (must be referenced in your reasoning): 80% high-value content (AI tools 2026, productivity, local agents, SaaS, automation, marketing) + 20% meta ('how the Attention Cortex spotted the trend and manufactured the video').",
    "",
    `Campaign topic: ${args.topic}`,
    `Trigger: ${args.reason}`,
    `Computed performance delta estimate (from views/ctr/retention/subs): ${args.performanceDeltaEst.toFixed(3)}`,
    "",
    "Performance numbers:",
    JSON.stringify(args.perf, null, 2),
    "",
    "Why did this video (and the cortex pipeline that made it) perform the way it did? What should Trend Intelligence / Opportunity / Content / Video Production / YouTube / Marketing do differently next time?",
    "Be specific and actionable. Cite the 80/20 split at least once.",
    "Propose 0-3 synapse deltas between the named attention-cortex roles (use exact role names: 'Trend Intelligence Agent', 'Opportunity Agent', 'Content Agent', 'Video Production Agent', 'YouTube Agent', 'Marketing Agent', 'Analytics Agent'). Positive delta = strengthen pathway for next time; negative = weaken/adjust.",
    "If a new specialist role would have helped (e.g. 'Viral Hook Optimizer', 'Thumbnail Strategist'), propose it.",
    "",
    "Return a concise durable reflection + the structured fields below so it can be written to MEMORIES.md and used to update the Neural Mesh in real time.",
    "",
    "Existing MEMORIES.md (recent):",
    (args.memoriesMd || "").slice(-2200),
    "",
    "Prior media reflections (for continuity):",
    args.priorReflections || "(none)",
    "",
    "Recent campaign events (attention/media pipeline):",
    JSON.stringify(compact, null, 2),
    "",
    "OUTPUT FORMAT (parseable):",
    "REFLECTION: <2-4 sentence concise memory, must mention 80/20 strategy>",
    "PERF_DELTA: <float e.g. 0.09 or -0.04>",
    "SYNAPSE:",
    "Trend Intelligence Agent|Opportunity Agent|+0.04",
    "Content Agent|Video Production Agent|+0.07",
    "... (one per line or none)",
    "PROPOSED: <new role name or none>",
  ].join("\n");
}

function computePerformanceDelta(perf: { views?: number; ctr?: number; retentionPct?: number; subsDelta?: number }): number {
  const v = Math.min(1, (perf.views || 0) / 15000);
  const c = Math.min(1, (perf.ctr || 0) * 12);
  const r = Math.min(1, (perf.retentionPct || 50) / 100);
  const s = Math.min(1, Math.max(0, (perf.subsDelta || 0)) / 12);
  const raw = (v * 0.35 + c * 0.3 + r * 0.2 + s * 0.15) - 0.48;
  return Math.max(-0.28, Math.min(0.28, Number(raw.toFixed(3))));
}

function computeSynapseUpdatesFromPerf(perf: { views?: number; ctr?: number; retentionPct?: number; subsDelta?: number }, _topic: string): Array<{ sourceRole: string; targetRole: string; delta: number }> {
  const updates: Array<{ sourceRole: string; targetRole: string; delta: number }> = [];
  const good = ((perf.views || 0) > 6000) || ((perf.ctr || 0) > 0.055) || ((perf.retentionPct || 0) > 56) || ((perf.subsDelta || 0) > 4);
  if (good) {
    updates.push({ sourceRole: "Content Agent", targetRole: "Video Production Agent", delta: 0.07 });
    updates.push({ sourceRole: "Opportunity Agent", targetRole: "Content Agent", delta: 0.05 });
    updates.push({ sourceRole: "Trend Intelligence Agent", targetRole: "Opportunity Agent", delta: 0.04 });
    if ((perf.subsDelta || 0) > 2) {
      updates.push({ sourceRole: "Analytics Agent", targetRole: "Marketing Agent", delta: 0.04 });
    }
  } else {
    updates.push({ sourceRole: "Trend Intelligence Agent", targetRole: "Opportunity Agent", delta: -0.03 });
    updates.push({ sourceRole: "Content Agent", targetRole: "Video Production Agent", delta: -0.02 });
  }
  // Always a light tie from analytics back to content for retention/watch time learnings
  if ((perf.retentionPct || 50) < 58) {
    updates.push({ sourceRole: "Analytics Agent", targetRole: "Content Agent", delta: -0.015 });
  } else {
    updates.push({ sourceRole: "Analytics Agent", targetRole: "Content Agent", delta: 0.025 });
  }
  return updates;
}

function extractPriorAttentionReflections(md: string): string[] {
  const lines = md.split("\n");
  const chunks: string[] = [];
  let current = "";
  let inSection = false;
  for (const line of lines) {
    if (/^## .*Attention Cortex Reflection|^## Media Dream/i.test(line)) {
      if (current) chunks.push(current.trim());
      current = line + "\n";
      inSection = true;
    } else if (inSection) {
      current += line + "\n";
      if (/^## /.test(line) && !/^## .*Attention|^## Media/i.test(line)) {
        inSection = false;
      }
    }
  }
  if (current) chunks.push(current.trim());
  return chunks.slice(-3);
}

function parseMediaReflectionOutput(output: string): {
  reflection: string;
  perfDelta?: number;
  synapseUpdates: Array<{ sourceRole: string; targetRole: string; delta: number }>;
  proposedNewAgentRole?: string;
} {
  const text = (output || "").replace(/\r/g, "");
  const refMatch = text.match(/REFLECTION:\s*([\s\S]*?)(?=\n\s*(?:PERF_DELTA|PERFORMANCE_DELTA|SYNAPSE|PROPOSED|$))/i);
  const deltaMatch = text.match(/PERF_DELTA:\s*([+-]?\d+(?:\.\d+)?)/i);
  const proposedMatch = text.match(/PROPOSED:\s*([^\n]+)/i);
  const synapseBlock = text.match(/SYNAPSE:\s*([\s\S]*?)(?=\n\s*(?:PROPOSED|REFLECTION|$))/i);

  const reflection = (refMatch ? refMatch[1] : text).trim().replace(/\s+/g, " ").slice(0, 1100);
  const perfDelta = deltaMatch ? Number(deltaMatch[1]) : undefined;

  const updates: Array<{ sourceRole: string; targetRole: string; delta: number }> = [];
  if (synapseBlock && synapseBlock[1]) {
    const lines = synapseBlock[1].split(/\n+/);
    for (const ln of lines) {
      const m = ln.trim().match(/^([^|]+)\|([^|]+)\|([+-]?\d+(?:\.\d+)?)$/);
      if (m) {
        updates.push({
          sourceRole: m[1].trim(),
          targetRole: m[2].trim(),
          delta: Number(m[3]),
        });
      }
    }
  }

  const proposed = proposedMatch ? proposedMatch[1].trim().replace(/^["']|["']$/g, "") : undefined;
  const finalProposed = proposed && !/^(none|null|no|undefined)$/i.test(proposed) ? proposed : undefined;

  return { reflection, perfDelta, synapseUpdates: updates, proposedNewAgentRole: finalProposed };
}
