import { Module, forwardRef } from '@nestjs/common';
import { GatewayController } from '../rest/gateway.controller.js';
import { GatewayService } from '../services/gateway.service.js';
import { RouterService } from '../services/router.service.js';
import { NotificationService } from '../services/notification.service.js';
import { ApprovalsService } from '../services/approvals.service.js';
import { CapabilitiesModule } from './capabilities.module.js';
import { SupabaseProvider } from '../providers/supabase.provider.js';

@Module({
  imports: [forwardRef(() => CapabilitiesModule)],
  controllers: [GatewayController],
  providers: [
    SupabaseProvider,
    NotificationService,
    ApprovalsService,
    RouterService,
    {
      provide: 'ROUTER_SERVICE',
      useExisting: RouterService,
    },
    GatewayService,
  ],
  exports: [GatewayService, RouterService, NotificationService, ApprovalsService],
})
export class GatewayModule {}
