import type { TrendSignal, TrendSource } from "./types.js";
import { recordXPollResult, recordYouTubePollResult } from "../attention-config.js";

/**
 * TrendSource adapters — the "real polling path" entry for Attention Cortex (attn-big).
 */

export type { TrendSignal, TrendSource };

const YOUTUBE_CURATED_FALLBACK: TrendSignal[] = [
  {
    source: "youtube",
    topic: "AI agents on Mac and local automation",
    velocity: 13400,
    searchGrowthPct: 390,
    competitionScore: 29,
  },
  {
    source: "youtube",
    topic: "building reliable agent loops 2026",
    velocity: 7600,
    searchGrowthPct: 210,
    competitionScore: 44,
  },
];

const X_CURATED_FALLBACK: TrendSignal[] = [
  {
    source: "x",
    topic: "local AI agents on Mac",
    velocity: 9200,
    searchGrowthPct: 275,
    competitionScore: 38,
  },
];

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: { title?: string; publishedAt?: string; channelTitle?: string };
}

interface YouTubeVideoItem {
  id?: string;
  snippet?: { title?: string; publishedAt?: string; channelTitle?: string };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
}

interface XTweet {
  id?: string;
  text?: string;
  created_at?: string;
  public_metrics?: {
    retweet_count?: number;
    reply_count?: number;
    like_count?: number;
    quote_count?: number;
    impression_count?: number;
  };
}

/**
 * YouTubeTrendsAdapter — YouTube Data API v3 search + videos.list statistics.
 *
 * Env:
 *   YOUTUBE_API_KEY=...
 *   YOUTUBE_TREND_QUERY=...   (optional, default "AI agents automation")
 */
export class YouTubeTrendsAdapter implements TrendSource {
  readonly name = "youtube" as const;

  async poll(): Promise<TrendSignal[]> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.warn("[attention:youtube] YOUTUBE_API_KEY not set — using curated fallback signals.");
      void recordYouTubePollResult(false);
      return YOUTUBE_CURATED_FALLBACK;
    }

    try {
      const query = process.env.YOUTUBE_TREND_QUERY ?? "AI agents automation";
      const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("maxResults", "8");
      searchUrl.searchParams.set("q", query);
      searchUrl.searchParams.set("type", "video");
      searchUrl.searchParams.set("order", "viewCount");
      searchUrl.searchParams.set("publishedAfter", publishedAfterIso(14));
      searchUrl.searchParams.set("key", apiKey);

      const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(12_000) });
      if (!searchRes.ok) {
        const body = await searchRes.text().catch(() => "");
        console.warn(`[attention:youtube] search failed ${searchRes.status}: ${body.slice(0, 200)}`);
        void recordYouTubePollResult(false);
        return YOUTUBE_CURATED_FALLBACK;
      }

      const searchData = (await searchRes.json()) as { items?: YouTubeSearchItem[] };
      const videoIds = (searchData.items ?? [])
        .map((item) => item.id?.videoId)
        .filter((id): id is string => Boolean(id));

      if (videoIds.length === 0) {
        console.warn("[attention:youtube] search returned no videos — using curated fallback.");
        void recordYouTubePollResult(false);
        return YOUTUBE_CURATED_FALLBACK;
      }

      const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
      statsUrl.searchParams.set("part", "statistics,snippet");
      statsUrl.searchParams.set("id", videoIds.join(","));
      statsUrl.searchParams.set("key", apiKey);

      const statsRes = await fetch(statsUrl, { signal: AbortSignal.timeout(12_000) });
      if (!statsRes.ok) {
        console.warn(`[attention:youtube] videos.list failed ${statsRes.status}`);
        return mapSearchOnly(searchData.items ?? []);
      }

      const statsData = (await statsRes.json()) as { items?: YouTubeVideoItem[] };
      const signals = (statsData.items ?? [])
        .map((item) => mapVideoToSignal(item))
        .filter((s): s is TrendSignal => s !== null)
        .sort((a, b) => b.velocity - a.velocity)
        .slice(0, 5);

      if (signals.length === 0) {
        void recordYouTubePollResult(false);
        return YOUTUBE_CURATED_FALLBACK;
      }

      console.log(`[attention:youtube] polled ${signals.length} real trend signals (query="${query}")`);
      void recordYouTubePollResult(true);
      return signals;
    } catch (error) {
      console.warn(
        "[attention:youtube] poll error — using curated fallback:",
        error instanceof Error ? error.message : String(error)
      );
      void recordYouTubePollResult(false);
      return YOUTUBE_CURATED_FALLBACK;
    }
  }
}

/**
 * XTrendsAdapter — X API v2 tweets/search/recent with public_metrics heuristics.
 *
 * Env:
 *   X_BEARER_TOKEN=...
 *   X_TREND_QUERY=...   (optional, default "AI agents OR local automation lang:en -is:retweet")
 */
export class XTrendsAdapter implements TrendSource {
  readonly name = "x" as const;

  async poll(): Promise<TrendSignal[]> {
    const bearerToken = process.env.X_BEARER_TOKEN;
    if (!bearerToken) {
      console.warn("[attention:x] X_BEARER_TOKEN not set — using curated fallback signals.");
      void recordXPollResult(false);
      return X_CURATED_FALLBACK;
    }

    try {
      const query =
        process.env.X_TREND_QUERY ?? "AI agents OR local automation lang:en -is:retweet";
      const searchUrl = new URL("https://api.twitter.com/2/tweets/search/recent");
      searchUrl.searchParams.set("query", query);
      searchUrl.searchParams.set("max_results", "10");
      searchUrl.searchParams.set("tweet.fields", "public_metrics,created_at,text");

      const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${bearerToken}` },
        signal: AbortSignal.timeout(12_000),
      });

      if (!searchRes.ok) {
        const body = await searchRes.text().catch(() => "");
        console.warn(`[attention:x] search/recent failed ${searchRes.status}: ${body.slice(0, 200)}`);
        void recordXPollResult(false);
        return X_CURATED_FALLBACK;
      }

      const searchData = (await searchRes.json()) as { data?: XTweet[] };
      const tweets = searchData.data ?? [];

      if (tweets.length === 0) {
        console.warn("[attention:x] search returned no tweets — using curated fallback.");
        void recordXPollResult(false);
        return X_CURATED_FALLBACK;
      }

      const signals = tweets
        .map((tweet) => mapTweetToSignal(tweet))
        .filter((s): s is TrendSignal => s !== null)
        .sort((a, b) => b.velocity - a.velocity)
        .slice(0, 5);

      if (signals.length === 0) {
        void recordXPollResult(false);
        return X_CURATED_FALLBACK;
      }

      console.log(`[attention:x] polled ${signals.length} real trend signals (query="${query}")`);
      void recordXPollResult(true);
      return signals;
    } catch (error) {
      console.warn(
        "[attention:x] poll error — using curated fallback:",
        error instanceof Error ? error.message : String(error)
      );
      void recordXPollResult(false);
      return X_CURATED_FALLBACK;
    }
  }
}

function mapTweetToSignal(tweet: XTweet): TrendSignal | null {
  const text = tweet.text?.trim();
  if (!text) return null;

  const metrics = tweet.public_metrics ?? {};
  const likes = metrics.like_count ?? 0;
  const retweets = metrics.retweet_count ?? 0;
  const replies = metrics.reply_count ?? 0;
  const quotes = metrics.quote_count ?? 0;
  const impressions = metrics.impression_count ?? 0;
  const engagement = likes + retweets + replies + quotes;

  const ageDays = tweet.created_at ? daysSince(tweet.created_at) : 1;
  const engagementPerDay = ageDays > 0 ? engagement / ageDays : engagement;
  const impressionsPerDay = ageDays > 0 && impressions > 0 ? impressions / ageDays : engagementPerDay * 20;

  const engagementRate = impressions > 0 ? (engagement / impressions) * 100 : 0;
  const searchGrowthPct = Math.min(
    999,
    Math.round(engagementPerDay / 3 + engagementRate * 12 + retweets * 2)
  );
  const competitionScore = Math.max(
    5,
    Math.min(95, Math.round(100 - Math.log10(Math.max(impressionsPerDay, 1)) * 10))
  );

  const topic = text.length > 120 ? `${text.slice(0, 117)}…` : text;

  return {
    source: "x",
    topic,
    velocity: Math.round(engagementPerDay),
    searchGrowthPct,
    competitionScore,
  };
}

function mapVideoToSignal(item: YouTubeVideoItem): TrendSignal | null {
  const title = item.snippet?.title?.trim();
  if (!title) return null;

  const views = Number(item.statistics?.viewCount ?? 0);
  const likes = Number(item.statistics?.likeCount ?? 0);
  const comments = Number(item.statistics?.commentCount ?? 0);
  const publishedAt = item.snippet?.publishedAt;
  const ageDays = publishedAt ? daysSince(publishedAt) : 7;
  const viewsPerDay = ageDays > 0 ? views / ageDays : views;

  const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;
  const searchGrowthPct = Math.min(999, Math.round(viewsPerDay / 50 + engagementRate * 8));
  const competitionScore = Math.max(
    5,
    Math.min(95, Math.round(100 - Math.log10(Math.max(views, 1)) * 12))
  );

  return {
    source: "youtube",
    topic: title,
    velocity: Math.round(viewsPerDay),
    searchGrowthPct,
    competitionScore,
  };
}

function mapSearchOnly(items: YouTubeSearchItem[]): TrendSignal[] {
  const signals: TrendSignal[] = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const title = item.snippet?.title?.trim();
    if (!title) continue;
    const ageDays = item.snippet?.publishedAt ? daysSince(item.snippet.publishedAt) : 7;
    const searchGrowthPct = ageDays < 3 ? 400 + index * 20 : Math.max(50, 300 - index * 40);
    signals.push({
      source: "youtube",
      topic: title,
      velocity: Math.max(500, Math.round(8000 / (index + 1))),
      searchGrowthPct,
      competitionScore: 30 + index * 8,
    });
  }
  return signals;
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 7;
  return Math.max(1, (Date.now() - then) / (1000 * 60 * 60 * 24));
}

function publishedAfterIso(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}
