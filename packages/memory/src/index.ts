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
