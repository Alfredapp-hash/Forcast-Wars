import type { ServerConfig } from "./config.js";
import { EventBus } from "./event-bus.js";
import { IpcServer } from "./ipc/server.js";
import { Director, MissionExecutor, AgentRegistry } from "@arkhe/orchestrator";
import { LocalMemoryStore } from "@arkhe/memory";
import { ModelRouter } from "@arkhe/model-router";
import { BrowserRuntime } from "@arkhe/browser-runtime";
import { ToolGateway } from "@arkhe/tool-gateway";
import { SupabaseSync } from "@arkhe/supabase-sync";
import { TelemetrySampler } from "./telemetry/sampler.js";
import { ApprovalGate } from "./approvals/gate.js";
import { AiResourceManager } from "./telemetry/ai-resource-manager.js";
import { AppleFmBridge } from "./apple-fm/bridge.js";

const config: ServerConfig = {
  socketPath: process.env.ARKHE_SOCKET ?? `${process.env.HOME}/.arkhe/daemon.sock`,
  wsPort: Number(process.env.ARKHE_WS_PORT ?? 9470),
  natsUrl: process.env.NATS_URL ?? "nats://127.0.0.1:4222",
  dataDir: process.env.ARKHE_DATA_DIR ?? `${process.env.HOME}/.arkhe`,
  memoryPath: process.env.ARKHE_MEMORY_PATH ?? `${process.env.HOME}/.arkhe/events.json`,
  artifactsDir: process.env.ARKHE_ARTIFACTS_DIR ?? `${process.env.HOME}/.arkhe/artifacts`,
};

async function main() {
  const eventBus = new EventBus(config);
  const telemetry = new TelemetrySampler(eventBus);
  const memoryStore = new LocalMemoryStore({ path: config.memoryPath });
  await memoryStore.load();

  const publish = (event: Parameters<EventBus["publish"]>[0]) => eventBus.publish(event);
  const approvalGate = new ApprovalGate(publish);
  const agentRegistry = new AgentRegistry();
  const appleFmBridge = new AppleFmBridge();
  const modelRouter = new ModelRouter();
  modelRouter.setAppleFmProvider((input) => appleFmBridge.generate(input));
  const supabaseSync = SupabaseSync.fromEnv();
  const browserRuntime = new BrowserRuntime({ artifactsDir: config.artifactsDir });
  const toolGateway = new ToolGateway();
  const aiResources = new AiResourceManager(publish);

  const director = new Director({
    publish,
    modelRouter,
    agentRegistry,
    executor: new MissionExecutor({
      publish,
      modelRouter,
      browserRuntime,
      toolGateway,
      approvalClient: approvalGate,
    }),
  });

  const ipc = new IpcServer(
    config,
    eventBus,
    director,
    approvalGate,
    memoryStore,
    agentRegistry,
    aiResources,
    appleFmBridge,
    supabaseSync,
  );

  await eventBus.connect();
  await ipc.start();
  telemetry.start();
  aiResources.start();

  const flushInterval = setInterval(() => {
    void memoryStore.flush();
  }, 30_000);

  const supabaseInterval = setInterval(() => {
    void supabaseSync.syncExperts(agentRegistry.snapshot());
  }, 60_000);

  if (supabaseSync.getStatus().enabled) {
    void supabaseSync.ping().then((ok) => {
      console.log(`[arkhe-daemon] Supabase sync ${ok ? "connected" : "configured but unreachable"}`);
    });
    void supabaseSync.syncExperts(agentRegistry.snapshot());
  }

  console.log(`[arkhe-daemon] WebSocket :${config.wsPort}`);
  console.log(`[arkhe-daemon] Apple FM bridge ${process.env.ARKHE_APPLE_FOUNDATION_MODELS === "1" ? "enabled (via macOS app)" : "disabled"}`);
  console.log(`[arkhe-daemon] Playwright browser runtime enabled`);
  console.log(`[arkhe-daemon] Artifacts ${config.artifactsDir}`);

  const shutdown = async (signal: string) => {
    console.log(`[arkhe-daemon] ${signal} — shutting down`);
    clearInterval(flushInterval);
    clearInterval(supabaseInterval);
    aiResources.stop();
    telemetry.stop();
    await browserRuntime.shutdown();
    await memoryStore.flush();
    await supabaseSync.syncExperts(agentRegistry.snapshot());
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
