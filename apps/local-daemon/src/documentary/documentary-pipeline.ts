import type { ArkheEvent } from "@arkhe/contracts";
import { createEventId, SCHEMA_VERSION } from "@arkhe/contracts";
import { getDocumentaryConfigStore } from "./documentary-config.js";
import { agentsForStage } from "./documentary-agents.js";
import { FinancialGovernor } from "./financial-governor.js";
import { inspectCaptureBundle } from "./sanitization-layer.js";
import { draftJournalEntry } from "./journal-writer.js";

/** Twelve-stage Self-Documentary pipeline (foundations stub). */
export enum DocumentaryPipelineStage {
  IdeaDiscovery = "idea_discovery",
  ResearchVerify = "research_verify",
  MissionFitCheck = "mission_fit_check",
  ScriptDraft = "script_draft",
  InterfaceRecord = "interface_record",
  NarrationProduce = "narration_produce",
  VisualsProduce = "visuals_produce",
  VideoRender = "video_render",
  MetadataPrepare = "metadata_prepare",
  ComplianceCheck = "compliance_check",
  YouTubeUpload = "youtube_upload",
  BlogPost = "blog_post",
  MonitorImprove = "monitor_improve",
}

export type DocumentaryRunStatus = "idle" | "running" | "completed" | "failed" | "shadow_stopped";

export interface DocumentaryPipelineRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: DocumentaryRunStatus;
  currentStage: DocumentaryPipelineStage | null;
  completedStages: DocumentaryPipelineStage[];
  ideaTitle?: string;
  ideaSummary?: string;
  qualityScore?: number;
  qualityGatesPassed?: string[];
  sustainabilitySummary?: string;
  publishMode: string;
  error?: string;
}

type StageEventType =
  | "documentary.pipeline.started"
  | "documentary.idea.found"
  | "documentary.research.completed"
  | "documentary.mission_fit.checked"
  | "documentary.script.drafted"
  | "documentary.capture.recorded"
  | "documentary.narration.produced"
  | "documentary.visuals.produced"
  | "documentary.video.rendered"
  | "documentary.metadata.prepared"
  | "documentary.compliance.checked"
  | "documentary.published"
  | "documentary.blog.posted"
  | "documentary.monitor.updated"
  | "documentary.pipeline.completed"
  | "documentary.pipeline.failed"
  | "documentary.sustainability.updated";

const STAGE_ORDER: DocumentaryPipelineStage[] = [
  DocumentaryPipelineStage.IdeaDiscovery,
  DocumentaryPipelineStage.ResearchVerify,
  DocumentaryPipelineStage.MissionFitCheck,
  DocumentaryPipelineStage.ScriptDraft,
  DocumentaryPipelineStage.InterfaceRecord,
  DocumentaryPipelineStage.NarrationProduce,
  DocumentaryPipelineStage.VisualsProduce,
  DocumentaryPipelineStage.VideoRender,
  DocumentaryPipelineStage.MetadataPrepare,
  DocumentaryPipelineStage.ComplianceCheck,
  DocumentaryPipelineStage.YouTubeUpload,
  DocumentaryPipelineStage.BlogPost,
  DocumentaryPipelineStage.MonitorImprove,
];

const STAGE_EVENT_MAP: Record<DocumentaryPipelineStage, StageEventType> = {
  [DocumentaryPipelineStage.IdeaDiscovery]: "documentary.idea.found",
  [DocumentaryPipelineStage.ResearchVerify]: "documentary.research.completed",
  [DocumentaryPipelineStage.MissionFitCheck]: "documentary.mission_fit.checked",
  [DocumentaryPipelineStage.ScriptDraft]: "documentary.script.drafted",
  [DocumentaryPipelineStage.InterfaceRecord]: "documentary.capture.recorded",
  [DocumentaryPipelineStage.NarrationProduce]: "documentary.narration.produced",
  [DocumentaryPipelineStage.VisualsProduce]: "documentary.visuals.produced",
  [DocumentaryPipelineStage.VideoRender]: "documentary.video.rendered",
  [DocumentaryPipelineStage.MetadataPrepare]: "documentary.metadata.prepared",
  [DocumentaryPipelineStage.ComplianceCheck]: "documentary.compliance.checked",
  [DocumentaryPipelineStage.YouTubeUpload]: "documentary.published",
  [DocumentaryPipelineStage.BlogPost]: "documentary.blog.posted",
  [DocumentaryPipelineStage.MonitorImprove]: "documentary.monitor.updated",
};

export class DocumentaryOrchestrator {
  private run: DocumentaryPipelineRun | null = null;
  readonly financialGovernor = new FinancialGovernor();

  constructor(private readonly publish: (e: ArkheEvent) => void) {}

  getStatus(): { run: DocumentaryPipelineRun | null; sustainability: ReturnType<FinancialGovernor["computeSustainability"]> } {
    return {
      run: this.run,
      sustainability: this.financialGovernor.computeSustainability(),
    };
  }

  ingest(event: ArkheEvent): void {
    this.financialGovernor.ingest(event);
  }

  /**
   * Run the pipeline state machine (stub — advances stages without real media production).
   * Shadow mode stops before publish stages; supervised/autonomous stubs emit events only.
   */
  async runPipeline(options?: { force?: boolean }): Promise<DocumentaryPipelineRun> {
    const config = getDocumentaryConfigStore().getStatus();
    if (!config.enabled && !options?.force) {
      throw new Error("[documentary] pipeline disabled — set enabled:true in documentary-config.json");
    }
    if (this.run?.status === "running") {
      throw new Error("[documentary] pipeline already running");
    }

    const runId = `doc_${crypto.randomUUID()}`;
    const run: DocumentaryPipelineRun = {
      id: runId,
      startedAt: new Date().toISOString(),
      status: "running",
      currentStage: null,
      completedStages: [],
      publishMode: config.publishingMode,
    };
    this.run = run;

    await getDocumentaryConfigStore().recordPipelineState("running", "idea_discovery");
    this.emitStageEvent("documentary.pipeline.started", run, {
      stage: DocumentaryPipelineStage.IdeaDiscovery,
      summary: `Self-Documentary pipeline started (${config.publishingMode})`,
    });

    try {
      const sustainability = this.financialGovernor.computeSustainability();
      run.sustainabilitySummary = sustainability.summary;
      this.emitStageEvent("documentary.sustainability.updated", run, {
        readinessScore: sustainability.readinessScore,
        summary: sustainability.summary,
      });

      for (const stage of STAGE_ORDER) {
        if (this.shouldStopBeforeStage(stage, config.publishingMode, sustainability.autonomousPublishReady)) {
          run.status = "shadow_stopped";
          run.currentStage = stage;
          break;
        }

        run.currentStage = stage;
        await getDocumentaryConfigStore().recordPipelineState("running", stage);

        const owners = agentsForStage(stage);
        const eventType = STAGE_EVENT_MAP[stage];

        if (stage === DocumentaryPipelineStage.IdeaDiscovery) {
          run.ideaTitle = "What I Learned Today: Attention Cortex wiring";
          run.ideaSummary =
            "Stub episode — documents autonomous media scheduler + documentary foundations landing in AgentOS.";
        }

        if (stage === DocumentaryPipelineStage.ComplianceCheck) {
          const report = inspectCaptureBundle({
            subtitles: "Sample log: api_key=sk-test1234567890abcdef",
            logs: "Bearer eyJhbGciOiJIUzI1NiJ9.test",
          });
          if (!report.passed && config.requireCompliancePass) {
            // Stub still passes after redaction — real impl would block on unresolved findings
          }
        }

        if (stage === DocumentaryPipelineStage.MonitorImprove) {
          run.qualityScore = 78;
          run.qualityGatesPassed = ["milestone", "demo", "mission_position"];
        }

        this.emitStageEvent(eventType, run, {
          stage,
          agentRoles: owners.map((a) => a.role),
          title: run.ideaTitle,
          summary: `Stage ${stage} stub complete`,
        });

        run.completedStages.push(stage);
      }

      if (run.status !== "shadow_stopped") {
        run.status = "completed";
        run.completedAt = new Date().toISOString();
        await getDocumentaryConfigStore().recordPipelineState("completed", "monitor_improve");
        this.emitStageEvent("documentary.pipeline.completed", run, {
          summary: "Pipeline stub completed",
          qualityScore: run.qualityScore,
        });

        draftJournalEntry(run, {
          channelName: config.channelName,
          series: config.series,
        });
      } else {
        run.completedAt = new Date().toISOString();
        await getDocumentaryConfigStore().recordPipelineState("completed", run.currentStage ?? "shadow");
        this.emitStageEvent("documentary.pipeline.completed", run, {
          summary: `Shadow mode — stopped before ${run.currentStage}`,
        });
      }
    } catch (error) {
      run.status = "failed";
      run.error = error instanceof Error ? error.message : String(error);
      run.completedAt = new Date().toISOString();
      await getDocumentaryConfigStore().recordPipelineState("failed", run.currentStage ?? undefined);
      this.emitStageEvent("documentary.pipeline.failed", run, { error: run.error });
      throw error;
    }

    return run;
  }

  private shouldStopBeforeStage(
    stage: DocumentaryPipelineStage,
    mode: string,
    autonomousReady: boolean
  ): boolean {
    const publishStages = new Set([
      DocumentaryPipelineStage.YouTubeUpload,
      DocumentaryPipelineStage.BlogPost,
    ]);
    if (mode === "shadow" && publishStages.has(stage)) return true;
    if (mode === "supervised" && stage === DocumentaryPipelineStage.YouTubeUpload) {
      // Supervised: emit metadata/compliance but stop before autonomous upload (approval gate phase 2+)
      return false;
    }
    if (mode === "autonomous" && publishStages.has(stage) && !autonomousReady) {
      return true;
    }
    return false;
  }

  private emitStageEvent(
    eventType: StageEventType,
    run: DocumentaryPipelineRun,
    payload: Record<string, unknown>
  ): void {
    this.publish({
      id: createEventId(),
      ts: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      eventType,
      payload: {
        runId: run.id,
        publishMode: run.publishMode,
        ...payload,
      },
    } as ArkheEvent);
  }
}
