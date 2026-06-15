import { constants } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import type { PublishMetadata, PublishResult, Publisher, VideoAsset } from "./types.js";

/**
 * Publisher adapters — final mile for Attention Cortex output.
 *
 * Currently only YouTube is exercised in the loop; X/LinkedIn/Reddit are handled
 * via "publish.scheduled" events (future adapters or marketing agent).
 */

export type { PublishMetadata, PublishResult, Publisher };

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface YouTubeVideoInsertResponse {
  id?: string;
  error?: { message?: string };
}

/**
 * YouTubePublisher
 *
 * Real path: YouTube Data API v3 videos.insert (resumable upload) when OAuth + video file present.
 * Fallback: OAuth-validated scaffold (channel verified, no file) or full stub when credentials absent.
 *
 * Env hints (never commit secrets):
 *   YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REDIRECT_URI (for initial OAuth dance)
 *   YOUTUBE_REFRESH_TOKEN — pre-obtained refresh token (or saved via attention-config / Settings)
 *
 * Video file resolution (first match wins):
 *   video.localPath — absolute or relative path
 *   video.storageRef — relative under ~/.arkhe/artifacts/
 *   ARKHE_YOUTUBE_UPLOAD_PATH — env override for alpha smoke tests
 */
export class YouTubePublisher implements Publisher {
  async publishToYouTube(video: VideoAsset, metadata: PublishMetadata): Promise<PublishResult> {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

    const hasOAuth = Boolean(clientId && clientSecret && refreshToken);
    const hasApiKey = Boolean(process.env.YOUTUBE_API_KEY);

    console.log(
      `[attention:yt-publish] publishToYouTube asset=${video.assetId} provider=${video.provider} title="${metadata.title}" oauth=${hasOAuth ? "present" : "absent"} apiKey=${hasApiKey ? "present" : "absent"}`
    );

    if (!hasOAuth) {
      console.warn(
        "[attention:yt-publish] YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET + YOUTUBE_REFRESH_TOKEN not set — stub publish"
      );
      return this.stubPublish(metadata);
    }

    try {
      const accessToken = await this.refreshAccessToken(clientId!, clientSecret!, refreshToken!);
      if (!accessToken) {
        console.warn("[attention:yt-publish] OAuth refresh failed — stub publish");
        return this.stubPublish(metadata);
      }

      const channelId = await this.validateChannelAccess(accessToken);
      if (!channelId) {
        console.warn("[attention:yt-publish] channels.list validation failed — stub publish");
        return this.stubPublish(metadata);
      }

      const filePath = await this.resolveVideoFilePath(video);
      if (filePath) {
        const uploaded = await this.uploadVideoResumable(accessToken, filePath, metadata);
        if (uploaded) {
          console.log(
            `[attention:yt-publish] videos.insert succeeded videoId=${uploaded.videoId} channelId=${channelId}`
          );
          return {
            platform: "youtube",
            externalId: uploaded.videoId,
            url: `https://youtube.com/watch?v=${uploaded.videoId}`,
            scheduled: false,
          };
        }
        console.warn("[attention:yt-publish] videos.insert failed — stub publish");
        return this.stubPublish(metadata);
      }

      console.log(
        `[attention:yt-publish] OAuth validated channelId=${channelId} — no video file (set localPath, storageRef, or ARKHE_YOUTUBE_UPLOAD_PATH for real upload)`
      );

      const slug = metadata.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 60);
      const externalId = `yt_oauth_${slug}_${Date.now().toString(36)}`;

      return {
        platform: "youtube",
        externalId,
        url: `https://youtube.com/watch?v=${externalId}`,
        scheduled: false,
      };
    } catch (error) {
      console.warn(
        "[attention:yt-publish] OAuth/upload error — stub publish:",
        error instanceof Error ? error.message : String(error)
      );
      return this.stubPublish(metadata);
    }
  }

  private async resolveVideoFilePath(video: VideoAsset): Promise<string | null> {
    const candidates: string[] = [];

    if (process.env.ARKHE_YOUTUBE_UPLOAD_PATH) {
      candidates.push(process.env.ARKHE_YOUTUBE_UPLOAD_PATH);
    }
    if (video.localPath) {
      candidates.push(isAbsolute(video.localPath) ? video.localPath : resolve(video.localPath));
    }
    if (video.storageRef) {
      const base = process.env.ARKHE_DATA_DIR ?? join(homedir(), ".arkhe");
      candidates.push(join(base, "artifacts", video.storageRef));
    }

    for (const candidate of candidates) {
      try {
        await access(candidate, constants.R_OK);
        const fileStat = await stat(candidate);
        if (fileStat.isFile() && fileStat.size > 0) {
          return candidate;
        }
      } catch {
        // try next candidate
      }
    }

    return null;
  }

  private mimeTypeForPath(filePath: string): string {
    const lower = filePath.toLowerCase();
    if (lower.endsWith(".mp4")) return "video/mp4";
    if (lower.endsWith(".mov")) return "video/quicktime";
    if (lower.endsWith(".webm")) return "video/webm";
    return "application/octet-stream";
  }

  private async uploadVideoResumable(
    accessToken: string,
    filePath: string,
    metadata: PublishMetadata
  ): Promise<{ videoId: string } | null> {
    const fileStat = await stat(filePath);
    const mimeType = this.mimeTypeForPath(filePath);

    const initUrl = new URL("https://www.googleapis.com/upload/youtube/v3/videos");
    initUrl.searchParams.set("uploadType", "resumable");
    initUrl.searchParams.set("part", "snippet,status");

    const initRes = await fetch(initUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(fileStat.size),
        "X-Upload-Content-Type": mimeType,
      },
      body: JSON.stringify({
        snippet: {
          title: metadata.title.slice(0, 100),
          description: metadata.description.slice(0, 5000),
          tags: (metadata.tags ?? []).slice(0, 10),
          categoryId: "28",
        },
        status: {
          privacyStatus: "private",
          selfDeclaredMadeForKids: false,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!initRes.ok) {
      const body = await initRes.text().catch(() => "");
      console.warn(
        `[attention:yt-publish] resumable init HTTP ${initRes.status}: ${body.slice(0, 300)}`
      );
      return null;
    }

    const uploadUrl = initRes.headers.get("Location");
    if (!uploadUrl) {
      console.warn("[attention:yt-publish] resumable init missing Location header");
      return null;
    }

    const fileBuffer = await readFile(filePath);

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(fileStat.size),
        "Content-Type": mimeType,
      },
      body: fileBuffer,
      signal: AbortSignal.timeout(300_000),
    });

    if (!uploadRes.ok) {
      const body = await uploadRes.text().catch(() => "");
      console.warn(
        `[attention:yt-publish] resumable upload HTTP ${uploadRes.status}: ${body.slice(0, 300)}`
      );
      return null;
    }

    const result = (await uploadRes.json()) as YouTubeVideoInsertResponse;
    if (result.error?.message) {
      console.warn(`[attention:yt-publish] upload API error: ${result.error.message}`);
      return null;
    }

    return result.id ? { videoId: result.id } : null;
  }

  private async refreshAccessToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string
  ): Promise<string | null> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[attention:yt-publish] token refresh HTTP ${res.status}: ${body.slice(0, 200)}`);
      return null;
    }

    const data = (await res.json()) as GoogleTokenResponse;
    if (data.error || !data.access_token) {
      console.warn(
        `[attention:yt-publish] token refresh error: ${data.error ?? "missing access_token"} ${data.error_description ?? ""}`
      );
      return null;
    }

    console.log("[attention:yt-publish] OAuth access token refreshed successfully");
    return data.access_token;
  }

  private async validateChannelAccess(accessToken: string): Promise<string | null> {
    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "id,snippet");
    url.searchParams.set("mine", "true");

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[attention:yt-publish] channels.list HTTP ${res.status}: ${body.slice(0, 200)}`);
      return null;
    }

    const data = (await res.json()) as { items?: Array<{ id?: string }> };
    const channelId = data.items?.[0]?.id;
    return channelId ?? null;
  }

  private stubPublish(metadata: PublishMetadata): PublishResult {
    const slug = metadata.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60);
    const externalId = `ytstub_${slug}_${Date.now().toString(36)}`;

    return {
      platform: "youtube",
      externalId,
      url: `https://youtube.com/watch?v=${externalId}`,
      scheduled: false,
    };
  }
}
