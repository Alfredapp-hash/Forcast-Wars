import type { ArkheEvent } from "@arkhe/contracts";
import { createEventId, SCHEMA_VERSION } from "@arkhe/contracts";
import type { ModelRouter } from "@arkhe/model-router";
import type { SupabaseSync } from "@arkhe/supabase-sync";
import type {
  AnalyticsIngestor,
  Publisher,
  TrendSignal,
  TrendSource,
  VideoAsset,
  VideoGenerator,
} from "./adapters/index.js";
import {
  StubAnalyticsIngestor,
  YouTubePublisher,
  KlingVideoGenerator,
  RunwayVideoGenerator,
  VeoVideoGenerator,
  HailuoVideoGenerator,
  XTrendsAdapter,
  YouTubeTrendsAdapter,
} from "./adapters/index.js";

/**
 * Attention Cortex — Trend Intelligence + Opportunity + full media loop (now with adapter boundaries).
 *
 * This is the bridge from pure stub to "real" external services (YouTube Data API, X, Reddit,
 * Google Trends, Veo/Runway/Kling/Hailuo video providers, YouTube publish, analytics ingest).
 *
 * Adapter interfaces (defined in adapters/):
 *   TrendSource.poll(): Promise<TrendSignal[]>
 *   VideoGenerator.generate(params): Promise<VideoAsset>
 *   Publisher.publishToYouTube(video, metadata): Promise<PublishResult>
 *   AnalyticsIngestor.fetchPerformance(externalId): Promise<MediaPerformance>
 *
 * Current status (alpha scaffolding):
 *   - All adapters have clean TS interfaces + minimal concrete stubs "real enough to demo".
 *   - YouTubeTrendsAdapter + XTrendsAdapter can be treated as the "real sources" path (curated
 *     high-signal returns; when env keys present they log the upgrade intent).
 *   - Video generators (Kling/Runway/Veo/Hailuo) log the chosen provider + TODO notes for the
 *     real HTTP/auth/polling impls.
 *   - Secrets never in code; only process.env (YOUTUBE_API_KEY, KLING_API_KEY, RUNWAY_API_KEY,
 *     GOOGLE_GENAI_API_KEY | VEO_API_KEY, HAILUO_API_KEY, X_BEARER_TOKEN, ...).
 *   - 80/20 content rule and video model policy (Grok for ideation only) are preserved in the
 *     emitted events and documented in docs/AI_STACK.md.
 *
 * Flip to real sources: pass { realSources: true } or inject your own TrendSource[] into scan().
 * The orchestrator itself knows nothing about specific APIs.
 */

export interface AttentionScanOptions {
  sources?: string[];
  /** Inject concrete trend sources (bypasses internal decision). */
  trendSources?: TrendSource[];
  /** When true (and no explicit trendSources), use the default "real-ish" adapters (YouTube + X). */
  realSources?: boolean;
  maxOpportunities?: number;
}

export class AttentionOrchestrator {
  private readonly defaultTrendSources: TrendSource[];
  // _defaultVideoGenerator scaffolded for attn-big real adapters (not yet selected per-opportunity)
  private readonly publisher: Publisher;
  private readonly analytics: AnalyticsIngestor;

  constructor(
    private readonly publish: (e: ArkheEvent) => void,
    // modelRouter and supabaseSync are captured for the full implementation
    // (content generation, performance-backed reflections, persistence of media_* rows).
    _modelRouter: ModelRouter,
    _supabaseSync?: SupabaseSync,
    injected?: {
      trendSources?: TrendSource[];
      videoGenerator?: VideoGenerator;
      publisher?: Publisher;
      analytics?: AnalyticsIngestor;
    }
  ) {
    // Injected or sensible defaults (stubs that are interface-complete and upgrade-ready).
    this.defaultTrendSources =
      injected?.trendSources ?? [new YouTubeTrendsAdapter(), new XTrendsAdapter()];
    // videoGenerator injection point left for attn-big real adapters (Veo/Runway/Kling/Hailuo selection)
    void injected?.videoGenerator;
    this.publisher = injected?.publisher ?? new YouTubePublisher();
    this.analytics = injected?.analytics ?? new StubAnalyticsIngestor();

    // Intentionally capture for future expansion of the Autonomous Media Company loop.
    void _modelRouter;
    void _supabaseSync;
  }

  async scan(opts: AttentionScanOptions = {}): Promise<void> {
    const scanId = createEventId();
    const ts = new Date().toISOString();

    this.publish({
      id: scanId,
      ts,
      schemaVersion: SCHEMA_VERSION,
      eventType: "attention.scan.started",
      payload: {
        summary: "Attention Cortex daily/voice-triggered scan",
        tags: ["attention", "trend"],
      },
    } as any);

    // Determine source set: explicit > realSources flag > legacy mock path (for qa compat).
    let activeTrends: TrendSignal[];
    const explicit = opts.trendSources && opts.trendSources.length > 0;
    const useReal = !explicit && opts.realSources === true;

    if (explicit) {
      const polled = await Promise.all(
        opts.trendSources!.map(async (src) => {
          try {
            return await src.poll();
          } catch (e) {
            console.error(`[attention] trend source ${src.name} failed:`, e);
            return [] as TrendSignal[];
          }
        })
      );
      activeTrends = polled.flat();
    } else if (useReal) {
      const polled = await Promise.all(
        this.defaultTrendSources.map(async (src) => {
          try {
            return await src.poll();
          } catch (e) {
            console.error(`[attention] trend source ${src.name} failed:`, e);
            return [] as TrendSignal[];
          }
        })
      );
      activeTrends = polled.flat();
    } else {
      // Legacy mock path — keeps exact same events for qa:alpha and voice/manual triggers.
      // (The mock data is intentionally left here for zero-behavior-change on the default scan path.)
      activeTrends = [
        {
          source: "youtube",
          topic: "AI tools 2026",
          velocity: 12400,
          searchGrowthPct: 410,
          competitionScore: 28,
        },
        {
          source: "x",
          topic: "local AI agents on Mac",
          velocity: 8900,
          searchGrowthPct: 260,
          competitionScore: 41,
        },
        {
          source: "reddit",
          topic: "building with Playwright + agents",
          velocity: 3200,
          searchGrowthPct: 180,
          competitionScore: 55,
        },
      ];
    }

    for (const t of activeTrends) {
      this.publish({
        id: createEventId(),
        ts: new Date().toISOString(),
        schemaVersion: SCHEMA_VERSION,
        eventType: "trend.detected",
        payload: {
          source: t.source,
          topic: t.topic,
          velocity: t.velocity,
          searchGrowthPct: t.searchGrowthPct,
          competitionScore: t.competitionScore,
          tags: ["attention", "trend"],
        },
      } as any);
    }

    // Opportunity scoring (the "filter" that only lets high-value ideas through)
    const scored = activeTrends
      .map((t) => ({
        ...t,
        opportunityScore: Math.round(
          0.5 * Math.min(100, t.searchGrowthPct / 4) +
            0.3 * (100 - t.competitionScore) +
            0.2 * Math.min(100, t.velocity / 150),
        ),
      }))
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, opts.maxOpportunities ?? 5);

    for (const o of scored) {
      this.publish({
        id: createEventId(),
        ts: new Date().toISOString(),
        schemaVersion: SCHEMA_VERSION,
        eventType: "opportunity.scored",
        payload: {
          topic: o.topic,
          opportunityScore: o.opportunityScore,
          searchGrowthPct: o.searchGrowthPct,
          competitionScore: o.competitionScore,
          reason:
            o.opportunityScore > 75
              ? "High growth, manageable competition, strong brand fit for an agent OS"
              : "Moderate signal — keep for later or niche repurposing",
          tags: ["attention", "opportunity"],
        },
      } as any);

      if (o.opportunityScore >= 75) {
        this.publish({
          id: createEventId(),
          ts: new Date().toISOString(),
          schemaVersion: SCHEMA_VERSION,
          eventType: "opportunity.selected",
          payload: {
            topic: o.topic,
            opportunityScore: o.opportunityScore,
            summary: `Selected for full media mission: ${o.topic}`,
            tags: ["attention", "opportunity"],
          },
        } as any);

        // Kick off the rest of the pipeline (content → video (via adapter) → publish (via adapter) → analytics (via adapter))
        await this.runMediaPipeline(o.topic, o.opportunityScore);
      }
    }

    this.publish({
      id: createEventId(),
      ts: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      eventType: "attention.scan.completed",
      payload: {
        summary: `${scored.length} opportunities scored, ${scored.filter((s) => s.opportunityScore >= 75).length} selected for production`,
        tags: ["attention"],
      },
    } as any);
  }

  private async runMediaPipeline(topic: string, score: number): Promise<void> {
    const now = new Date().toISOString();

    // Content Agent output (80/20 valuable + meta)
    this.publish({
      id: createEventId(),
      ts: now,
      schemaVersion: SCHEMA_VERSION,
      eventType: "content.generated",
      payload: {
        assetType: "script",
        title: `Top Signals: ${topic}`,
        summary: `Hook + 8-point script. 80% actionable AI/productivity insight. 20% meta: how the Attention Cortex spotted the trend and why the system chose to produce it today.`,
        tags: ["attention", "content"],
      },
    } as any);

    // Video Production — now actually goes through a VideoGenerator adapter.
    // Choice policy matches guidance: Veo for top realism/story, Kling for fast social, etc.
    const chosenProvider = score > 88 ? "veo" : score > 80 ? "kling" : "runway";
    const generator = this.chooseVideoGenerator(chosenProvider);
    const asset: VideoAsset = await generator.generate({
      topic,
      opportunityScore: score,
    });

    this.publish({
      id: createEventId(),
      ts: now,
      schemaVersion: SCHEMA_VERSION,
      eventType: "video.produced",
      payload: {
        // Preserve prior payload shape for compatibility while recording adapter choice.
        videoProvider: asset.provider,
        videoModel: asset.model,
        durationSec: asset.durationSec,
        style: asset.style,
        summary: `Generated with ${asset.provider} (${asset.model}). Voiceover + auto captions + end screen.`,
        tags: ["attention", "video"],
      },
    } as any);

    // Publish via adapter (records real externalId/url for downstream analytics + dreaming).
    const metadata = {
      title: `Top Signals: ${topic}`,
      description: `Hook + 8-point script. 80% actionable AI/productivity insight. 20% meta: how the Attention Cortex spotted the trend and why the system chose to produce it today.`,
      tags: ["ai", "agents", "automation", "arkhe"],
    };
    const pub = await this.publisher.publishToYouTube(asset, metadata);

    this.publish({
      id: createEventId(),
      ts: now,
      schemaVersion: SCHEMA_VERSION,
      eventType: "video.published",
      payload: {
        platform: pub.platform,
        url: pub.url,
        externalId: pub.externalId,
        summary: `Uploaded with full metadata, chapters, and 80/20 description.`,
        tags: ["attention", "publish"],
      },
    } as any);

    // Immediate post-publish marketing amplification (still event-driven for now).
    this.publish({
      id: createEventId(),
      ts: now,
      schemaVersion: SCHEMA_VERSION,
      eventType: "publish.scheduled",
      payload: {
        platform: "x",
        summary: "X thread + LinkedIn post scheduled from performance templates",
        tags: ["attention", "marketing"],
      },
    } as any);

    // Analytics via adapter (stub returns improving numbers; real one would poll real metrics).
    // We keep the setTimeout to simulate "arriving later" even though the fetch is sync in stub.
    setTimeout(async () => {
      try {
        const perf = await this.analytics.fetchPerformance(pub.externalId);
        this.publish({
          id: createEventId(),
          ts: new Date().toISOString(),
          schemaVersion: SCHEMA_VERSION,
          eventType: "analytics.media.report",
          payload: {
            views: perf.views,
            ctr: perf.ctr,
            watchTimeAvgSec: perf.watchTimeAvgSec,
            retentionPct: perf.retentionPct,
            subsDelta: perf.subsDelta,
            summary: `Early performance for "${topic}". Strong hook, retention dip at 47s suggests tighter B-roll.`,
            tags: ["attention", "analytics"],
          },
        } as any);
      } catch (e) {
        console.error("[attention] analytics ingest failed:", e);
      }
    }, 900);
  }

  private chooseVideoGenerator(
    provider: "veo" | "kling" | "runway" | "hailuo"
  ): VideoGenerator {
    // Instantiate the score-selected concrete generator (stateless stubs with clear TODOs for real clients).
    // If a full custom VideoGenerator was injected that can service any provider, callers can bypass
    // chooseVideoGenerator and call this._defaultVideoGenerator directly; for the built-in path we
    // honor the policy choice (Veo high-score, Kling fast, etc.) so the event records the intended model.
    switch (provider) {
      case "veo":
        return new VeoVideoGenerator();
      case "kling":
        return new KlingVideoGenerator();
      case "runway":
        return new RunwayVideoGenerator();
      case "hailuo":
      default:
        return new HailuoVideoGenerator();
    }
  }
}
