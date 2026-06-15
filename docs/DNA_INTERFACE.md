# The Arkhe DNA Interface

**Status:** Core product requirement — restored from original UI plan (2026-06-07).

Arkhe must present itself as a **living digital organism**. Its central interface is an evolving DNA strand in which **chromosomes** represent agent families, **genes** represent individual agents, and illuminated connections show active intelligence, collaboration, memory access, and system growth.

This is **not** decorative animation. It is the main navigation system, agent registry, live-status display, and visual representation of Arkhe's evolution.

---

## Three separate visual layers

Do not collapse these into one generic graph.

| Layer | Purpose | Opens from |
|-------|---------|------------|
| **1. Arkhe DNA** | Identity & agent architecture — what Arkhe has become, which agents compose it | Primary dashboard (`Arkhe DNA` tab) |
| **2. Neural Mesh** | Live communication — which agents, memories, tools, and data sources are talking *right now* | Overlay / drill-down from DNA strand |
| **3. Activity Monitor** | Operational performance — CPU, RAM, network, latency, tokens, cost, model usage, process health | Observatory (opened from DNA or sidebar) |

The DNA strand sits at the **center** of the primary experience. Neural Mesh and Activity Monitor are **views opened from it**, not replacements for it.

---

## Visual identity

- **Base strand:** black, white, or dark metallic — the spine of the organism.
- **Chromosomes:** major agent families / domains — recognizable regions on the strand, not an unmanageable node cloud.
- **Genes:** individual agents — glowing segments within a chromosome.
- **Colors:** Arkhe palette per role/family; dormant genes dim; active genes pulse or illuminate.
- **Energy paths:** visible synapse-like connections when agents collaborate (Neural Mesh overlay).
- **Growth:** newly spawned agents **write themselves** into the strand; learning, memory, tools, and evolution make the strand longer and denser over time.

Users do **not** see a list of agents. They see Arkhe's living architecture being assembled in real time.

---

## Terminology (product metaphor)

| Term | Meaning |
|------|---------|
| **Arkhe DNA** | The entire intelligence system |
| **Chromosome** | Major agent family or domain (Executive, Personal, Development, Research, Memory, System, Attention/Media) |
| **Gene** | Individual agent |
| **Base pairs** | Skills, tools, permissions, memory connections |
| **Mutation** | Agent improvement or learned capability |
| **Replication** | Creation of a specialized child agent |
| **Expression** | Activating a dormant agent for a task |
| **Evolution** | Promoted changes that permanently improve an agent |

*Note:* Biologically chromosomes are packaged DNA structures; we preserve intuitive language while organizing UI as **strand → chromosome regions → gene segments**.

---

## Chromosome families (default regions)

| Chromosome | Cortex keys | Examples |
|------------|-------------|----------|
| **Executive** | `core` (planning/orchestration roles) | Director, Mission Planner, Delegation |
| **Personal** | `personal` | Scheduler, Email, Household |
| **Development** | `development` | Coding, Testing, Security, Deployment |
| **Business** | `business` | SEO, Marketing, Sales, Analytics |
| **Research** | `general` | Web research, Legal, Synthesis |
| **Memory** | memory / dreaming roles | Retrieval, Reflection, Dreaming Service |
| **System** | routing, permissions, model selection | Model Router, Permissions, Monitor |
| **Attention** | `attention` | Trend, Content, Video, YouTube, Media Dreaming |

Families form **recognizable regions** on the strand — zoom and pan apply at chromosome and gene levels.

---

## Interaction: click a gene

Expands an **Agent Gene Panel** with:

- Agent name and purpose
- Current status (dormant / active / busy)
- Parent or creator agent
- Model currently in use
- Skills and available tools
- CPU and memory consumption (link to Activity Monitor)
- Token and API usage
- Current task
- Recent decisions
- Confidence level
- Memories accessed
- Agents it is communicating with
- Version and evolutionary history
- Actions: **Express** (wake), **Sleep**, **Forensics**, **Open in Replay**

---

## Navigation model

```
Arkhe DNA (primary)
  ├── Rotate / zoom / expand strand
  ├── Select gene → detail panel
  ├── Toggle "Live Mesh" → Neural Mesh overlay (synapse traffic on top of DNA)
  └── "Activity" → Observatory (performance monitor)
```

Mission Control remains the **mission execution** surface; DNA is the **organism** surface. Both are first-class; DNA is the identity home.

---

## Implementation status

| Capability | Status |
|------------|--------|
| Chromosome-grouped strand canvas | **In progress** — `ArkheDNAStrandCanvas` |
| Gene selection + detail panel | **In progress** — `AgentGeneDetailPanel` |
| Primary `Arkhe DNA` tab (was Residents) | **Shipped** |
| Neural Mesh as overlay (not merged with DNA) | **Partial** — toggle from DNA view |
| Zoom / rotation / evolution animations | **Roadmap** |
| Mission Control DNA-centric layout | **Roadmap** — DNA tab is primary nav for now |

See `docs/UI_UX_SPEC.md` and `docs/PREMIUM_CHECKLIST.md` (Big Swing: DNA Interface).
