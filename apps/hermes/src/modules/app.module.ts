import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '../providers/configuration.js';
import { HealthModule } from './health.module.js';
import { CapabilitiesModule } from './capabilities.module.js';
import { GatewayModule } from './gateway.module.js';
import { BridgeModule } from './bridge.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    HealthModule,
    CapabilitiesModule,
    GatewayModule,
    BridgeModule,
  ],
})
export class AppModule {}
