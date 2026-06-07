import { WebSocketServer, type WebSocket } from "ws";
import type { DirectorCommand } from "@arkhe/contracts";
import type { EventBus } from "../event-bus.js";
import type { ServerConfig } from "../config.js";
import type { Director } from "@arkhe/orchestrator";

interface ClientMessage {
  type: string;
  topics?: string[];
  payload?: {
    utterance?: string;
    source?: string;
  };
}

export class IpcServer {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly config: ServerConfig,
    private readonly eventBus: EventBus,
    private readonly director: Director,
  ) {}

  async start(): Promise<void> {
    this.unsubscribe = this.eventBus.subscribe((message) => {
      this.broadcast({ type: "event", message });
    });

    this.wss = new WebSocketServer({ port: this.config.wsPort });

    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);
      ws.send(JSON.stringify({ type: "connected", version: "0.1.0" }));

      ws.on("message", (raw: Buffer | ArrayBuffer | Buffer[]) => {
        void this.handleMessage(ws, raw.toString());
      });

      ws.on("close", () => this.clients.delete(ws));
    });
  }

  async stop(): Promise<void> {
    this.unsubscribe?.();
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();
    await new Promise<void>((resolve) => {
      this.wss?.close(() => resolve());
    });
  }

  private async handleMessage(_ws: WebSocket, raw: string): Promise<void> {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case "subscribe":
        break;
      case "command": {
        const utterance = msg.payload?.utterance?.trim();
        if (!utterance) return;
        const command: DirectorCommand = {
          id: crypto.randomUUID(),
          ts: new Date().toISOString(),
          source: (msg.payload?.source as DirectorCommand["source"]) ?? "ui",
          utterance,
        };
        await this.director.handleCommand(command);
        break;
      }
      case "kill_switch":
        await this.director.killAll();
        break;
    }
  }

  private broadcast(payload: unknown): void {
    const text = JSON.stringify(payload);
    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        client.send(text);
      }
    }
  }
}
