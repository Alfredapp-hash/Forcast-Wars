import { randomUUID } from "node:crypto";

export interface AppleFmRequest {
  requestId: string;
  prompt: string;
  taskClass: string;
}

export type AppleFmBroadcast = (payload: AppleFmRequest) => void;

/** Routes Layer 1 inference to the macOS app via WebSocket (Foundation Models). */
export class AppleFmBridge {
  private readonly waiters = new Map<
    string,
    { resolve: (output: string | null) => void; timer: NodeJS.Timeout }
  >();

  private broadcast: AppleFmBroadcast | null = null;
  private providerConnected = false;

  setBroadcast(fn: AppleFmBroadcast): void {
    this.broadcast = fn;
  }

  setProviderConnected(connected: boolean): void {
    this.providerConnected = connected;
  }

  isAvailable(): boolean {
    return (
      process.env.ARKHE_APPLE_FOUNDATION_MODELS === "1" &&
      this.providerConnected &&
      this.broadcast !== null
    );
  }

  async generate(input: { prompt: string; taskClass: string }): Promise<string | null> {
    if (!this.isAvailable() || !this.broadcast) return null;

    const requestId = randomUUID();
    return new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => {
        this.waiters.delete(requestId);
        resolve(null);
      }, 45_000);

      this.waiters.set(requestId, { resolve, timer });
      this.broadcast!({ requestId, prompt: input.prompt, taskClass: input.taskClass });
    });
  }

  resolve(requestId: string, output: string | null): void {
    const waiter = this.waiters.get(requestId);
    if (!waiter) return;
    clearTimeout(waiter.timer);
    this.waiters.delete(requestId);
    waiter.resolve(output);
  }
}
