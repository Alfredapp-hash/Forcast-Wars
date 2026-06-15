import type { ArkheEvent, EventStreamMessage } from "@arkhe/contracts";
import { randomUUID } from "node:crypto";
import {
  JSONCodec,
  connect as connectToNats,
  consumerOpts,
  headers,
  DiscardPolicy,
  RetentionPolicy,
  StorageType,
  type StreamConfig,
  type JetStreamClient,
  type JetStreamManager,
  type JetStreamSubscription,
  type NatsConnection,
} from "nats";
import type { ServerConfig } from "./config.js";

type EventHandler = (message: EventStreamMessage) => void;

/**
 * Internal event bus. NATS JetStream wiring lands here.
 * MVP: in-process pub/sub until NATS is added.
 */
export class EventBus {
  private handlers = new Set<EventHandler>();
  private connected = false;
  private publishedEvents = 0;

  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private subscription: JetStreamSubscription | null = null;
  private subscriptionLoop: Promise<void> | null = null;
  private connectPromise: Promise<void> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly nodeId = randomUUID();
  private readonly streamName = "arkhe_events";
  private readonly subjectRoot = "arkhe.events";
  private readonly consumerName = `daemon-${process.pid}`;
  private readonly codec = JSONCodec<EventStreamMessage>();

  constructor(private readonly config: ServerConfig) {}

  async connect(): Promise<void> {
    if (this.connected) return;
    if (this.connectPromise) {
      await this.connectPromise;
      return;
    }

    this.connectPromise = this.establishConnection();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.handlers.clear();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    await this.stopSubscription();
    await this.closeConnection();
  }

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  isConnected(): boolean {
    return this.connected;
  }

  get eventCount(): number {
    return this.publishedEvents;
  }

  async publish(event: ArkheEvent, source: EventStreamMessage["source"] = "daemon"): Promise<void> {
    const message: EventStreamMessage = {
      topic: `arkhe.events.${event.eventType.split(".")[0]}`,
      event,
      emittedAt: new Date().toISOString(),
      source,
    };

    let publishedToNats = false;
    this.publishedEvents += 1;
    if (this.connected && this.js) {
      try {
        const hdrs = headers();
        hdrs.set("x-arkhe-node", this.nodeId);
        await this.js.publish(message.topic, this.codec.encode(message), { headers: hdrs });
        publishedToNats = true;
      } catch (error) {
        this.connected = false;
        console.error(`[event-bus] Failed to publish to NATS (${this.config.natsUrl}):`, error);
        this.scheduleReconnect();
      }
    }

    // Always deliver locally to keep daemon responsive, even if NATS is unavailable.
    this.deliver(message, publishedToNats);
  }

  private async establishConnection(): Promise<void> {
    try {
      this.nc = await connectToNats({
        servers: this.config.natsUrl,
        name: `arkhe-daemon-${this.nodeId}`,
        maxReconnectAttempts: -1,
      });
      this.js = this.nc.jetstream();
      await this.ensureStream();
      await this.startSubscription();
      this.monitorConnection(this.nc);
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.connected = true;
      console.log(`[event-bus] Connected to NATS JetStream at ${this.config.natsUrl}`);
    } catch (error) {
      this.connected = false;
      console.error(`[event-bus] Unable to connect to NATS at ${this.config.natsUrl}:`, error);
      await this.closeConnection();
      this.scheduleReconnect();
    }
  }

  private async ensureStream(): Promise<void> {
    if (!this.nc) return;
    const manager: JetStreamManager = await this.nc.jetstreamManager();
    try {
      await manager.streams.info(this.streamName);
    } catch (error) {
      try {
        const config = {
          name: this.streamName,
          subjects: [`${this.subjectRoot}.>`],
          retention: RetentionPolicy.Limits,
          discard: DiscardPolicy.Old,
          storage: StorageType.File,
          num_replicas: 1,
          allow_direct: true,
        } as StreamConfig;
        await manager.streams.add(config);
      } catch (addError) {
        if (!isStreamExistsError(addError)) {
          throw addError;
        }
      }
    }
  }

  private async startSubscription(): Promise<void> {
    if (!this.js) return;
    await this.stopSubscription();

    const opts = consumerOpts();
    opts.durable(this.consumerName);
    opts.manualAck();
    opts.ackExplicit();
    opts.deliverNew();
    opts.maxAckPending(1024);

    this.subscription = await this.js.subscribe(`${this.subjectRoot}.>`, opts);
    this.subscriptionLoop = (async () => {
      try {
        for await (const msg of this.subscription!) {
          try {
            if (msg.headers?.get("x-arkhe-node") === this.nodeId) {
              msg.ack();
              continue;
            }

            const decoded = this.codec.decode(msg.data);
            this.deliver(decoded, false);
            msg.ack();
          } catch (handlerError) {
            console.error("[event-bus] Failed to process JetStream message:", handlerError);
            try {
              msg.nak();
            } catch {
              msg.term();
            }
          }
        }
      } catch (loopError) {
        if (this.connected) {
          console.error("[event-bus] JetStream subscription loop terminated:", loopError);
        }
      }
    })();
  }

  private async stopSubscription(): Promise<void> {
    if (!this.subscription) return;
    try {
      await this.subscription.drain();
    } catch {
      try {
        this.subscription.unsubscribe();
      } catch {
        // ignore
      }
    }
    this.subscription = null;
    if (this.subscriptionLoop) {
      try {
        await this.subscriptionLoop;
      } catch {
        // ignore loop errors on shutdown
      }
    }
    this.subscriptionLoop = null;
  }

  private async closeConnection(): Promise<void> {
    if (this.nc) {
      try {
        await this.nc.drain();
      } catch {
        try {
          await this.nc.close();
        } catch {
          // ignore
        }
      }
    }
    this.nc = null;
    this.js = null;
  }

  private monitorConnection(nc: NatsConnection): void {
    (async () => {
      for await (const status of nc.status()) {
        switch (status.type) {
          case "disconnect":
            this.connected = false;
            console.warn(`[event-bus] Disconnected from NATS (${status.data ?? "unknown"})`);
            break;
          case "reconnect":
            this.connected = true;
            console.log(`[event-bus] Reconnected to NATS (${status.data ?? "unknown"})`);
            await this.startSubscription();
            break;
          case "error":
            console.error("[event-bus] NATS connection error:", status.data);
            break;
        }
      }
    })().catch((statusError) => {
      console.error("[event-bus] Connection status watcher failed:", statusError);
    });
  }

  private scheduleReconnect(delayMs = 5000): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect().catch((err) => {
        console.error("[event-bus] Reconnect attempt failed:", err);
        this.scheduleReconnect(Math.min(delayMs * 2, 60_000));
      });
    }, delayMs);
  }

  private deliver(message: EventStreamMessage, fromPublish: boolean): void {
    for (const handler of this.handlers) {
      try {
        handler(message);
      } catch (error) {
        console.error("[event-bus] Handler error:", error, fromPublish ? "(local publish)" : "(jetstream)");
      }
    }
  }
}

function isStreamExistsError(error: unknown): boolean {
  return error instanceof Error && /exists/i.test(error.message);
}
