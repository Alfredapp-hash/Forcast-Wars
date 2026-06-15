import { Injectable, Logger } from '@nestjs/common';
import { SupabaseProvider } from '../providers/supabase.provider.js';
import { CapabilitiesService } from './capabilities.service.js';
import { NotificationService } from './notification.service.js';
import { ApprovalsService } from './approvals.service.js';
import type {
  HermesEnvelope,
  HermesDecision,
  CapabilityRegistration,
  NotificationChannel,
  RiskClass,
} from '../hermes.types.js';

const PRIORITY_LAYER_WEIGHT = 0.4;
const SKILL_MATCH_WEIGHT = 0.35;
const STATUS_WEIGHT = 0.25;

const STATUS_SCORE: Record<string, number> = {
  active: 1.0,
  dormant: 0.6,
  overloaded: 0.2,
  offline: 0.0,
};

@Injectable()
export class RouterService {
  private readonly logger = new Logger(RouterService.name);

  constructor(
    private readonly caps: CapabilitiesService,
    private readonly notify: NotificationService,
    private readonly approvals: ApprovalsService,
    private readonly supabase: SupabaseProvider,
  ) {}

  async dispatch(
    messageId: string,
    decision: HermesDecision,
    envelope: HermesEnvelope,
  ): Promise<void> {
    try {
      await this.execute(messageId, decision, envelope);
      await this.updateDecisionStatus(messageId, 'completed');
    } catch (err) {
      this.logger.error(`Dispatch failed for [${messageId}]: ${String(err)}`);
      await this.updateDecisionStatus(messageId, 'failed', String(err));
      await this.deadLetter(messageId, decision, envelope, String(err));
    }
  }

  async score(
    candidates: CapabilityRegistration[],
    envelope: HermesEnvelope,
  ): Promise<CapabilityRegistration[]> {
    const hintSkills = this.extractSkillHints(envelope);

    return candidates
      .map((cap) => {
        const layerScore = Math.max(0, 1 - (cap.priorityLayer ?? 2) / 5);
        const skillScore =
          hintSkills.length > 0
            ? cap.skills.filter((s) => hintSkills.includes(s)).length / hintSkills.length
            : 0.5;
        const statusScore = STATUS_SCORE[cap.status ?? 'dormant'] ?? 0;
        const total =
          layerScore * PRIORITY_LAYER_WEIGHT +
          skillScore * SKILL_MATCH_WEIGHT +
          statusScore * STATUS_WEIGHT;
        return { cap, score: total };
      })
      .sort((a, b) => b.score - a.score)
      .map((r) => r.cap);
  }

  async selectBestAgent(envelope: HermesEnvelope): Promise<CapabilityRegistration | null> {
    const payload = envelope.payload as Record<string, unknown>;
    const role: string =
      (payload['agentRole'] as string) ??
      (payload['role'] as string) ??
      envelope.routingHint ??
      'general';

    const candidates = await this.caps.findByRole(role);
    if (candidates.length === 0) return null;
    const scored = await this.score(candidates, envelope);
    return scored[0] ?? null;
  }

  private async execute(
    messageId: string,
    decision: HermesDecision,
    envelope: HermesEnvelope,
  ): Promise<void> {
    switch (decision.type) {
      case 'dispatch_agent': {
        const targetId = decision.targetId ?? 'agt_director_01';
        this.logger.log(`[${messageId}] dispatch_agent → ${targetId}`);
        break;
      }

      case 'dispatch_tool': {
        this.logger.log(`[${messageId}] dispatch_tool → ${decision.targetId}`);
        break;
      }

      case 'notify': {
        const payload = envelope.payload as Record<string, unknown>;
        await this.notify.send({
          channel: (decision.channel ?? 'dashboard') as NotificationChannel,
          recipient: (payload['userId'] as string) ?? 'broadcast',
          data: decision.payload as Record<string, unknown>,
          priority: (payload['priority'] as never) ?? 'medium',
        });
        break;
      }

      case 'await_approval': {
        const payload = envelope.payload as Record<string, unknown>;
        await this.approvals.hold({
          approvalId: payload['approvalId'] as string,
          riskClass: (payload['riskClass'] as RiskClass) ?? 'yellow',
          action: (payload['action'] as string) ?? 'unknown',
          summary: (payload['summary'] as string) ?? '',
          requestedBy: (payload['requestedByAgentId'] as string) ?? 'unknown',
          missionId: payload['missionId'] as string | undefined,
          expiresAt: (payload['expiresAt'] as string) ?? new Date(Date.now() + 120_000).toISOString(),
        });
        break;
      }

      case 'reject':
        this.logger.warn(`[${messageId}] rejected`);
        break;
    }
  }

  private extractSkillHints(envelope: HermesEnvelope): string[] {
    const payload = envelope.payload as Record<string, unknown>;
    const hint = envelope.routingHint ?? '';
    const skills = payload['skills'];
    if (Array.isArray(skills)) return skills as string[];
    return hint ? [hint] : [];
  }

  private async updateDecisionStatus(
    messageId: string,
    status: 'completed' | 'failed',
    error?: string,
  ): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;
    await client
      .from('hermes_decisions')
      .update({
        status,
        ...(error ? { error } : {}),
        completed_at: new Date().toISOString(),
      })
      .eq('message_id', messageId);
    await client
      .from('hermes_messages')
      .update({ status: status === 'completed' ? 'completed' : 'failed' })
      .eq('id', messageId);
  }

  private async deadLetter(
    messageId: string,
    decision: HermesDecision,
    envelope: HermesEnvelope,
    error: string,
  ): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;
    await client.from('hermes_notifications').insert({
      channel: 'dashboard',
      recipient: 'system',
      template_id: 'dead_letter',
      payload: {
        messageId,
        decisionType: decision.type,
        targetId: decision.targetId,
        source: envelope.source,
        error,
      },
      status: 'queued',
    });
    this.logger.warn(`Dead-lettered message [${messageId}]: ${error}`);
  }
}
