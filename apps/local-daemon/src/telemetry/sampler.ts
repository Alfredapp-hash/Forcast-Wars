import { createEventId, SCHEMA_VERSION, type TelemetryEvent } from "@arkhe/contracts";
import type { EventBus } from "../event-bus.js";

export class TelemetrySampler {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly eventBus: EventBus) {}

  start(intervalMs = 5000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.sample(intervalMs);
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async sample(intervalMs: number): Promise<void> {
    const usage = process.memoryUsage();
    const event: TelemetryEvent = {
      id: createEventId(),
      ts: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      eventType: "telemetry.system.sample",
      payload: {
        sampleIntervalMs: intervalMs,
        system: {
          cpuPct: 0,
          memUsedMb: Math.round(usage.rss / 1024 / 1024),
          memTotalMb: Math.round((usage.heapTotal + usage.external) / 1024 / 1024),
          networkTxKbps: 0,
          networkRxKbps: 0,
        },
      },
    };
    await this.eventBus.publish(event);
  }
}
