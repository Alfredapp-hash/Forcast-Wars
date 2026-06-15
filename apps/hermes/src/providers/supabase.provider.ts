import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';

@Injectable()
export class SupabaseProvider {
  private readonly logger = new Logger(SupabaseProvider.name);
  readonly client: SupabaseClient | null;

  constructor(config: ConfigService) {
    const url = config.get<string>('hermes.SUPABASE_URL');
    const key = config.get<string>('hermes.SUPABASE_SERVICE_ROLE_KEY');

    if (url && key) {
      this.client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      this.logger.log('Supabase client initialised');
    } else {
      this.client = null;
      this.logger.warn('Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }
  }
}
