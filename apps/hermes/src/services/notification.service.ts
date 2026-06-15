import { Injectable, Logger } from '@nestjs/common';
import { SupabaseProvider } from '../providers/supabase.provider.js';
import type { NotificationPayload, NotificationChannel, NotificationPriority } from '../hermes.types.js';

const PRIORITY_RANK: Record<NotificationPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly supabase: SupabaseProvider) {}

  async send(notification: NotificationPayload): Promise<void> {
    const allowed = await this.checkPreferences(notification);
    if (!allowed) {
      this.logger.debug(
        `Suppressed ${notification.channel} notification for ${notification.recipient} (preference/quiet-hours)`,
      );
      return;
    }

    const id = await this.persist(notification);
    await this.deliver(id, notification);
  }

  async sendBulk(notifications: NotificationPayload[]): Promise<void> {
    await Promise.all(notifications.map((n) => this.send(n)));
  }

  private async checkPreferences(notification: NotificationPayload): Promise<boolean> {
    const client = this.supabase.client;
    if (!client) return true;

    const { data, error } = await client
      .from('hermes_notification_preferences')
      .select('enabled, quiet_start, quiet_end, priority_min')
      .eq('user_id', notification.recipient)
      .eq('channel', notification.channel)
      .maybeSingle();

    if (error || !data) return true;

    if (!data['enabled']) return false;

    const priorityMin = (data['priority_min'] as NotificationPriority) ?? 'low';
    const incomingPriority = notification.priority ?? 'medium';
    if (PRIORITY_RANK[incomingPriority] < PRIORITY_RANK[priorityMin]) return false;

    const quietStart = data['quiet_start'] as string | null;
    const quietEnd = data['quiet_end'] as string | null;
    if (quietStart && quietEnd && this.isQuietHours(quietStart, quietEnd)) return false;

    return true;
  }

  private isQuietHours(start: string, end: string): boolean {
    const now = new Date();
    const [sh, sm] = start.split(':').map(Number) as [number, number];
    const [eh, em] = end.split(':').map(Number) as [number, number];
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (startMins <= endMins) return nowMins >= startMins && nowMins < endMins;
    return nowMins >= startMins || nowMins < endMins;
  }

  private async persist(notification: NotificationPayload): Promise<string | null> {
    const client = this.supabase.client;
    if (!client) return null;

    const { data, error } = await client
      .from('hermes_notifications')
      .insert({
        channel: notification.channel,
        recipient: notification.recipient,
        template_id: notification.templateId ?? null,
        payload: notification.data,
        status: 'queued',
        scheduled_at: notification.scheduledAt ?? new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      this.logger.error(`Failed to persist notification: ${error.message}`);
      return null;
    }
    return (data as { id: string }).id;
  }

  private async deliver(id: string | null, notification: NotificationPayload): Promise<void> {
    const adapter = this.getAdapter(notification.channel);
    try {
      await adapter(notification);
      if (id) {
        const client = this.supabase.client;
        if (client) {
          await client
            .from('hermes_notifications')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', id);
        }
      }
      this.logger.log(`Sent ${notification.channel} → ${notification.recipient}`);
    } catch (err) {
      this.logger.error(`Delivery failed (${notification.channel}/${notification.recipient}): ${String(err)}`);
      if (id) {
        const client = this.supabase.client;
        if (client) {
          await client
            .from('hermes_notifications')
            .update({ status: 'failed', error: String(err) })
            .eq('id', id);
        }
      }
    }
  }

  private getAdapter(channel: NotificationChannel): (n: NotificationPayload) => Promise<void> {
    switch (channel) {
      case 'dashboard':
        return this.dashboardAdapter.bind(this);
      case 'push':
        return this.pushAdapter.bind(this);
      case 'email':
        return this.emailAdapter.bind(this);
      case 'voice':
        return this.voiceAdapter.bind(this);
      case 'sms':
        return this.smsAdapter.bind(this);
      default:
        return this.dashboardAdapter.bind(this);
    }
  }

  private async dashboardAdapter(n: NotificationPayload): Promise<void> {
    this.logger.debug(`[dashboard] → ${n.recipient}: ${JSON.stringify(n.data)}`);
  }

  private async pushAdapter(n: NotificationPayload): Promise<void> {
    this.logger.debug(`[push] → ${n.recipient}: ${JSON.stringify(n.data)}`);
  }

  private async emailAdapter(n: NotificationPayload): Promise<void> {
    this.logger.debug(`[email] → ${n.recipient}: ${JSON.stringify(n.data)}`);
  }

  private async voiceAdapter(n: NotificationPayload): Promise<void> {
    this.logger.debug(`[voice] → ${n.recipient}: ${JSON.stringify(n.data)}`);
  }

  private async smsAdapter(n: NotificationPayload): Promise<void> {
    this.logger.debug(`[sms] → ${n.recipient}: ${JSON.stringify(n.data)}`);
  }
}
