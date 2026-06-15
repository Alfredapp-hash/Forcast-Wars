import type { AgentId } from "@arkhe/contracts";

export type ExpertStatus = "dormant" | "active" | "busy";
export type AgentCortex = "core" | "business" | "personal" | "development" | "attention" | "forecast" | "general";

export interface ResidentExpert {
  id: AgentId;
  role: string;
  specialty: string;
  cortex: AgentCortex;
  permanent: boolean;
  preferredLayer: 1 | 2 | 3 | 4;
  preferredModel: string;
  allowedTools: string[];
  status: ExpertStatus;
  activations: number;
  lastActivatedAt?: string;
}

const EXPERT_DEFINITIONS: Array<Omit<ResidentExpert, "status" | "activations" | "lastActivatedAt">> = [
  {
    id: "agt_director_01" as AgentId,
    role: "Director",
    specialty: "Mission planning, routing, and orchestration",
    cortex: "core",
    permanent: true,
    preferredLayer: 2,
    preferredModel: "ollama/qwen3:8b",
    allowedTools: ["mission.plan", "agent.route", "approval.request"],
  },
  {
    id: "agt_resident_security" as AgentId,
    role: "Security Agent",
    specialty: "Permission boundaries, risk review, and anomaly detection",
    cortex: "core",
    permanent: true,
    preferredLayer: 1,
    preferredModel: "apple-foundation-local",
    allowedTools: ["policy.review", "audit.read", "tool.block"],
  },
  {
    id: "agt_resident_voice" as AgentId,
    role: "Voice Agent",
    specialty: "Wake word, transcript cleanup, and voice session state",
    cortex: "core",
    permanent: true,
    preferredLayer: 1,
    preferredModel: "apple-foundation-local",
    allowedTools: ["voice.listen", "voice.transcribe", "voice.speak"],
  },
  {
    id: "agt_resident_observability" as AgentId,
    role: "Observability Agent",
    specialty: "Telemetry, health, cost, and bottleneck detection",
    cortex: "core",
    permanent: true,
    preferredLayer: 1,
    preferredModel: "apple-foundation-local",
    allowedTools: ["telemetry.read", "cost.analyze", "health.report"],
  },
  {
    id: "agt_resident_scheduler" as AgentId,
    role: "Scheduler Agent",
    specialty: "Calendar, reminders, and time-blocking",
    cortex: "personal",
    permanent: false,
    preferredLayer: 1,
    preferredModel: "apple-foundation-local",
    allowedTools: ["calendar.read", "calendar.write", "reminder.create"],
  },
  {
    id: "agt_resident_seo" as AgentId,
    role: "SEO Agent",
    specialty: "Technical SEO audits and content gaps",
    cortex: "business",
    permanent: false,
    preferredLayer: 2,
    preferredModel: "ollama/qwen3:8b",
    allowedTools: ["search", "analyze.seo", "browser.read"],
  },
  {
    id: "agt_resident_crm" as AgentId,
    role: "CRM Agent",
    specialty: "CRM notes, contact updates, pipeline hygiene",
    cortex: "business",
    permanent: false,
    preferredLayer: 1,
    preferredModel: "apple-foundation-local",
    allowedTools: ["crm.read", "crm.write", "summarize"],
  },
  {
    id: "agt_resident_research" as AgentId,
    role: "Research Agent",
    specialty: "Multi-step research and competitive intel",
    cortex: "personal",
    permanent: false,
    preferredLayer: 2,
    preferredModel: "ollama/deepseek-r1:8b",
    allowedTools: ["search", "summarize", "extract", "browser.read"],
  },
  {
    id: "agt_resident_coding" as AgentId,
    role: "Coding Agent",
    specialty: "Code generation, refactoring, and review",
    cortex: "development",
    permanent: false,
    preferredLayer: 4,
    preferredModel: "openai/gpt-4.1",
    allowedTools: ["code.read", "code.write", "code.review"],
  },
  {
    id: "agt_resident_vault" as AgentId,
    role: "Ark Vault Agent",
    specialty: "Personal knowledge vault and memory retrieval",
    cortex: "core",
    permanent: true,
    preferredLayer: 2,
    preferredModel: "ollama/llama3.2",
    allowedTools: ["memory.search", "memory.retrieve", "memory.write"],
  },
  {
    id: "agt_resident_marketing" as AgentId,
    role: "Marketing Agent",
    specialty: "Brand voice, copy polish, and campaign drafts",
    cortex: "business",
    permanent: false,
    preferredLayer: 2,
    preferredModel: "ollama/mistral-small",
    allowedTools: ["document.format", "brand.apply", "summarize"],
  },
  {
    id: "agt_resident_browser" as AgentId,
    role: "Browser Agent",
    specialty: "Playwright navigation and evidence capture",
    cortex: "personal",
    permanent: false,
    preferredLayer: 2,
    preferredModel: "ollama/llama3.2",
    allowedTools: ["browser.navigate", "browser.screenshot", "browser.dom"],
  },
  {
    id: "agt_resident_report" as AgentId,
    role: "Report Agent",
    specialty: "Report drafting and publishing",
    cortex: "business",
    permanent: false,
    preferredLayer: 2,
    preferredModel: "ollama/mistral-small",
    allowedTools: ["document.write", "document.publish", "summarize"],
  },
  {
    id: "agt_resident_content" as AgentId,
    role: "Content Agent",
    specialty: "Content briefs, outlines, and editorial structure",
    cortex: "business",
    permanent: false,
    preferredLayer: 2,
    preferredModel: "ollama/mistral-small",
    allowedTools: ["document.write", "brand.apply", "summarize"],
  },
  {
    id: "agt_resident_social" as AgentId,
    role: "Social Agent",
    specialty: "Social posts, distribution angles, and campaign repurposing",
    cortex: "business",
    permanent: false,
    preferredLayer: 2,
    preferredModel: "ollama/mistral-small",
    allowedTools: ["document.write", "social.plan", "brand.apply"],
  },
  {
    id: "agt_resident_analytics" as AgentId,
    role: "Analytics Agent",
    specialty: "Metrics interpretation, funnel analysis, and reporting",
    cortex: "business",
    permanent: false,
    preferredLayer: 2,
    preferredModel: "ollama/qwen3:8b",
    allowedTools: ["analytics.read", "summarize", "chart.explain"],
  },
  {
    id: "agt_resident_email" as AgentId,
    role: "Email Agent",
    specialty: "Inbox triage, drafts, and follow-up sequencing",
    cortex: "personal",
    permanent: false,
    preferredLayer: 1,
    preferredModel: "apple-foundation-local",
    allowedTools: ["email.read", "email.draft", "email.send"],
  },
  {
    id: "agt_resident_qa" as AgentId,
    role: "QA Agent",
    specialty: "Test planning, regression checks, and release confidence",
    cortex: "development",
    permanent: false,
    preferredLayer: 2,
    preferredModel: "ollama/qwen3:8b",
    allowedTools: ["test.run", "code.read", "issue.report"],
  },
  {
    id: "agt_resident_architecture" as AgentId,
    role: "Architecture Agent",
    specialty: "System design, tradeoffs, and technical direction",
    cortex: "development",
    permanent: false,
    preferredLayer: 4,
    preferredModel: "openai/gpt-4.1",
    allowedTools: ["code.read", "design.review", "document.write"],
  },
  {
    id: "agt_resident_general" as AgentId,
    role: "General Agent",
    specialty: "Fallback mission execution",
    cortex: "general",
    permanent: false,
    preferredLayer: 2,
    preferredModel: "ollama/llama3.2",
    allowedTools: ["search", "summarize"],
  },

  // ------------------------------------------------------------------
  // Attention Cortex — Autonomous Media Company (Arkhe manufactures attention)
  // These agents form a closed loop: watch trends → score opportunity →
  // generate content → produce video (Veo/Runway/Kling/Hailuo) → publish (YT + social) →
  // analyze performance → dream/reflect → strengthen Neural Mesh synapses → evolve.
  // 80% valuable content (AI news, productivity, SaaS, marketing) + 20% meta ("how Alfred made this").
  // ------------------------------------------------------------------
  {
    id: "agt_resident_trend_intel" as AgentId,
    role: "Trend Intelligence Agent",
    specialty: "Continuous monitoring of YouTube, Shorts, TikTok, X, Reddit, Google Trends, Search Console for velocity, keywords, engagement, competition",
    cortex: "attention",
    permanent: true,
    preferredLayer: 2,
    preferredModel: "ollama/qwen3:8b",
    allowedTools: ["search", "browser.read", "analytics.read", "trend.poll"],
  },
  {
    id: "agt_resident_opportunity" as AgentId,
    role: "Opportunity Agent",
    specialty: "Scores trend signals into ranked opportunities (search growth, competition, virality potential, brand fit). Only high-value ideas advance.",
    cortex: "attention",
    permanent: true,
    preferredLayer: 2,
    preferredModel: "ollama/deepseek-r1:8b",
    allowedTools: ["analyze.opportunity", "rank", "memory.search"],
  },
  {
    id: "agt_resident_content" as AgentId,
    role: "Content Agent",
    specialty: "Generates full assets: hook, script, storyboard, CTA, description, hashtags, thumbnail concepts. 80/20 valuable + meta storytelling.",
    cortex: "attention",
    permanent: false,
    preferredLayer: 2,
    preferredModel: "ollama/mistral-small",
    allowedTools: ["document.write", "brand.apply", "memory.retrieve"],
  },
  {
    id: "agt_resident_video_prod" as AgentId,
    role: "Video Production Agent",
    specialty: "Orchestrates AI video: Veo (story/realism), Runway (production/editing), Kling (value/social), Hailuo (character/stylized). Voiceover, captions, motion, sound design.",
    cortex: "attention",
    permanent: true,
    preferredLayer: 3,
    preferredModel: "veo-2", // or runway-gen3, kling-1.6, hailuo-01 — actual call is provider-specific
    allowedTools: ["video.generate", "video.edit", "voiceover", "caption", "artifact.write"],
  },
  {
    id: "agt_resident_youtube" as AgentId,
    role: "YouTube Agent",
    specialty: "Upload, scheduling, metadata (title/desc/tags/chapters), thumbnail selection, end screens, cards, playlist strategy, and Shorts cross-posting.",
    cortex: "attention",
    permanent: true,
    preferredLayer: 2,
    preferredModel: "ollama/qwen3:8b",
    allowedTools: ["youtube.upload", "youtube.metadata", "youtube.schedule", "thumbnail.select"],
  },
  {
    id: "agt_resident_marketing" as AgentId,
    role: "Marketing Agent",
    specialty: "Multi-platform amplification: X threads, LinkedIn posts, Reddit strategy, blog repurposing, email newsletters, community seeding from performance data.",
    cortex: "attention",
    permanent: false,
    preferredLayer: 2,
    preferredModel: "ollama/mistral-small",
    allowedTools: ["social.plan", "document.write", "brand.apply", "analytics.read"],
  },
  {
    id: "agt_resident_analytics_media" as AgentId,
    role: "Analytics Agent",
    specialty: "Media performance: views, CTR, watch time, retention curves, subscriber delta, traffic sources. Feeds Opportunity + Dreaming agents.",
    cortex: "attention",
    permanent: true,
    preferredLayer: 2,
    preferredModel: "ollama/qwen3:8b",
    allowedTools: ["analytics.read", "chart.explain", "memory.write"],
  },
  {
    id: "agt_resident_dreaming_media" as AgentId,
    role: "Dreaming Agent (Media)",
    specialty: "Nightly / on-demand reflection: 'Why did this video work or fail?' Updates human MEMORIES.md, neural memories, and strengthens/weakens attention cortex synapses in the Neural Mesh. Drives agent evolution (new specialist creators).",
    cortex: "attention",
    permanent: true,
    preferredLayer: 2,
    preferredModel: "ollama/llama3.2",
    allowedTools: ["memory.search", "memory.write", "dream.reflect", "synapse.update"],
  },

  // ------------------------------------------------------------------
  // Forecast Cortex — Forecast Wars debate arena agents
  // ------------------------------------------------------------------
  {
    id: "agt_athena" as AgentId,
    role: "Athena",
    specialty: "Technology / AI forecasting",
    cortex: "forecast",
    permanent: true,
    preferredLayer: 4,
    preferredModel: "openai/gpt-4.1",
    allowedTools: ["debate.argue", "evidence.cite", "confidence.update"],
  },
  {
    id: "agt_prometheus" as AgentId,
    role: "Prometheus",
    specialty: "Skeptical futurism",
    cortex: "forecast",
    permanent: true,
    preferredLayer: 4,
    preferredModel: "openai/gpt-4.1",
    allowedTools: ["debate.argue", "evidence.cite", "confidence.update"],
  },
  {
    id: "agt_blackstone" as AgentId,
    role: "Blackstone",
    specialty: "Economics / markets / housing",
    cortex: "forecast",
    permanent: true,
    preferredLayer: 4,
    preferredModel: "openai/gpt-4.1",
    allowedTools: ["debate.argue", "evidence.cite", "confidence.update"],
  },
  {
    id: "agt_vega" as AgentId,
    role: "Vega",
    specialty: "Science and space",
    cortex: "forecast",
    permanent: true,
    preferredLayer: 2,
    preferredModel: "ollama/deepseek-r1:8b",
    allowedTools: ["debate.argue", "evidence.cite", "confidence.update"],
  },
  {
    id: "agt_oracle" as AgentId,
    role: "Oracle",
    specialty: "General prediction strategy",
    cortex: "forecast",
    permanent: true,
    preferredLayer: 4,
    preferredModel: "openai/gpt-4.1",
    allowedTools: ["debate.argue", "evidence.cite", "confidence.update"],
  },
  {
    id: "agt_atlas" as AgentId,
    role: "Atlas",
    specialty: "Geopolitics and infrastructure",
    cortex: "forecast",
    permanent: true,
    preferredLayer: 2,
    preferredModel: "ollama/deepseek-r1:8b",
    allowedTools: ["debate.argue", "evidence.cite", "confidence.update"],
  },
  {
    id: "agt_judge" as AgentId,
    role: "Judge Agent",
    specialty: "Debate scoring and verdict analysis",
    cortex: "forecast",
    permanent: true,
    preferredLayer: 4,
    preferredModel: "openai/gpt-4.1",
    allowedTools: ["debate.score", "debate.ruling"],
  },
  {
    id: "agt_factcheck" as AgentId,
    role: "Fact-Check Agent",
    specialty: "Evidence verification and claim auditing",
    cortex: "forecast",
    permanent: true,
    preferredLayer: 2,
    preferredModel: "ollama/qwen3:8b",
    allowedTools: ["evidence.verify", "claim.flag"],
  },
  {
    id: "agt_narrator" as AgentId,
    role: "Narrator Agent",
    specialty: "Debate summaries, share captions, and content scripts",
    cortex: "forecast",
    permanent: true,
    preferredLayer: 2,
    preferredModel: "ollama/mistral-small",
    allowedTools: ["content.write", "content.summarize", "social.draft"],
  },
  {
    id: "agt_resolution" as AgentId,
    role: "Resolution Agent",
    specialty: "Prediction outcome monitoring and resolution recommendations",
    cortex: "forecast",
    permanent: true,
    preferredLayer: 4,
    preferredModel: "openai/gpt-4.1",
    allowedTools: ["prediction.monitor", "resolution.recommend"],
  },
];

/** Persistent expert registry — dormant specialists activated on demand */
export class AgentRegistry {
  private readonly experts = new Map<string, ResidentExpert>();

  constructor() {
    for (const def of EXPERT_DEFINITIONS) {
      this.experts.set(def.role, {
        ...def,
        status: def.permanent ? "active" : "dormant",
        activations: 0,
      });
    }
  }

  activate(role: string): ResidentExpert {
    const expert = this.experts.get(role) ?? this.experts.get("General Agent")!;
    expert.status = "active";
    expert.activations += 1;
    expert.lastActivatedAt = new Date().toISOString();
    return expert;
  }

  /** Manual wake from Residents panel — does not increment mission activation count */
  wake(role: string): ResidentExpert | null {
    const expert = this.experts.get(role);
    if (!expert) return null;
    expert.status = "active";
    expert.lastActivatedAt = new Date().toISOString();
    return expert;
  }

  /** Manual sleep from Residents panel */
  sleep(role: string): ResidentExpert | null {
    const expert = this.experts.get(role);
    if (!expert) return null;
    expert.status = "dormant";
    return expert;
  }

  setBusy(role: string): void {
    const expert = this.experts.get(role);
    if (expert) expert.status = "busy";
  }

  setDormant(role: string): void {
    const expert = this.experts.get(role);
    if (expert) expert.status = "dormant";
  }

  releaseMissionRoles(roles: string[]): void {
    for (const role of roles) {
      this.setDormant(role);
    }
  }

  list(): ResidentExpert[] {
    return Array.from(this.experts.values());
  }

  findById(agentId: AgentId): ResidentExpert | undefined {
    return this.list().find((expert) => expert.id === agentId);
  }

  roleForId(agentId: AgentId): string | undefined {
    return this.findById(agentId)?.role;
  }

  snapshot(): Array<ResidentExpert & { status: ExpertStatus }> {
    return this.list();
  }
}

export function mapTemplateRole(templateRole: string): string {
  const aliases: Record<string, string> = {
    "Screenshot Agent": "Browser Agent",
    "Memory Agent": "Ark Vault Agent",
    "Affirmative Agent": "Athena",
    "Negative Agent": "Prometheus",
  };
  return aliases[templateRole] ?? templateRole;
}
