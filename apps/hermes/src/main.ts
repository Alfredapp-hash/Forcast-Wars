import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './modules/app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useWebSocketAdapter(new WsAdapter(app));
  const config = app.get(ConfigService);
  const port = config.get<number>('hermes.PORT') ?? 4000;
  const host = config.get<string>('hermes.HOST') ?? '0.0.0.0';
  await app.listen(port, host);
  Logger.log(`Hermes listening on http://${host}:${port}`, 'Bootstrap');
}

void bootstrap();
