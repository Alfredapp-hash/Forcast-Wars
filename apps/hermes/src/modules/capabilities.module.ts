import { Module } from '@nestjs/common';
import { CapabilitiesController } from '../rest/capabilities.controller.js';
import { CapabilitiesService } from '../services/capabilities.service.js';
import { SupabaseProvider } from '../providers/supabase.provider.js';

@Module({
  controllers: [CapabilitiesController],
  providers: [CapabilitiesService, SupabaseProvider],
  exports: [CapabilitiesService],
})
export class CapabilitiesModule {}
