import type { VideoAsset, VideoGenerationParams, VideoGenerator } from "./types.js";

/**
 * VideoGenerator adapters for Attention Cortex.
 *
 * Policy reminder (from AI_STACK):
 * - Ideation / scripting: Grok or strong local (Ollama/Apple FM) — never default Grok for pixels.
 * - Actual video frames: Veo (highest realism + story), Runway (pipeline/iteration speed), Kling (fast social ROI), Hailuo (character + style consistency).
 *
 * The orchestrator picks the provider based on opportunityScore + config, then calls through the interface.
 * Kling + Runway perform a real create-task API call when keys are set; others remain stubbed.
 */

export type { VideoAsset, VideoGenerationParams, VideoGenerator };

const KLING_API_BASE = "https://api.klingai.com";
const RUNWAY_API_BASE = "https://api.dev.runwayml.com";

function buildVideoPrompt(params: VideoGenerationParams): string {
  return `Tech explainer short about: ${params.topic}. Clean motion graphics, agent UI overlays, punchy cuts. Opportunity score ${params.opportunityScore}.`;
}

function stubAsset(
  provider: VideoAsset["provider"],
  model: string,
  params: VideoGenerationParams,
  style: string,
  durationBase: number,
  durationDivisor: number
): VideoAsset {
  return {
    assetId: `${provider}_stub_${Date.now()}`,
    provider,
    model,
    durationSec: Math.max(30, Math.min(120, durationBase + Math.floor(params.opportunityScore / durationDivisor))),
    style,
  };
}

/**
 * KlingVideoGenerator (default fast path for social/quick)
 */
export class KlingVideoGenerator implements VideoGenerator {
  readonly provider = "kling" as const;

  async generate(params: VideoGenerationParams): Promise<VideoAsset> {
    const key = process.env.KLING_API_KEY;
    const style =
      "fast social explainer, kinetic typography, subtle agent visuals, punchy cuts";

    if (!key) {
      console.warn(
        `[attention:kling] KLING_API_KEY not set — stub asset for "${params.topic}" (score=${params.opportunityScore})`
      );
      return stubAsset("kling", "kling-1.6", params, style, 72, 6);
    }

    try {
      const res = await fetch(`${KLING_API_BASE}/v1/videos/text2video`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "kling-v2.6-pro",
          prompt: buildVideoPrompt(params),
          duration: 5,
          aspect_ratio: "16:9",
          mode: "standard",
        }),
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.warn(
          `[attention:kling] text2video failed ${res.status}: ${body.slice(0, 200)} — using stub fallback`
        );
        return stubAsset("kling", "kling-1.6", params, style, 72, 6);
      }

      const data = (await res.json()) as {
        task_id?: string;
        data?: { task_id?: string };
      };
      const taskId = data.task_id ?? data.data?.task_id ?? `kling_${Date.now()}`;

      console.log(
        `[attention:kling] real text2video task created taskId=${taskId} topic="${params.topic}"`
      );

      return {
        assetId: `kling_${taskId}`,
        provider: "kling",
        model: "kling-v2.6-pro",
        durationSec: Math.max(45, Math.min(120, 72 + Math.floor(params.opportunityScore / 6))),
        style,
      };
    } catch (error) {
      console.warn(
        `[attention:kling] API error — stub fallback:`,
        error instanceof Error ? error.message : String(error)
      );
      return stubAsset("kling", "kling-1.6", params, style, 72, 6);
    }
  }
}

/**
 * RunwayVideoGenerator
 */
export class RunwayVideoGenerator implements VideoGenerator {
  readonly provider = "runway" as const;

  async generate(params: VideoGenerationParams): Promise<VideoAsset> {
    const key = process.env.RUNWAY_API_KEY;
    const style =
      "clean tech explainer with layered motion graphics, smooth camera, premium feel";

    if (!key) {
      console.warn(
        `[attention:runway] RUNWAY_API_KEY not set — stub asset for "${params.topic}" (score=${params.opportunityScore})`
      );
      return stubAsset("runway", "runway-gen3", params, style, 60, 8);
    }

    try {
      const res = await fetch(`${RUNWAY_API_BASE}/v1/text_to_video`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "X-Runway-Version": "2024-11-06",
        },
        body: JSON.stringify({
          model: "gen4.5",
          promptText: buildVideoPrompt(params),
          ratio: "1280:720",
          duration: 5,
        }),
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.warn(
          `[attention:runway] text_to_video failed ${res.status}: ${body.slice(0, 200)} — using stub fallback`
        );
        return stubAsset("runway", "runway-gen3", params, style, 60, 8);
      }

      const data = (await res.json()) as { id?: string };
      const taskId = data.id ?? `runway_${Date.now()}`;

      console.log(
        `[attention:runway] real text_to_video task created taskId=${taskId} topic="${params.topic}"`
      );

      return {
        assetId: `runway_${taskId}`,
        provider: "runway",
        model: "gen4.5",
        durationSec: Math.max(30, Math.min(90, 60 + Math.floor(params.opportunityScore / 8))),
        style,
      };
    } catch (error) {
      console.warn(
        `[attention:runway] API error — stub fallback:`,
        error instanceof Error ? error.message : String(error)
      );
      return stubAsset("runway", "runway-gen3", params, style, 60, 8);
    }
  }
}

/**
 * VeoVideoGenerator (high realism / story beats)
 */
export class VeoVideoGenerator implements VideoGenerator {
  readonly provider = "veo" as const;

  async generate(params: VideoGenerationParams): Promise<VideoAsset> {
    const key = process.env.GOOGLE_GENAI_API_KEY || process.env.VEO_API_KEY;
    console.log(
      `[attention:veo] generate("${params.topic}", score=${params.opportunityScore}) key=${key ? "present" : "absent"}`
    );

    return {
      assetId: `veo_${Date.now()}`,
      provider: "veo",
      model: "veo-2",
      durationSec: Math.max(45, Math.min(150, 85 + Math.floor(params.opportunityScore / 4))),
      style: "high-fidelity cinematic storytelling, subtle agent UI overlays, rich b-roll, emotional pacing",
    };
  }
}

/**
 * HailuoVideoGenerator (character consistency / stylized)
 */
export class HailuoVideoGenerator implements VideoGenerator {
  readonly provider = "hailuo" as const;

  async generate(params: VideoGenerationParams): Promise<VideoAsset> {
    const key = process.env.HAILUO_API_KEY || process.env.MINIMAX_API_KEY;
    console.log(
      `[attention:hailuo] generate("${params.topic}", score=${params.opportunityScore}) key=${key ? "present" : "absent"}`
    );

    return {
      assetId: `hailuo_${Date.now()}`,
      provider: "hailuo",
      model: "hailuo-01",
      durationSec: Math.max(30, Math.min(90, 55 + Math.floor(params.opportunityScore / 7))),
      style: "stylized character-driven, consistent faces/agents, strong for tutorial + story formats",
    };
  }
}
