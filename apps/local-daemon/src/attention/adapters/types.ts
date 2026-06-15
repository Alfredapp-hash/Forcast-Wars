/**
 * Shared adapter interfaces + value types for the Attention Cortex (attn-big).
 *
 * These are the clean boundaries between the orchestrator and external services
 * (YouTube Data, X/Twitter, Reddit, Google Trends, Veo/Runway/Kling/Hailuo, YouTube publish, analytics ingest).
 *
 * Core rule: the AttentionOrchestrator (and callers) never import provider SDKs directly.
 * All secrets via process.env only (never committed).
 */

export interface TrendSignal {
  source: "youtube" | "x" | "reddit" | "google_trends" | "tiktok" | "shorts" | "search_console" | "internal" | string;
  topic: string;
  velocity: number; // rough engagement / views velocity
  searchGrowthPct: number; // e.g. 390 for +390%
  competitionScore: number; // 0-100, lower is better (less crowded)
}

export interface TrendSource {
  readonly name: string;
  poll(): Promise<TrendSignal[]>;
}

// Video side

export interface VideoGenerationParams {
  topic: string;
  opportunityScore: number;
  scriptSummary?: string;
  durationHintSec?: number;
}

export interface VideoAsset {
  assetId: string;
  provider: "veo" | "runway" | "kling" | "hailuo";
  model: string;
  durationSec: number;
  style?: string;
  /** Remote provider job id (Kling/Runway task id) — used for artifact lookup. */
  remoteJobId?: string;
  /** Absolute or cwd-relative path to a video file on disk (mp4/mov/webm). */
  localPath?: string;
  /** Relative path under ~/.arkhe/artifacts/ (e.g. missionId/video.mp4). */
  storageRef?: string;
}

export interface VideoGenerator {
  readonly provider: "veo" | "runway" | "kling" | "hailuo";
  generate(params: VideoGenerationParams): Promise<VideoAsset>;
}

// Publish

export interface PublishMetadata {
  title: string;
  description: string;
  tags?: string[];
  // chapters, thumbnailRef, playlist, visibility, etc.
}

export interface PublishResult {
  platform: "youtube";
  externalId: string;
  url: string;
  scheduled?: boolean;
}

export interface Publisher {
  publishToYouTube(video: VideoAsset, metadata: PublishMetadata): Promise<PublishResult>;
}

// Analytics

export interface MediaPerformance {
  views: number;
  ctr: number;
  watchTimeAvgSec: number;
  retentionPct: number;
  subsDelta: number;
}

export interface AnalyticsIngestor {
  fetchPerformance(externalId: string): Promise<MediaPerformance>;
}
