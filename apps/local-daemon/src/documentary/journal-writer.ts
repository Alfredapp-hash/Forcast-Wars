import type { DocumentaryPipelineRun } from "./documentary-pipeline.js";

export interface JournalEntry {
  title: string;
  series: string;
  markdown: string;
  tags: string[];
  createdAt: string;
}

/**
 * Development journal entry generator — phase 1 stub.
 * Phase 2+: append to ~/.arkhe/journal/ and cross-post to blog.
 */
export function draftJournalEntry(
  run: DocumentaryPipelineRun,
  context: { channelName: string; series: string[] }
): JournalEntry {
  const series =
    context.series[Math.floor(Math.random() * context.series.length)] ?? "What I Learned Today";
  const stageList = run.completedStages.join(" → ") || "none";
  const title = run.ideaTitle ?? `${series}: pipeline ${run.id.slice(0, 8)}`;

  const markdown = [
    `# ${title}`,
    "",
    `**Channel:** ${context.channelName}`,
    `**Series:** ${series}`,
    `**Pipeline run:** ${run.id}`,
    `**Status:** ${run.status}`,
    "",
    "## Summary",
    run.ideaSummary ?? "_No idea selected — shadow run stub._",
    "",
    "## Stages completed",
    stageList,
    "",
    "## Quality",
    run.qualityScore != null
      ? `Score: ${run.qualityScore}/100${run.qualityGatesPassed?.length ? ` — gates: ${run.qualityGatesPassed.join(", ")}` : ""}`
      : "_Not scored in shadow mode._",
    "",
    "## Financial gate",
    run.sustainabilitySummary ?? "_Sustainability not evaluated._",
    "",
    "## Next",
    "- Phase 2: real capture, ffmpeg render, YouTube OAuth upload",
    "- Phase 2: blog cross-post via Publisher Agent",
    "",
    `_Generated ${new Date().toISOString()}_`,
  ].join("\n");

  return {
    title,
    series,
    markdown,
    tags: ["self-documentary", "agentos", series.toLowerCase().replace(/\s+/g, "-")],
    createdAt: new Date().toISOString(),
  };
}
