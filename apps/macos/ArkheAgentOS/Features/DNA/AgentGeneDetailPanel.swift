import SwiftUI

/// Full gene detail panel — status, performance, memories, decisions, version history.
struct AgentGeneDetailPanel: View {
    @Environment(AppState.self) private var appState
    let expert: ResidentExpertRecord
    var context: AgentGeneContext?
    let synapses: [AgentSynapseRecord]
    let onWakeSleep: () -> Void

    private var family: DNAChromosomeFamily {
        DNAChromosomeFamily.from(cortex: expert.cortex)
    }

    private var collaborators: [String] {
        synapses
            .filter { $0.sourceAgentId == expert.id || $0.targetAgentId == expert.id }
            .prefix(8)
            .map { $0.sourceAgentId == expert.id ? $0.targetRole : $0.sourceRole }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                header

                GroupBox("Identity") {
                    LabeledContent("Chromosome", value: family.rawValue)
                    LabeledContent("Purpose", value: expert.specialty)
                    LabeledContent("State", value: expert.status.capitalized)
                    if expert.permanent == true {
                        LabeledContent("Resident", value: "Permanent gene")
                    }
                }

                GroupBox("Model & routing") {
                    LabeledContent("Preferred model", value: expert.preferredModel)
                    LabeledContent("Layer", value: "L\(expert.preferredLayer)")
                    if let ai = context?.aiResource {
                        LabeledContent("Live model", value: "\(ai.provider) · \(ai.model)")
                        LabeledContent("Confidence", value: String(format: "%.0f%%", ai.confidence * 100))
                    }
                }

                if let ai = context?.aiResource {
                    GroupBox("Performance (Activity Monitor)") {
                        LabeledContent("CPU", value: String(format: "%.1f%%", ai.cpuPct))
                        LabeledContent("Memory", value: String(format: "%.0f MB", ai.memMb))
                        LabeledContent("Tokens", value: "\(ai.tokensUsed)")
                        LabeledContent("Cost today", value: String(format: "$%.3f", ai.costTodayUsd))
                        LabeledContent("Latency", value: "\(ai.latencyMs) ms")
                    }
                } else if let agent = context?.missionAgent {
                    GroupBox("Current mission task") {
                        LabeledContent("Status", value: agent.status)
                        LabeledContent("CPU", value: String(format: "%.0f%%", agent.cpuPct))
                        LabeledContent("Health", value: String(format: "%.0f", agent.healthScore))
                        if let work = agent.currentWorkItemId {
                            LabeledContent("Work item", value: work)
                        }
                    }
                }

                if !collaborators.isEmpty {
                    GroupBox("Communicating with") {
                        ForEach(collaborators, id: \.self) { role in
                            Text("· \(role)").font(.caption)
                        }
                    }
                }

                GroupBox("Recent decisions") {
                    if let decisions = context?.recentDecisions, !decisions.isEmpty {
                        ForEach(decisions, id: \.self) { line in
                            Text(line)
                                .font(.caption)
                                .lineLimit(2)
                        }
                    } else {
                        Text("No recent model or message events for this gene.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                GroupBox("Memories accessed") {
                    if context?.isLoadingMemories == true {
                        ProgressView().controlSize(.small)
                    } else if let mems = context?.memorySnippets, !mems.isEmpty {
                        ForEach(mems, id: \.self) { snippet in
                            Text(snippet)
                                .font(.caption2)
                                .lineLimit(2)
                        }
                    } else {
                        Text("No matching memory events yet.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                GroupBox("Version & evolution") {
                    ForEach(context?.versionLines ?? defaultVersionLines, id: \.self) { line in
                        Text(line).font(.caption.monospaced())
                    }
                }

                HStack {
                    Button(expert.status == "dormant" ? "Express" : "Sleep", action: onWakeSleep)
                        .buttonStyle(.borderedProminent)
                    Button("Forensics") {
                        appState.openForensicsForAgent(agentId: expert.id, missionId: nil)
                    }
                    Button("Open DNA tab") {
                        appState.selectedTab = .residents
                    }
                }
            }
            .padding(12)
        }
        .frame(minWidth: 280, idealWidth: 300)
    }

    private var header: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(family.color(for: expert.status))
                .frame(width: 14, height: 14)
            VStack(alignment: .leading, spacing: 2) {
                Text(expert.role)
                    .font(.title3.bold())
                Text("Gene · \(family.rawValue) chromosome")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var defaultVersionLines: [String] {
        ["v\(max(1, expert.activations)) — \(expert.activations) expressions"]
    }
}
