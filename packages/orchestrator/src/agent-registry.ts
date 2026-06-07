import type { AgentId } from "@arkhe/contracts";

export type ExpertStatus = "dormant" | "active" | "busy";

export interface ResidentExpert {
  id: AgentId;
  role: string;
  specialty: string;
  preferredLayer: 1 | 2 | 3 | 4;
  preferredModel: string;
  allowedTools: string[];
  status: ExpertStatus;
  activations: number;
  lastActivatedAt?: string;
}

const EXPERT_DEFINITIONS: Array<Omit<ResidentExpert, "status" | "activations" | "lastActivatedAt">> = [
  {
    id: "agt_resident_scheduler" as AgentId,
    role: "Scheduler Agent",
    specialty: "Calendar, reminders, and time-blocking",
    preferredLayer: 1,
    preferredModel: "apple-foundation-local",
    allowedTools: ["calendar.read", "calendar.write", "reminder.create"],
  },
  {
    id: "agt_resident_seo" as AgentId,
    role: "SEO Agent",
    specialty: "Technical SEO audits and content gaps",
    preferredLayer: 2,
    preferredModel: "ollama/qwen3:8b",
    allowedTools: ["search", "analyze.seo", "browser.read"],
  },
  {
    id: "agt_resident_crm" as AgentId,
    role: "CRM Agent",
    specialty: "CRM notes, contact updates, pipeline hygiene",
    preferredLayer: 1,
    preferredModel: "apple-foundation-local",
    allowedTools: ["crm.read", "crm.write", "summarize"],
  },
  {
    id: "agt_resident_research" as AgentId,
    role: "Research Agent",
    specialty: "Multi-step research and competitive intel",
    preferredLayer: 2,
    preferredModel: "ollama/deepseek-r1:8b",
    allowedTools: ["search", "summarize", "extract", "browser.read"],
  },
  {
    id: "agt_resident_coding" as AgentId,
    role: "Coding Agent",
    specialty: "Code generation, refactoring, and review",
    preferredLayer: 4,
    preferredModel: "openai/gpt-4.1",
    allowedTools: ["code.read", "code.write", "code.review"],
  },
  {
    id: "agt_resident_vault" as AgentId,
    role: "Ark Vault Agent",
    specialty: "Personal knowledge vault and memory retrieval",
    preferredLayer: 2,
    preferredModel: "ollama/llama3.2",
    allowedTools: ["memory.search", "memory.retrieve", "memory.write"],
  },
  {
    id: "agt_resident_marketing" as AgentId,
    role: "Marketing Agent",
    specialty: "Brand voice, copy polish, and campaign drafts",
    preferredLayer: 2,
    preferredModel: "ollama/mistral-small",
    allowedTools: ["document.format", "brand.apply", "summarize"],
  },
  {
    id: "agt_resident_browser" as AgentId,
    role: "Browser Agent",
    specialty: "Playwright navigation and evidence capture",
    preferredLayer: 2,
    preferredModel: "ollama/llama3.2",
    allowedTools: ["browser.navigate", "browser.screenshot", "browser.dom"],
  },
  {
    id: "agt_resident_report" as AgentId,
    role: "Report Agent",
    specialty: "Report drafting and publishing",
    preferredLayer: 2,
    preferredModel: "ollama/mistral-small",
    allowedTools: ["document.write", "document.publish", "summarize"],
  },
  {
    id: "agt_resident_general" as AgentId,
    role: "General Agent",
    specialty: "Fallback mission execution",
    preferredLayer: 2,
    preferredModel: "ollama/llama3.2",
    allowedTools: ["search", "summarize"],
  },
];

/** Persistent expert registry — dormant specialists activated on demand */
export class AgentRegistry {
  private readonly experts = new Map<string, ResidentExpert>();

  constructor() {
    for (const def of EXPERT_DEFINITIONS) {
      this.experts.set(def.role, {
        ...def,
        status: "dormant",
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

  snapshot(): Array<ResidentExpert & { status: ExpertStatus }> {
    return this.list();
  }
}

export function mapTemplateRole(templateRole: string): string {
  const aliases: Record<string, string> = {
    "Screenshot Agent": "Browser Agent",
    "Memory Agent": "Ark Vault Agent",
  };
  return aliases[templateRole] ?? templateRole;
}
