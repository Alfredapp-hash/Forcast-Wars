import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { GatewayService } from '../services/gateway.service.js';
import type { HermesEnvelope } from '../hermes.types.js';

@Controller('gateway')
export class GatewayController {
  constructor(private readonly gateway: GatewayService) {}

  @Post('ingest')
  @HttpCode(HttpStatus.ACCEPTED)
  ingest(@Body() envelope: HermesEnvelope) {
    return this.gateway.ingest(envelope);
  }
}
