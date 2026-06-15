import type { AnalyticsIngestor, MediaPerformance } from "./types.js";

/**
 * AnalyticsIngestor adapters.
 *
 * After publish we (a) immediately have the externalId, (b) later poll or receive webhooks
 * for real performance (views, CTR, audience retention graph, subs, revenue, etc.).
 *
 * Real implementations would:
 * - YouTube: youtubeAnalytics + reports.query (needs OAuth) or Data API for public stats.
 * - Also cross-ref X/Reddit engagement if cross-posted.
 * - Persist rows to media_performances (future Supabase table) and feed Dreaming (Media).
 *
 * Stub here returns plausible improving numbers on repeated calls (simulates time passing).
 */
export type { MediaPerformance, AnalyticsIngestor };

export class StubAnalyticsIngestor implements AnalyticsIngestor {
  private invocations = 0;

  async fetchPerformance(_externalId: string): Promise<MediaPerformance> {
    this.invocations += 1;
    // Simulate "time passes / more data arrives" — each call looks a bit better (or reveals issues).
    const factor = this.invocations;

    return {
      views: Math.floor(8200 + factor * 2800 + Math.random() * 400),
      ctr: Math.min(0.18, 0.067 + factor * 0.0045),
      watchTimeAvgSec: Math.floor(49 + factor * 3.8),
      retentionPct: Math.min(82, 59 + factor * 2.8),
      subsDelta: Math.floor(95 + factor * 38),
    };
  }
}
