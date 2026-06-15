import { Injectable, Logger } from '@nestjs/common';
import { SupabaseProvider } from '../providers/supabase.provider.js';
import type { ApprovalRequest, ApprovalStatus } from '../hermes.types.js';

type Resolver = (granted: boolean) => void;
type Broadcaster = (event: string, data: unknown) => void;

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);
  private readonly pending = new Map<string, Resolver>();
  private broadcaster: Broadcaster | null = null;

  constructor(private readonly supabase: SupabaseProvider) {}

  setBroadcaster(fn: Broadcaster): void {
    this.broadcaster = fn;
  }

  async hold(req: ApprovalRequest): Promise<boolean> {
    const client = this.supabase.client;
    if (client) {
      const { error } = await client.from('hermes_approval_requests').insert({
        approval_id: req.approvalId,
        risk_class: req.riskClass,
        action: req.action,
        summary: req.summary,
        requested_by: req.requestedBy,
        mission_id: req.missionId ?? null,
        status: 'pending',
        expires_at: req.expiresAt,
      });
      if (error) this.logger.error(`Failed to persist approval ${req.approvalId}: ${error.message}`);
    }

    this.broadcaster?.('approval_requested', req);

    const expiresMs = new Date(req.expiresAt).getTime() - Date.now();
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(req.approvalId)) {
          this.logger.warn(`Approval ${req.approvalId} expired`);
          void this.updateStatus(req.approvalId, 'expired');
          resolve(false);
        }
      }, Math.max(expiresMs, 0));

      this.pending.set(req.approvalId, (granted) => {
        clearTimeout(timer);
        resolve(granted);
      });
    });
  }

  async resolve(approvalId: string, granted: boolean): Promise<void> {
    const resolver = this.pending.get(approvalId);
    if (!resolver) {
      this.logger.warn(`No pending approval for ${approvalId}`);
      return;
    }
    this.pending.delete(approvalId);
    await this.updateStatus(approvalId, granted ? 'approved' : 'denied');
    this.broadcaster?.('approval_resolved', { approvalId, granted });
    resolver(granted);
    this.logger.log(`Approval ${approvalId} → ${granted ? 'approved' : 'denied'}`);
  }

  async list(): Promise<ApprovalRequest[]> {
    const client = this.supabase.client;
    if (!client) return [];
    const { data, error } = await client
      .from('hermes_approval_requests')
      .select('approval_id, risk_class, action, summary, requested_by, mission_id, expires_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) {
      this.logger.error(`list error: ${error.message}`);
      return [];
    }
    return (data ?? []).map((r) => ({
      approvalId: r['approval_id'] as string,
      riskClass: r['risk_class'] as ApprovalRequest['riskClass'],
      action: r['action'] as string,
      summary: r['summary'] as string,
      requestedBy: r['requested_by'] as string,
      missionId: r['mission_id'] as string | undefined,
      expiresAt: r['expires_at'] as string,
    }));
  }

  private async updateStatus(approvalId: string, status: ApprovalStatus): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;
    await client
      .from('hermes_approval_requests')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('approval_id', approvalId);
  }
}
