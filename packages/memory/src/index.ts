import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ArkheEvent, MissionId } from "@arkhe/contracts";

export const MEMORY_VERSION = "0.1.0";

export interface LocalMemoryStoreOptions {
  path: string;
}

export interface MemorySnapshot {
  events: ArkheEvent[];
}

export class LocalMemoryStore {
  private events: ArkheEvent[] = [];

  constructor(private readonly options: LocalMemoryStoreOptions) {}

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.options.path, "utf8");
      const snapshot = JSON.parse(raw) as MemorySnapshot;
      this.events = Array.isArray(snapshot.events) ? snapshot.events : [];
    } catch {
      this.events = [];
    }
  }

  append(event: ArkheEvent): void {
    this.events.push(event);
  }

  search(query: string): ArkheEvent[] {
    const q = query.toLowerCase();
    return this.events.filter((event) => JSON.stringify(event).toLowerCase().includes(q));
  }

  missionEvents(missionId: MissionId): ArkheEvent[] {
    return this.events.filter((event) => event.missionId === missionId);
  }

  allEvents(): ArkheEvent[] {
    return [...this.events];
  }

  async flush(): Promise<void> {
    await mkdir(dirname(this.options.path), { recursive: true });
    await writeFile(this.options.path, JSON.stringify({ events: this.events }, null, 2));
  }
}

export interface HumanMemoryStoreOptions {
  path: string;
}

export interface HumanMemorySection {
  title: string;
  body: string;
}

const DEFAULT_MEMORIES_MD = `# Arkhe Memories

Human-readable memory for Arkhe AgentOS.

Edit this file directly when Arkhe remembers something wrong. The daemon reads and writes it as Layer 1 memory.

## Profile

- User: Unknown
- Preferences: Keep answers concise and action-oriented.

## Long-Term Goals

- Build Arkhe AgentOS as a native macOS AI operating system.

## Working Style

- Prefer local/free models first.
- Escalate to cloud only when needed.

## Recent Reflections

- No reflections yet.

## Corrections

- Add corrections here when Arkhe gets something wrong.
`;

/** L1 memory: an editable, human-readable MEMORIES.md file. */
export class HumanMemoryStore {
  constructor(private readonly options: HumanMemoryStoreOptions) {}

  async ensure(): Promise<void> {
    try {
      await readFile(this.options.path, "utf8");
    } catch {
      await this.write(DEFAULT_MEMORIES_MD);
    }
  }

  async read(): Promise<string> {
    await this.ensure();
    return readFile(this.options.path, "utf8");
  }

  async write(markdown: string): Promise<void> {
    await mkdir(dirname(this.options.path), { recursive: true });
    await writeFile(this.options.path, markdown.endsWith("\n") ? markdown : `${markdown}\n`);
  }

  async appendReflection(reflection: string, now = new Date()): Promise<void> {
    const current = await this.read();
    const stamp = now.toISOString().slice(0, 10);
    const entry = `- ${stamp}: ${reflection}`;
    if (current.includes("## Recent Reflections")) {
      await this.write(current.replace("## Recent Reflections\n", `## Recent Reflections\n\n${entry}\n`));
      return;
    }
    await this.write(`${current.trim()}\n\n## Recent Reflections\n\n${entry}\n`);
  }

  async sections(): Promise<HumanMemorySection[]> {
    const markdown = await this.read();
    const chunks = markdown.split(/^## /gm);
    return chunks
      .slice(1)
      .map((chunk) => {
        const [titleLine, ...body] = chunk.split("\n");
        return {
          title: titleLine.trim(),
          body: body.join("\n").trim(),
        };
      })
      .filter((section) => section.title.length > 0);
  }
}
