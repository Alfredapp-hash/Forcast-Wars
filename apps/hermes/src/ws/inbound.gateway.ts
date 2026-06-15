import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsResponse,
} from '@nestjs/websockets';
import { Logger, OnModuleInit } from '@nestjs/common';
import type { Server, WebSocket } from 'ws';
import { GatewayService } from '../services/gateway.service.js';
import { ApprovalsService } from '../services/approvals.service.js';
import type { HermesEnvelope, ApprovalRequest } from '../hermes.types.js';

@WebSocketGateway({ path: '/ws', transports: ['websocket'] })
export class InboundWsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(InboundWsGateway.name);
  private readonly clients = new Set<WebSocket>();

  constructor(
    private readonly gateway: GatewayService,
    private readonly approvals: ApprovalsService,
  ) {}

  onModuleInit() {
    this.approvals.setBroadcaster((event: string, data: unknown) => this.broadcast(event, data));
  }

  handleConnection(client: WebSocket) {
    this.clients.add(client);
    this.logger.log(`WS client connected (total: ${this.clients.size})`);
    this.send(client, { type: 'connected', ts: new Date().toISOString() });
  }

  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
    this.logger.log(`WS client disconnected (total: ${this.clients.size})`);
  }

  @SubscribeMessage('ingest')
  async handleIngest(
    @MessageBody() envelope: HermesEnvelope,
    @ConnectedSocket() _client: WebSocket,
  ): Promise<WsResponse<unknown>> {
    const result = await this.gateway.ingest(envelope);
    return { event: 'ingest_ack', data: result };
  }

  @SubscribeMessage('approval_resolve')
  async handleApprovalResolve(
    @MessageBody() body: { approvalId: string; granted: boolean },
    @ConnectedSocket() _client: WebSocket,
  ): Promise<WsResponse<unknown>> {
    await this.approvals.resolve(body.approvalId, body.granted);
    return { event: 'approval_ack', data: { approvalId: body.approvalId, granted: body.granted } };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() _client: WebSocket): WsResponse<unknown> {
    return { event: 'pong', data: { ts: new Date().toISOString() } };
  }

  broadcast(event: string, data: unknown): void {
    const payload = JSON.stringify({ event, data });
    for (const client of this.clients) {
      try {
        client.send(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  private send(client: WebSocket, data: unknown): void {
    try {
      client.send(JSON.stringify(data));
    } catch {
      this.clients.delete(client);
    }
  }
}

export type { ApprovalRequest };
