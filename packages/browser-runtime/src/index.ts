import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext } from "playwright";
import type { ArtifactRef, BrowserEvent, MissionId } from "@arkhe/contracts";
import { createEventId, SCHEMA_VERSION } from "@arkhe/contracts";

export const BROWSER_RUNTIME_VERSION = "0.2.0";

export interface BrowserRuntimeOptions {
  artifactsDir: string;
  headless?: boolean;
}

export interface BrowserVisitResult {
  url: string;
  title: string;
  textPreview: string;
  screenshotRef: ArtifactRef;
  traceRef: ArtifactRef;
  domSnapshotRef: ArtifactRef;
  events: BrowserEvent[];
}

export class BrowserRuntime {
  private browser: Browser | null = null;

  constructor(private readonly options: BrowserRuntimeOptions) {}

  async inspectUrl(input: { missionId: MissionId; agentId: string; url: string }): Promise<BrowserVisitResult> {
    const ts = new Date().toISOString();
    const safeUrl = normalizeUrl(input.url);
    const missionDir = join(this.options.artifactsDir, input.missionId);
    await mkdir(missionDir, { recursive: true });

    const screenshotPath = join(missionDir, "page.png");
    const domPath = join(missionDir, "dom.json");
    const traceRef = `trace://${input.missionId}/${encodeURIComponent(safeUrl)}`;
    const screenshotRef = `artifact://${screenshotPath}`;
    const domSnapshotRef = `artifact://${domPath}`;

    let title = safeUrl;
    let textPreview = "";

    try {
      const context = await this.createContext(input.missionId);
      const page = await context.newPage();

      await page.goto(safeUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      title = await page.title();
      const bodyText = await page.locator("body").innerText();
      textPreview = bodyText.replace(/\s+/g, " ").trim().slice(0, 1200);

      await page.screenshot({ path: screenshotPath, fullPage: false });
      const html = await page.content();
      await writeFile(domPath, JSON.stringify({ url: safeUrl, title, htmlLength: html.length }, null, 2));

      await context.close();
    } catch (error) {
      textPreview = `Browser inspection failed: ${error instanceof Error ? error.message : String(error)}`;
      await writeFile(domPath, JSON.stringify({ url: safeUrl, error: textPreview }, null, 2));
    }

    const events: BrowserEvent[] = [
      browserEvent(input.missionId, input.agentId, ts, "browser.navigate", {
        url: safeUrl,
        playwrightTraceRef: traceRef,
      }),
      browserEvent(input.missionId, input.agentId, ts, "browser.dom_snapshot", {
        url: safeUrl,
        domSnapshotRef,
        playwrightTraceRef: traceRef,
      }),
      browserEvent(input.missionId, input.agentId, ts, "browser.screenshot", {
        url: safeUrl,
        screenshotRef,
        playwrightTraceRef: traceRef,
      }),
    ];

    return { url: safeUrl, title, textPreview, screenshotRef, traceRef, domSnapshotRef, events };
  }

  /** Lightweight probe for health checks — launches Chromium briefly. Cached by caller. */
  async probe(): Promise<boolean> {
    try {
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      return true;
    } catch {
      return false;
    }
  }

  async shutdown(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
  }

  private async createContext(missionId: MissionId): Promise<BrowserContext> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: this.options.headless ?? true });
    }
    return this.browser.newContext({
      recordHar: undefined,
      viewport: { width: 1440, height: 900 },
      userAgent: `ArkheAgentOS/${missionId}`,
    });
  }
}

function browserEvent(
  missionId: MissionId,
  agentId: string,
  ts: string,
  eventType: BrowserEvent["eventType"],
  payload: BrowserEvent["payload"],
): BrowserEvent {
  return {
    id: createEventId(),
    ts,
    schemaVersion: SCHEMA_VERSION,
    missionId,
    agentId: agentId as never,
    eventType,
    payload,
  };
}

function normalizeUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}
