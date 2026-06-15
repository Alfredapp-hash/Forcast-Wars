/**
 * HermesClient — thin HTTP client for the Hermes routing service.
 * The daemon uses this to forward approval requests (and optionally
 * any event envelope) to Hermes so the macOS approval banner and WS
 * clients receive the event in real-time.
 */

import type { ApprovalEvent } from "@arkhe/contracts";

const DEFAULT_HERMES_URL = "http://127.0.0.1:4000";

export class HermesClient {
  private readonly baseUrl: string;
  private available = false;
  private probeTimer: NodeJS.Timeout | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.HERMES_URL ?? DEFAULT_HERMES_URL).replace(/\/$/, "");
    void this.probe();
    this.probeTimer = setInterval(() => { void this.probe(); }, 30_000);
  }

  stop(): void {
    if (this.probeTimer) {
      clearInterval(this.probeTimer);
      this.probeTimer = null;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  async forwardApprovalEvent(event: ApprovalEvent): Promise<void> {
    if (!this.available) return;

    const payload = event.payload;
    await this.post("/gateway/ingest", {
      source: "system",
      role: "system",
      missionId: event.missionId,
      payload: {
        approvalId: payload.approvalId,
        riskClass: payload.riskClass,
        action: payload.action,
        summary: payload.summary,
        requestedByAgentId: payload.requestedByAgentId,
        expiresAt: payload.expiresAt,
        eventType: event.eventType,
      },
      context: { eventId: event.id, eventType: event.eventType },
      routingHint: "approval",
    }).catch((err) => {
      console.warn("[hermes-client] forwardApprovalEvent failed:", err instanceof Error ? err.message : String(err));
    });
  }

  async registerCapability(cap: {
    id: string;
    name: string;
    kind: "agent" | "tool" | "integration";
    roles: string[];
    skills: string[];
  }): Promise<void> {
    if (!this.available) return;
    await this.post("/capabilities", cap).catch((err) => {
      console.warn("[hermes-client] registerCapability failed:", err instanceof Error ? err.message : String(err));
    });
  }

  private async probe(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3_000) });
      this.available = res.ok;
      if (this.available) {
        console.log("[hermes-client] Hermes service reachable");
      }
    } catch {
      if (this.available) {
        console.warn(`[hermes-client] Hermes service unreachable at ${this.baseUrl}`);
      }
      this.available = false;
    }
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      throw new Error(`Hermes ${path} responded ${res.status}`);
    }
    return res.json() as Promise<unknown>;
  }
}
