import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { SupabaseProvider } from '../providers/supabase.provider.js';
import { CapabilitiesService } from './capabilities.service.js';
import type { HermesEnvelope, HermesDecision } from '../hermes.types.js';
import { randomUUID } from 'node:crypto';
import type { RouterService } from './router.service.js';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly supabase: SupabaseProvider,
    private readonly caps: CapabilitiesService,
    @Inject(forwardRef(() => 'ROUTER_SERVICE'))
    private readonly router: RouterService,
  ) {}

  async ingest(envelope: HermesEnvelope): Promise<{ messageId: string; decision: HermesDecision }> {
    const threadId = envelope.threadId ?? randomUUID();
    await this.ensureThread(threadId, envelope);

    const messageId = randomUUID();
    await this.persistMessage(messageId, threadId, envelope);

    const decision = await this.route(envelope);
    await this.persistDecision(messageId, decision);

    this.logger.log(`Routed [${messageId}] → ${decision.type}${decision.targetId ? ` → ${decision.targetId}` : ''}`);

    void this.router.dispatch(messageId, decision, envelope);

    return { messageId, decision };
  }

  private async route(envelope: HermesEnvelope): Promise<HermesDecision> {
    const hint = envelope.routingHint;
    const payload = envelope.payload as Record<string, unknown>;
    const eventType = (payload['eventType'] as string) ?? '';

    // Forecast Wars debate events
    if (eventType.startsWith('debate.') || eventType === 'prediction.created') {
      const agentRole = this.resolveDebateRole(eventType, payload);
      const candidates = await this.caps.findByRole(agentRole);
      if (candidates.length > 0) {
        return { type: 'dispatch_agent', targetId: candidates[0]!.id, payload: { ...payload, agentRole } };
      }
      return { type: 'dispatch_agent', targetId: 'agt_director_01', payload: { ...payload, agentRole: 'debate' } };
    }

    if (payload['approvalId'] || hint === 'approval') {
      return { type: 'await_approval', payload };
    }

    if (hint === 'notify' || payload['notifyChannel']) {
      return {
        type: 'notify',
        channel: (payload['notifyChannel'] as HermesDecision['channel']) ?? 'dashboard',
        payload,
      };
    }

    if (hint === 'tool' && payload['toolId']) {
      return { type: 'dispatch_tool', targetId: payload['toolId'] as string, payload };
    }

    const role: string =
      (payload['role'] as string) ??
      (payload['agentRole'] as string) ??
      hint ??
      'general';

    const candidates = await this.caps.findByRole(role);
    if (candidates.length > 0) {
      const best = candidates[0]!;
      return { type: 'dispatch_agent', targetId: best.id, payload };
    }

    return { type: 'dispatch_agent', targetId: 'agt_director_01', payload };
  }

  private resolveDebateRole(eventType: string, payload: Record<string, unknown>): string {
    if (payload['agentRole']) return payload['agentRole'] as string;
    switch (eventType) {
      case 'debate.turn_submitted':
        return (payload['side'] as string) === 'yes' ? 'affirmative' : 'negative';
      case 'debate.judge_scored':
        return 'judge';
      case 'debate.evidence_flagged':
        return 'fact_check';
      case 'debate.round_completed':
        return 'narrator';
      case 'debate.resolve_request':
        return 'resolution';
      case 'prediction.created':
        return 'debate';
      default:
        return 'debate';
    }
  }

  private async ensureThread(threadId: string, envelope: HermesEnvelope): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;
    await client.from('hermes_threads').upsert({
      id: threadId,
      mission_id: envelope.missionId ?? null,
      source: envelope.source,
      status: 'active',
    }, { onConflict: 'id', ignoreDuplicates: true });
  }

  private async persistMessage(id: string, threadId: string, envelope: HermesEnvelope): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;
    await client.from('hermes_messages').insert({
      id,
      thread_id: threadId,
      mission_id: envelope.missionId ?? null,
      source: envelope.source,
      role: envelope.role,
      payload: envelope.payload,
      context: envelope.context ?? {},
      routing_hint: envelope.routingHint ?? null,
      status: 'routing',
    });
  }

  private async persistDecision(messageId: string, decision: HermesDecision): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;
    await client.from('hermes_decisions').insert({
      message_id: messageId,
      decision_type: decision.type,
      target_id: decision.targetId ?? null,
      channel: decision.channel ?? null,
      payload: decision.payload,
      status: 'pending',
    });
  }
}
