import { Module } from '@nestjs/common';
import { NatsBridgeService } from '../services/nats-bridge.service.js';
import { InboundWsGateway } from '../ws/inbound.gateway.js';
import { ApprovalsController } from '../rest/approvals.controller.js';
import { GatewayModule } from './gateway.module.js';

@Module({
  imports: [GatewayModule],
  providers: [NatsBridgeService, InboundWsGateway],
  controllers: [ApprovalsController],
  exports: [InboundWsGateway],
})
export class BridgeModule {}
