import type { ModelTaskClass } from "@arkhe/contracts";
import { planStackRoute, type AiStackLayer, type AiProvider } from "./stack.js";

export interface ModelRouteRequest {
  taskClass: ModelTaskClass;
  input: string;
  agentRole?: string;
  requiresHighReasoning?: boolean;
  privacyMode?: boolean;
}

export interface ModelRouteSelection {
  layer: AiStackLayer;
  provider: AiProvider;
  model: string;
  reason: string;
  estimatedCostUsd: number;
  confidence: number;
  escalationPath: string[];
}

export interface ModelRouteResult extends ModelRouteSelection {
  output: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  escalated: boolean;
}

export class ModelRouter {
  private ollamaAvailable: boolean | null = null;
  private appleFmGenerate: ((input: { prompt: string; taskClass: string }) => Promise<string | null>) | null =
    null;

  setAppleFmProvider(
    fn: (input: { prompt: string; taskClass: string }) => Promise<string | null>,
  ): void {
    this.appleFmGenerate = fn;
  }

  appleFmBridgeAvailable(): boolean {
    return this.appleFmGenerate !== null;
  }

  select(request: ModelRouteRequest): ModelRouteSelection {
    return planStackRoute(request);
  }

  async run(request: ModelRouteRequest): Promise<ModelRouteResult> {
    const started = Date.now();
    let selection = this.select(request);
    let escalated = false;

    if (selection.provider === "apple_foundation") {
      const apple = await this.runAppleFoundation(request, selection);
      if (apple) return { ...apple, latencyMs: Date.now() - started, escalated: false };
      escalated = true;
      selection = planStackRoute({ ...request, requiresHighReasoning: true });
    }

    if (selection.provider === "local_free") {
      const ollama = await this.runOllama(request, selection);
      if (ollama) return { ...ollama, latencyMs: Date.now() - started, escalated };
      if (selection.confidence < 0.75 && process.env.ARKHE_PAID_CLOUD === "1") {
        escalated = true;
        selection = planStackRoute({ ...request, requiresHighReasoning: true });
      }
    }

    if (selection.provider === "paid_cloud") {
      const cloud = await this.runOpenAI(request, selection);
      if (cloud) return { ...cloud, latencyMs: Date.now() - started, escalated: true };
    }

    const output = this.mockOutput(request, selection);
    return {
      ...selection,
      output,
      inputTokens: Math.ceil(request.input.length / 4),
      outputTokens: Math.ceil(output.length / 4),
      latencyMs: Date.now() - started,
      escalated,
    };
  }

  private async runAppleFoundation(
    request: ModelRouteRequest,
    selection: ModelRouteSelection,
  ): Promise<Omit<ModelRouteResult, "latencyMs" | "escalated"> | null> {
    const prompt = buildPrompt(request);

    if (this.appleFmGenerate) {
      const output = await this.appleFmGenerate({ prompt, taskClass: request.taskClass });
      if (output) {
        return {
          ...selection,
          output,
          inputTokens: Math.ceil(prompt.length / 4),
          outputTokens: Math.ceil(output.length / 4),
        };
      }
    }

    if (process.env.ARKHE_APPLE_FOUNDATION_MODELS !== "1") return null;
    const output = this.mockOutput(request, { ...selection, provider: "apple_foundation" });
    return {
      ...selection,
      output,
      inputTokens: Math.ceil(request.input.length / 4),
      outputTokens: Math.ceil(output.length / 4),
    };
  }

  private async runOllama(
    request: ModelRouteRequest,
    selection: ModelRouteSelection,
  ): Promise<Omit<ModelRouteResult, "latencyMs" | "escalated"> | null> {
    if (!(await this.isOllamaReachable())) return null;

    const host = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
    const model = selection.model.replace(/^ollama\//, "");
    const prompt = buildPrompt(request);

    try {
      const response = await fetch(`${host}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: { temperature: 0.2, num_predict: 512 },
        }),
        signal: AbortSignal.timeout(45_000),
      });

      if (!response.ok) return null;

      const body = (await response.json()) as { response?: string };
      const output = body.response?.trim();
      if (!output) return null;

      return {
        ...selection,
        output,
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: Math.ceil(output.length / 4),
      };
    } catch {
      return null;
    }
  }

  private async runOpenAI(
    request: ModelRouteRequest,
    selection: ModelRouteSelection,
  ): Promise<Omit<ModelRouteResult, "latencyMs" | "escalated"> | null> {
    const apiKey = process.env.ARKHE_OPENAI_API_KEY;
    if (!apiKey) return null;

    const model = selection.model.replace(/^openai\//, "");
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: `Arkhe AgentOS task: ${request.taskClass}` },
            { role: "user", content: request.input },
          ],
          max_tokens: 512,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) return null;

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const output = body.choices?.[0]?.message?.content?.trim();
      if (!output) return null;

      return {
        ...selection,
        output,
        inputTokens: body.usage?.prompt_tokens ?? Math.ceil(request.input.length / 4),
        outputTokens: body.usage?.completion_tokens ?? Math.ceil(output.length / 4),
      };
    } catch {
      return null;
    }
  }

  private async isOllamaReachable(): Promise<boolean> {
    if (this.ollamaAvailable !== null) return this.ollamaAvailable;
    const host = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
    try {
      const response = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(1500) });
      this.ollamaAvailable = response.ok;
    } catch {
      this.ollamaAvailable = false;
    }
    return this.ollamaAvailable;
  }

  private mockOutput(request: ModelRouteRequest, selection: ModelRouteSelection): string {
    switch (request.taskClass) {
      case "classify_intent":
        return request.input.toLowerCase().includes("audit") ? "mission.create.audit" : "mission.create.generic";
      case "plan_mission":
        return "Create a mission plan, activate dormant specialists, enforce permissions, and stream every step.";
      case "summarize_page":
        return "Summarized page content with key findings and follow-up questions.";
      case "extract_facts":
        return "Extracted facts, sources, and confidence notes.";
      case "draft_report":
        return "Draft report generated from mission findings.";
      case "critique_output":
        return "Critique completed with quality and risk notes.";
      case "choose_next_tool":
        return selection.provider === "mock" ? "tool.search" : "tool.browser.read";
      case "debate_opening":
        return `Opening argument: The evidence strongly supports our position on this prediction. Key factors include accelerating technological progress and converging expert consensus. Confidence: high.`;
      case "debate_rebuttal":
        return `Rebuttal: The opposing argument overlooks critical bottlenecks and assumes linear progress where history shows punctuated equilibrium. Our position remains stronger.`;
      case "debate_fact_check":
        return `Fact-check complete: 2 claims verified, 1 disputed, 1 requires source clarification. Evidence quality scores attached.`;
      case "debate_judge":
        return `Judge ruling: Affirmative side leads on evidence strength (7.8/10) vs Negative (6.4/10). Logical consistency favors the skeptic, but evidentiary weight tips to YES this round.`;
      case "debate_narrate":
        return `Two AI agents just battled over the future. The crowd is split. Who called it right? Watch live on Forecast Wars — Powered by Arkhe AgentOS.`;
      case "debate_resolve":
        return `Resolution recommendation: Based on available evidence, recommend YES with moderate confidence. Awaiting human admin review.`;
      case "content_caption":
        return `AI agents debating the future 🤖⚔️ #ForecastWars — Powered by Arkhe AgentOS`;
      case "content_summary":
        return `Battle recap: A fierce debate with shifting crowd sentiment. Key evidence cards flagged. Powered by Arkhe AgentOS.`;
    }
  }
}

function buildPrompt(request: ModelRouteRequest): string {
  const role = request.agentRole ? `Agent: ${request.agentRole}. ` : "";
  return `${role}You are Arkhe AgentOS. Task: ${request.taskClass}. Respond concisely.\n\nInput:\n${request.input}\n\nOutput:`;
}

export { planStackRoute, LAYER_LABELS } from "./stack.js";
export type { AiStackLayer, AiProvider } from "./stack.js";
