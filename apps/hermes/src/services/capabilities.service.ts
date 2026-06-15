import { Injectable, Logger } from '@nestjs/common';
import { SupabaseProvider } from '../providers/supabase.provider.js';
import type { CapabilityRegistration, CapabilityStatus } from '../hermes.types.js';

@Injectable()
export class CapabilitiesService {
  private readonly logger = new Logger(CapabilitiesService.name);
  private readonly cache = new Map<string, CapabilityRegistration>();

  constructor(private readonly supabase: SupabaseProvider) {}

  async register(cap: CapabilityRegistration): Promise<CapabilityRegistration> {
    const now = new Date().toISOString();
    this.cache.set(cap.id, cap);

    const client = this.supabase.client;
    if (client) {
      const { error } = await client.from('hermes_capabilities').upsert({
        id: cap.id,
        name: cap.name,
        kind: cap.kind,
        roles: cap.roles,
        skills: cap.skills,
        status: cap.status ?? 'active',
        priority_layer: cap.priorityLayer ?? 2,
        preferred_model: cap.preferredModel ?? null,
        metadata: cap.metadata ?? {},
        last_seen_at: now,
      }, { onConflict: 'id' });

      if (error) {
        this.logger.error(`Failed to persist capability ${cap.id}: ${error.message}`);
      }
    }

    this.logger.log(`Registered capability: ${cap.id} (${cap.kind} — ${cap.roles.join(', ')})`);
    return cap;
  }

  async heartbeat(id: string): Promise<void> {
    this.cache.get(id) && this.cache.set(id, { ...this.cache.get(id)!, status: 'active' as CapabilityStatus });
    const client = this.supabase.client;
    if (client) {
      await client.from('hermes_capabilities').update({ last_seen_at: new Date().toISOString(), status: 'active' }).eq('id', id);
    }
  }

  async deregister(id: string): Promise<void> {
    this.cache.delete(id);
    const client = this.supabase.client;
    if (client) {
      await client.from('hermes_capabilities').update({ status: 'offline' }).eq('id', id);
    }
    this.logger.log(`Deregistered capability: ${id}`);
  }

  async findByRole(role: string): Promise<CapabilityRegistration[]> {
    const local = Array.from(this.cache.values()).filter(
      (c) => c.roles.includes(role) && c.status !== 'offline',
    );
    if (local.length > 0) return local;

    const client = this.supabase.client;
    if (!client) return [];

    const { data, error } = await client
      .from('hermes_capabilities')
      .select('id, name, kind, roles, skills, status, priority_layer, preferred_model, metadata')
      .contains('roles', [role])
      .neq('status', 'offline')
      .order('priority_layer', { ascending: true })
      .limit(10);

    if (error) {
      this.logger.error(`findByRole error: ${error.message}`);
      return [];
    }

    return (data ?? []).map(this.rowToCap);
  }

  async list(): Promise<CapabilityRegistration[]> {
    const client = this.supabase.client;
    if (!client) return Array.from(this.cache.values());

    const { data, error } = await client
      .from('hermes_capabilities')
      .select('id, name, kind, roles, skills, status, priority_layer, preferred_model, metadata')
      .order('priority_layer', { ascending: true });

    if (error) {
      this.logger.error(`list error: ${error.message}`);
      return Array.from(this.cache.values());
    }

    return (data ?? []).map(this.rowToCap);
  }

  private rowToCap(row: Record<string, unknown>): CapabilityRegistration {
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      kind: row['kind'] as CapabilityRegistration['kind'],
      roles: row['roles'] as string[],
      skills: row['skills'] as string[],
      status: row['status'] as CapabilityStatus,
      priorityLayer: row['priority_layer'] as number,
      preferredModel: row['preferred_model'] as string | undefined,
      metadata: row['metadata'] as Record<string, unknown>,
    };
  }
}
