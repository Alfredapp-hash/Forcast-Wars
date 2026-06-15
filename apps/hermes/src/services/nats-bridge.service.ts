import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  connect as connectNats,
  JSONCodec,
  consumerOpts,
  DiscardPolicy,
  RetentionPolicy,
  StorageType,
  type NatsConnection,
  type JetStreamClient,
  type JetStreamManager,
  type JetStreamSubscription,
  type StreamConfig,
} from 'nats';
import { GatewayService } from './gateway.service.js';
import type { HermesConfig } from '../providers/configuration.js';

@Injectable()
export class NatsBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsBridgeService.name);
  private readonly codec = JSONCodec<Record<string, unknown>>();

  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private sub: JetStreamSubscription | null = null;
  private subLoop: Promise<void> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly nodeId = `hermes-${process.pid}`;

  private readonly streamName = 'arkhe_events';
  private readonly subjectRoot = 'arkhe.events';
  private readonly consumerName = `hermes-${process.pid}`;

  constructor(
    private readonly config: ConfigService,
    private readonly gateway: GatewayService,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(retryDelayMs = 5_000): Promise<void> {
    const natsUrl = this.config.get<HermesConfig>('hermes')?.NATS_URL ?? 'nats://127.0.0.1:4222';
    try {
      this.nc = await connectNats({
        servers: natsUrl,
        name: this.nodeId,
        maxReconnectAttempts: -1,
      });
      this.js = this.nc.jetstream();
      await this.ensureStream();
      await this.startSubscription();
      this.monitorConnection(retryDelayMs);
      this.logger.log(`Connected to NATS JetStream at ${natsUrl}`);
    } catch (err) {
      this.logger.warn(`NATS unavailable (${natsUrl}) — will retry in ${retryDelayMs / 1000}s. ${String(err)}`);
      await this.closeNats();
      this.scheduleReconnect(retryDelayMs);
    }
  }

  private async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    await this.stopSubscription();
    await this.closeNats();
  }

  private async ensureStream(): Promise<void> {
    if (!this.nc) return;
    const mgr: JetStreamManager = await this.nc.jetstreamManager();
    try {
      await mgr.streams.info(this.streamName);
    } catch {
      try {
        await mgr.streams.add({
          name: this.streamName,
          subjects: [`${this.subjectRoot}.>`],
          retention: RetentionPolicy.Limits,
          discard: DiscardPolicy.Old,
          storage: StorageType.File,
          num_replicas: 1,
          allow_direct: true,
        } as StreamConfig);
      } catch (addErr) {
        if (!(addErr instanceof Error && /exists/i.test(addErr.message))) throw addErr;
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
    opts.maxAckPending(256);

    this.sub = await this.js.subscribe(`${this.subjectRoot}.>`, opts);
    this.subLoop = (async () => {
      try {
        for await (const msg of this.sub!) {
          try {
            const raw = this.codec.decode(msg.data) as {
              event?: Record<string, unknown>;
              source?: string;
              topic?: string;
            };
            const event: Record<string, unknown> = (raw.event ?? raw) as Record<string, unknown>;
            const source = (raw.source as string | undefined) ?? 'system';
            const eventType = (event['eventType'] as string | undefined) ?? msg.subject;
            const routingHint =
              eventType.startsWith('approval') ? 'approval' :
              eventType.startsWith('debate.') || eventType === 'prediction.created' ? 'debate' :
              undefined;

            await this.gateway.ingest({
              source: source as never,
              role: 'system',
              payload: event,
              context: { natsSubject: msg.subject, topic: raw.topic },
              routingHint,
              missionId: event['missionId'] as string | undefined,
            });
            msg.ack();
          } catch (err) {
            this.logger.error(`Failed to process NATS message on ${msg.subject}: ${String(err)}`);
            msg.nak();
          }
        }
      } catch (loopErr) {
        this.logger.warn(`Subscription loop ended: ${String(loopErr)}`);
      }
    })();
  }

  private async stopSubscription(): Promise<void> {
    if (!this.sub) return;
    try { await this.sub.drain(); } catch { try { this.sub.unsubscribe(); } catch { /* ignore */ } }
    this.sub = null;
    if (this.subLoop) { try { await this.subLoop; } catch { /* ignore */ } }
    this.subLoop = null;
  }

  private async closeNats(): Promise<void> {
    if (!this.nc) return;
    try { await this.nc.drain(); } catch { try { await this.nc.close(); } catch { /* ignore */ } }
    this.nc = null;
    this.js = null;
  }

  private monitorConnection(retryDelayMs: number): void {
    if (!this.nc) return;
    (async () => {
      for await (const status of this.nc!.status()) {
        if (status.type === 'disconnect') {
          this.logger.warn('Lost NATS connection');
        } else if (status.type === 'reconnect') {
          this.logger.log('NATS reconnected — resubscribing');
          await this.startSubscription();
        }
      }
    })().catch((err) => {
      this.logger.error(`Status watcher failed: ${String(err)}`);
      this.scheduleReconnect(retryDelayMs);
    });
  }

  private scheduleReconnect(delayMs: number): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect(Math.min(delayMs * 2, 60_000));
    }, delayMs);
  }
}
