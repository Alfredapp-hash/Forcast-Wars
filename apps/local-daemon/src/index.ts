import type { ServerConfig } from "./config.js";
import { EventBus } from "./event-bus.js";
import { IpcServer } from "./ipc/server.js";
import { Director, MissionExecutor, AgentRegistry, SynapseEngine } from "@arkhe/orchestrator";
import { HumanMemoryStore, LocalMemoryStore } from "@arkhe/memory";
import { ModelRouter } from "@arkhe/model-router";
import { BrowserRuntime } from "@arkhe/browser-runtime";
import { ToolGateway } from "@arkhe/tool-gateway";
import { SupabaseSync } from "@arkhe/supabase-sync";
import { TelemetrySampler } from "./telemetry/sampler.js";
import { ApprovalGate } from "./approvals/gate.js";
import { AiResourceManager } from "./telemetry/ai-resource-manager.js";
import { AppleFmBridge } from "./apple-fm/bridge.js";
import { DreamingService } from "./memory/dreaming.js";
import { AttentionOrchestrator } from "./attention/trend-intelligence.js";
import { initAttentionConfig } from "./attention/attention-config.js";
import { initDocumentaryConfig } from "./documentary/documentary-config.js";
import { DocumentaryOrchestrator } from "./documentary/documentary-pipeline.js";
import { HealthService } from "./health/status.js";
import { HermesClient } from "./hermes/client.js";
import { DebateOrchestrator, DebateRunner } from "./forecast-wars/index.js";
import { startDebateWebhookServer } from "./forecast-wars/debate-webhook.js";

const config: ServerConfig = {
  socketPath: process.env.ARKHE_SOCKET ?? `${process.env.HOME}/.arkhe/daemon.sock`,
  wsPort: Number(process.env.ARKHE_WS_PORT ?? 9470),
  natsUrl: process.env.NATS_URL ?? "nats://127.0.0.1:4222",
  dataDir: process.env.ARKHE_DATA_DIR ?? `${process.env.HOME}/.arkhe`,
  memoryPath: process.env.ARKHE_MEMORY_PATH ?? `${process.env.HOME}/.arkhe/events.json`,
  artifactsDir: process.env.ARKHE_ARTIFACTS_DIR ?? `${process.env.HOME}/.arkhe/artifacts`,
};

async function main() {
  const attentionConfig = initAttentionConfig(config.dataDir);
  await attentionConfig.load();
  const documentaryConfig = initDocumentaryConfig(config.dataDir);
  await documentaryConfig.load();

  const eventBus = new EventBus(config);
  const telemetry = new TelemetrySampler(eventBus);
  const memoryStore = new LocalMemoryStore({ path: config.memoryPath });
  await memoryStore.load();
  const humanMemory = new HumanMemoryStore({
    path: process.env.ARKHE_MEMORIES_PATH ?? `${config.dataDir}/MEMORIES.md`,
  });
  await humanMemory.ensure();

  const publish = (event: Parameters<EventBus["publish"]>[0]) => eventBus.publish(event);
  const approvalGate = new ApprovalGate(publish);
  const agentRegistry = new AgentRegistry();
  const synapseEngine = new SynapseEngine(agentRegistry);
  const appleFmBridge = new AppleFmBridge();
  const modelRouter = new ModelRouter();
  modelRouter.setAppleFmProvider((input) => appleFmBridge.generate(input));
  const supabaseSync = SupabaseSync.fromEnv();
  const supabaseEnabled = supabaseSync.getStatus().enabled;
  const browserRuntime = new BrowserRuntime({ artifactsDir: config.artifactsDir });
  const toolGateway = new ToolGateway();
  const aiResources = new AiResourceManager(publish);
  const dreaming = new DreamingService({
    localMemory: memoryStore,
    humanMemory,
    modelRouter,
    supabaseSync,
    publish,
  });

  const attention = new AttentionOrchestrator(publish, modelRouter, supabaseSync);
  const documentary = new DocumentaryOrchestrator(publish);

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

  const debateOrchestrator = new DebateOrchestrator({
    publish,
    modelRouter,
    director,
  });

  const debateRunner = new DebateRunner({
    orchestrator: debateOrchestrator,
    getClient: () => supabaseSync.getClient(),
    publish,
  });

  const debateWebhookPort = Number(process.env.ARKHE_DEBATE_WEBHOOK_PORT ?? 9471);
  const debateWebhookServer = startDebateWebhookServer(
    debateWebhookPort,
    debateRunner,
    debateOrchestrator,
  );

  const hermesClient = new HermesClient();

  eventBus.subscribe((msg) => {
    if (msg.event.eventType === "approval.requested") {
      void hermesClient.forwardApprovalEvent(msg.event as import("@arkhe/contracts").ApprovalEvent);
    }
    if (msg.event.eventType === "prediction.created") {
      const payload = (msg.event as import("@arkhe/contracts").DebateEvent).payload;
      console.log(`[forecast-wars] Prediction created: ${payload.title ?? payload.predictionSlug}`);
      if (payload.predictionId && (payload as { debateRoomId?: string }).debateRoomId) {
        const debateRoomId = (payload as { debateRoomId?: string }).debateRoomId!;
        void debateRunner
          .runFullFlow({
            debateRoomId,
            predictionId: payload.predictionId,
            title: payload.title ?? "Debate",
            yesPosition: "",
            noPosition: "",
            affirmativeAgentId: "agt_athena",
            negativeAgentId: "agt_prometheus",
          })
          .catch((err) => console.error("[forecast-wars] debate run failed:", err));
      }
    }
    if (msg.event.eventType === "debate.turn_submitted") {
      const payload = (msg.event as import("@arkhe/contracts").DebateEvent).payload;
      console.log(`[forecast-wars] Turn submitted by ${payload.agentRole} (${payload.side})`);
    }
  });

  const healthService = new HealthService(eventBus, {
    supabaseSync,
    appleFmBridgeEnabled: process.env.ARKHE_APPLE_FOUNDATION_MODELS === "1",
    probePlaywright: () => browserRuntime.probe(),
  });

  const ipc = new IpcServer(
    config,
    eventBus,
    director,
    approvalGate,
    healthService,
    memoryStore,
    agentRegistry,
    synapseEngine,
    aiResources,
    appleFmBridge,
    supabaseSync,
    humanMemory,
    dreaming,
    attention,
    documentary,
    debateOrchestrator,
    debateRunner,
  );

  try {
    await eventBus.connect();
  } catch (error) {
    console.error(`[arkhe-daemon] Event bus connection error:`, error);
  }

  if (!eventBus.isConnected()) {
    console.warn(
      `[arkhe-daemon] NATS JetStream unavailable at ${config.natsUrl} — running with in-process event bus only`
    );
  }
  await ipc.start();
  telemetry.start();
  aiResources.start();
  dreaming.start();

  const forecastWarsFocus = process.env.ARKHE_FORECAST_WARS_FOCUS === "1";

  // Attention Cortex autonomous scheduler hook (attn-big).
  // Respects ARKHE_ATTENTION_SCAN_INTERVAL_MS (default 4h for alpha; set to e.g. 86400000 for daily).
  // When it fires: attention.scan({ realSources: true }) — exercises the adapter path (YouTubeTrends etc).
  // Stopped cleanly on shutdown. Also manually triggerable via IPC "attention_scan" (uses legacy mock path for qa).
  const attentionScanIntervalMs = Number(
    process.env.ARKHE_ATTENTION_SCAN_INTERVAL_MS ?? 4 * 60 * 60 * 1000
  );
  let attentionTimer: NodeJS.Timeout | null = null;
  const startAutonomousAttention = () => {
    if (forecastWarsFocus) {
      console.log("[attention] Autonomous scan disabled (ARKHE_FORECAST_WARS_FOCUS=1)");
      return;
    }
    if (attentionTimer) return;
    console.log(
      `[attention] Autonomous scan started (interval ~${Math.round(
        attentionScanIntervalMs / 3600000
      )}h; env ARKHE_ATTENTION_SCAN_INTERVAL_MS to override)`
    );
    // Fire an initial scan shortly after boot (gives IPC time to come up) so the real-sources path is exercised in dev/alpha.
    const initialDelay = 12_000;
    setTimeout(() => {
      console.log("[attention] Autonomous scan firing (initial, realSources=true)");
      void attention
        .scan({ realSources: true, maxOpportunities: 3 })
        .catch((e) => console.error("[attention] autonomous scan error", e));
    }, initialDelay);
    attentionTimer = setInterval(() => {
      console.log("[attention] Autonomous scan firing (realSources=true)");
      void attention
        .scan({ realSources: true, maxOpportunities: 3 })
        .catch((e) => console.error("[attention] autonomous scan error", e));
    }, attentionScanIntervalMs);
  };
  startAutonomousAttention();

  // Self-Documentary autonomous scheduler hook — respects ARKHE_DOCUMENTARY_SCAN_INTERVAL_MS (default 24h).
  const documentaryScanIntervalMs = Number(
    process.env.ARKHE_DOCUMENTARY_SCAN_INTERVAL_MS ?? 24 * 60 * 60 * 1000
  );
  let documentaryTimer: NodeJS.Timeout | null = null;
  const startAutonomousDocumentary = () => {
    if (forecastWarsFocus) {
      console.log("[documentary] Autonomous pipeline disabled (ARKHE_FORECAST_WARS_FOCUS=1)");
      return;
    }
    const docStatus = documentaryConfig.getStatus();
    if (!docStatus.enabled) {
      console.log("[documentary] Autonomous pipeline disabled (set enabled:true in documentary-config.json)");
      return;
    }
    if (documentaryTimer) return;
    console.log(
      `[documentary] Autonomous pipeline started (interval ~${Math.round(
        documentaryScanIntervalMs / 3600000
      )}h; env ARKHE_DOCUMENTARY_SCAN_INTERVAL_MS to override)`
    );
    documentaryTimer = setInterval(() => {
      console.log("[documentary] Autonomous pipeline firing");
      void documentary
        .runPipeline()
        .catch((e) => console.error("[documentary] autonomous pipeline error", e));
    }, documentaryScanIntervalMs);
  };
  startAutonomousDocumentary();

  const flushInterval = setInterval(() => {
    void memoryStore.flush();
  }, 30_000);

  let supabaseInterval: NodeJS.Timeout | null = null;
  const syncSupabaseExperts = () =>
    supabaseSync
      .syncExperts(agentRegistry.snapshot())
      .catch((error) => console.error("[supabase-sync] syncExperts failed:", error));
  const syncSupabaseSynapses = () =>
    supabaseSync
      .syncSynapses(synapseEngine.snapshot().synapses)
      .catch((error) => console.error("[supabase-sync] syncSynapses failed:", error));

  if (supabaseEnabled) {
    supabaseInterval = setInterval(() => {
      void syncSupabaseExperts();
      void syncSupabaseSynapses();
    }, 60_000);

    void supabaseSync
      .ping()
      .then((ok: boolean) => {
        console.log(`[arkhe-daemon] Supabase sync ${ok ? "connected" : "configured but unreachable"}`);
      })
      .catch((error) => console.error("[supabase-sync] ping failed:", error));

    void syncSupabaseExperts();
    void syncSupabaseSynapses();
  } else {
    console.warn(
      "[arkhe-daemon] Supabase sync disabled — set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY to enable resident sync"
    );
  }

  console.log(`[arkhe-daemon] WebSocket :${config.wsPort}`);
  console.log(`[arkhe-daemon] Apple FM bridge ${process.env.ARKHE_APPLE_FOUNDATION_MODELS === "1" ? "enabled (via macOS app)" : "disabled"}`);
  console.log(`[arkhe-daemon] Playwright browser runtime enabled`);
  console.log(`[arkhe-daemon] Artifacts ${config.artifactsDir}`);
  console.log(
    `[arkhe-daemon] Attention Cortex (Autonomous Media) available — manual: attention_scan or voice; autonomous: every ${Math.round(
      attentionScanIntervalMs / 3600000
    )}h (set ARKHE_ATTENTION_SCAN_INTERVAL_MS); uses realSources adapter path on schedule`
  );
  console.log(
    `[arkhe-daemon] Self-Documentary pipeline available — manual: documentary_run IPC; autonomous when enabled: every ${Math.round(
      documentaryScanIntervalMs / 3600000
    )}h (set ARKHE_DOCUMENTARY_SCAN_INTERVAL_MS); config ~/.arkhe/documentary-config.json`
  );

  const shutdown = async (signal: string) => {
    console.log(`[arkhe-daemon] ${signal} — shutting down`);
    clearInterval(flushInterval);
    if (supabaseInterval) clearInterval(supabaseInterval);
    if (attentionTimer) clearInterval(attentionTimer);
    if (documentaryTimer) clearInterval(documentaryTimer);
    dreaming.stop();
    aiResources.stop();
    telemetry.stop();
    await browserRuntime.shutdown();
    await memoryStore.flush();
    if (supabaseEnabled) {
      await supabaseSync.syncExperts(agentRegistry.snapshot()).catch((error) =>
        console.error("[supabase-sync] shutdown syncExperts failed:", error)
      );
      await supabaseSync.syncSynapses(synapseEngine.snapshot().synapses).catch((error) =>
        console.error("[supabase-sync] shutdown syncSynapses failed:", error)
      );
    }
    hermesClient.stop();
    debateWebhookServer.close();
    await ipc.stop();
    await eventBus.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  hermesClient.registerCapability({
    id: "agt_director_01",
    name: "Director",
    kind: "agent",
    roles: ["general", "orchestrate", "plan"],
    skills: ["mission", "orchestration", "delegation"],
  }).catch(() => { /* hermes not yet up */ });

  // Register Forecast Wars debate agents with Hermes
  const forecastAgents = [
    { id: "agt_athena", name: "Athena", roles: ["affirmative", "debate"], skills: ["debate", "forecast"] },
    { id: "agt_prometheus", name: "Prometheus", roles: ["negative", "debate"], skills: ["debate", "skeptic"] },
    { id: "agt_judge", name: "Judge Agent", roles: ["judge", "debate"], skills: ["debate.score"] },
    { id: "agt_factcheck", name: "Fact-Check Agent", roles: ["fact_check", "debate"], skills: ["evidence.verify"] },
    { id: "agt_narrator", name: "Narrator Agent", roles: ["narrator", "content"], skills: ["content.write"] },
    { id: "agt_resolution", name: "Resolution Agent", roles: ["resolution"], skills: ["prediction.monitor"] },
  ];
  for (const agent of forecastAgents) {
    hermesClient.registerCapability({
      id: agent.id,
      name: agent.name,
      kind: "agent",
      roles: agent.roles,
      skills: agent.skills,
      priorityLayer: 2,
    }).catch(() => { /* hermes not yet up */ });
  }

  void debateOrchestrator;
  void debateRunner;
}

main().catch((err) => {
  console.error("[arkhe-daemon] fatal:", err);
  process.exit(1);
});
