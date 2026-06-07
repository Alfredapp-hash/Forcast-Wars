import type { ArkheEvent, EventStreamMessage } from "@arkhe/contracts";
import type { ServerConfig } from "./config.js";

type EventHandler = (message: EventStreamMessage) => void;

/**
 * Internal event bus. NATS JetStream wiring lands here.
 * MVP: in-process pub/sub until NATS is added.
 */
export class EventBus {
  private handlers = new Set<EventHandler>();
  private connected = false;

  constructor(_config: ServerConfig) {}

  async connect(): Promise<void> {
    // TODO: connect NATS JetStream at config.natsUrl
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.handlers.clear();
  }

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async publish(event: ArkheEvent, source: EventStreamMessage["source"] = "daemon"): Promise<void> {
    if (!this.connected) return;

    const message: EventStreamMessage = {
      topic: `arkhe.events.${event.eventType.split(".")[0]}`,
      event,
      emittedAt: new Date().toISOString(),
      source,
    };

    for (const handler of this.handlers) {
      handler(message);
    }
  }
}
