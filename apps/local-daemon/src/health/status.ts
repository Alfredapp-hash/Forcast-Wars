import type { EventBus } from "../event-bus.js";

export interface HealthStatus {
  status: "ok" | "degraded";
  daemon: "ok";
  ipc: "ok" | "degraded";
  eventBus: "ok" | "degraded";
  modelRouter: "ok" | "degraded";
  uptimeSeconds: number;
  eventsSeen: number;
  clientsConnected: number;
}

export class HealthService {
  private readonly startedAt = Date.now();

  constructor(private readonly eventBus: EventBus) {}

  snapshot(clientsConnected: number): HealthStatus {
    const eventBusHealthy = this.eventBus.isConnected();
    return {
      status: eventBusHealthy ? "ok" : "degraded",
      daemon: "ok",
      ipc: clientsConnected >= 0 ? "ok" : "degraded",
      eventBus: eventBusHealthy ? "ok" : "degraded",
      modelRouter: "ok",
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      eventsSeen: this.eventBus.eventCount,
      clientsConnected,
    };
  }
}
