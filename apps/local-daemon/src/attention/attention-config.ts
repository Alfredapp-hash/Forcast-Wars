import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const DEFAULT_TREND_QUERY = "AI agents automation";
const DEFAULT_X_TREND_QUERY = "AI agents OR local automation lang:en -is:retweet";

export interface AttentionConfigFile {
  youtubeApiKey?: string;
  youtubeTrendQuery?: string;
  youtubeRefreshToken?: string;
  xBearerToken?: string;
  xTrendQuery?: string;
  lastPollAt?: string;
  lastPollOk?: boolean;
  xLastPollAt?: string;
  xLastPollOk?: boolean;
}

/** Public view — never includes full secrets. */
export interface AttentionConfigStatus {
  youtubeApiKeyConfigured: boolean;
  youtubeApiKeyMasked: string | null;
  youtubeTrendQuery: string;
  youtubeRefreshTokenConfigured: boolean;
  youtubeRefreshTokenMasked: string | null;
  lastPollAt: string | null;
  lastPollOk: boolean | null;
  xBearerTokenConfigured: boolean;
  xBearerTokenMasked: string | null;
  xTrendQuery: string;
  xLastPollAt: string | null;
  xLastPollOk: boolean | null;
}

export interface AttentionConfigUpdate {
  youtubeApiKey?: string | null;
  youtubeTrendQuery?: string;
  youtubeRefreshToken?: string | null;
  xBearerToken?: string | null;
  xTrendQuery?: string;
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export class AttentionConfigStore {
  private filePath: string;
  private config: AttentionConfigFile = {};

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "attention-config.json");
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      this.config = JSON.parse(raw) as AttentionConfigFile;
    } catch {
      this.config = {};
    }
    this.applyToEnv();
  }

  applyToEnv(): void {
    const youtubeKey = this.config.youtubeApiKey ?? process.env.YOUTUBE_API_KEY;
    const youtubeQuery =
      this.config.youtubeTrendQuery ?? process.env.YOUTUBE_TREND_QUERY ?? DEFAULT_TREND_QUERY;
    const refreshToken =
      this.config.youtubeRefreshToken ?? process.env.YOUTUBE_REFRESH_TOKEN;
    const xToken = this.config.xBearerToken ?? process.env.X_BEARER_TOKEN;
    const xQuery = this.config.xTrendQuery ?? process.env.X_TREND_QUERY ?? DEFAULT_X_TREND_QUERY;

    if (youtubeKey) {
      process.env.YOUTUBE_API_KEY = youtubeKey;
    } else {
      delete process.env.YOUTUBE_API_KEY;
    }
    process.env.YOUTUBE_TREND_QUERY = youtubeQuery;

    if (refreshToken) {
      process.env.YOUTUBE_REFRESH_TOKEN = refreshToken;
    } else {
      delete process.env.YOUTUBE_REFRESH_TOKEN;
    }

    if (xToken) {
      process.env.X_BEARER_TOKEN = xToken;
    } else {
      delete process.env.X_BEARER_TOKEN;
    }
    process.env.X_TREND_QUERY = xQuery;
  }

  getStatus(): AttentionConfigStatus {
    const youtubeKey = this.config.youtubeApiKey ?? process.env.YOUTUBE_API_KEY;
    const youtubeQuery =
      this.config.youtubeTrendQuery ??
      process.env.YOUTUBE_TREND_QUERY ??
      DEFAULT_TREND_QUERY;
    const refreshToken =
      this.config.youtubeRefreshToken ?? process.env.YOUTUBE_REFRESH_TOKEN;
    const xToken = this.config.xBearerToken ?? process.env.X_BEARER_TOKEN;
    const xQuery =
      this.config.xTrendQuery ?? process.env.X_TREND_QUERY ?? DEFAULT_X_TREND_QUERY;

    return {
      youtubeApiKeyConfigured: Boolean(youtubeKey),
      youtubeApiKeyMasked: youtubeKey ? maskApiKey(youtubeKey) : null,
      youtubeTrendQuery: youtubeQuery,
      youtubeRefreshTokenConfigured: Boolean(refreshToken),
      youtubeRefreshTokenMasked: refreshToken ? maskApiKey(refreshToken) : null,
      lastPollAt: this.config.lastPollAt ?? null,
      lastPollOk: this.config.lastPollOk ?? null,
      xBearerTokenConfigured: Boolean(xToken),
      xBearerTokenMasked: xToken ? maskApiKey(xToken) : null,
      xTrendQuery: xQuery,
      xLastPollAt: this.config.xLastPollAt ?? null,
      xLastPollOk: this.config.xLastPollOk ?? null,
    };
  }

  async update(partial: AttentionConfigUpdate): Promise<AttentionConfigStatus> {
    if (partial.youtubeApiKey !== undefined) {
      const trimmed = partial.youtubeApiKey?.trim();
      if (trimmed) {
        this.config.youtubeApiKey = trimmed;
      } else {
        delete this.config.youtubeApiKey;
      }
    }
    if (partial.youtubeTrendQuery !== undefined) {
      const trimmed = partial.youtubeTrendQuery.trim() || DEFAULT_TREND_QUERY;
      this.config.youtubeTrendQuery = trimmed;
    }
    if (partial.youtubeRefreshToken !== undefined) {
      const trimmed = partial.youtubeRefreshToken?.trim();
      if (trimmed) {
        this.config.youtubeRefreshToken = trimmed;
      } else {
        delete this.config.youtubeRefreshToken;
      }
    }
    if (partial.xBearerToken !== undefined) {
      const trimmed = partial.xBearerToken?.trim();
      if (trimmed) {
        this.config.xBearerToken = trimmed;
      } else {
        delete this.config.xBearerToken;
      }
    }
    if (partial.xTrendQuery !== undefined) {
      const trimmed = partial.xTrendQuery.trim() || DEFAULT_X_TREND_QUERY;
      this.config.xTrendQuery = trimmed;
    }

    this.applyToEnv();
    await this.persist();
    return this.getStatus();
  }

  async recordPollResult(ok: boolean): Promise<void> {
    this.config.lastPollAt = new Date().toISOString();
    this.config.lastPollOk = ok;
    await this.persist();
  }

  async recordXPollResult(ok: boolean): Promise<void> {
    this.config.xLastPollAt = new Date().toISOString();
    this.config.xLastPollOk = ok;
    await this.persist();
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.config, null, 2), "utf8");
  }
}

let store: AttentionConfigStore | null = null;

export function initAttentionConfig(dataDir: string): AttentionConfigStore {
  store = new AttentionConfigStore(dataDir);
  return store;
}

export function getAttentionConfigStore(): AttentionConfigStore {
  if (!store) {
    throw new Error("[attention-config] not initialized — call initAttentionConfig on daemon boot");
  }
  return store;
}

/** No-op when store is not initialized (e.g. isolated adapter tests). */
export async function recordYouTubePollResult(ok: boolean): Promise<void> {
  if (!store) return;
  await store.recordPollResult(ok).catch(() => undefined);
}

/** No-op when store is not initialized (e.g. isolated adapter tests). */
export async function recordXPollResult(ok: boolean): Promise<void> {
  if (!store) return;
  await store.recordXPollResult(ok).catch(() => undefined);
}
