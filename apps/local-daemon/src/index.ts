import type { ServerConfig } from "./config.js";
import { EventBus } from "./event-bus.js";
import { IpcServer } from "./ipc/server.js";
import { Director } from "@arkhe/orchestrator";

const config: ServerConfig = {
  socketPath: process.env.ARKHE_SOCKET ?? `${process.env.HOME}/.arkhe/daemon.sock`,
  wsPort: Number(process.env.ARKHE_WS_PORT ?? 9470),
  natsUrl: process.env.NATS_URL ?? "nats://127.0.0.1:4222",
};

async function main() {
  const eventBus = new EventBus(config);

  const director = new Director({
    publish: (event) => eventBus.publish(event),
  });

  const ipc = new IpcServer(config, eventBus, director);

  await eventBus.connect();
  await ipc.start();

  console.log(`[arkhe-daemon] WebSocket :${config.wsPort}`);
  console.log(`[arkhe-daemon] Unix socket ${config.socketPath} (pending)`);

  const shutdown = async (signal: string) => {
    console.log(`[arkhe-daemon] ${signal} — shutting down`);
    await ipc.stop();
    await eventBus.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[arkhe-daemon] fatal:", err);
  process.exit(1);
});
