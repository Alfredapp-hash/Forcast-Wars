import SwiftUI

/// Shared DNA hub — helix, controls, gene panel, write-in animation. Used by Mission Control center + Arkhe DNA tab.
struct DNAHubView: View {
    @Environment(AppState.self) private var appState
    let daemonClient: DaemonClient
    @Bindable var store: ResidentsStore
    var aiResources: [AIResourceModel] = []
    var missionAgents: [AgentNodeModel] = []
    var recentEvents: [ArkheEvent] = []
    var compactHeader: Bool = false

    @State private var selectedExpertId: String?
    @State private var showLiveMesh = false
    @State private var rotationY: Double = 0
    @State private var rotationX: Double = 0.55
    @State private var writeInScales: [String: CGFloat] = [:]
    @State private var knownExpertIds: Set<String> = []
    @State private var geneContext: AgentGeneContext?

    private var selectedExpert: ResidentExpertRecord? {
        store.experts.first { $0.id == selectedExpertId }
    }

    var body: some View {
        VStack(spacing: 0) {
            if !compactHeader {
                dnaHeader
                Divider()
            }

            HSplitView {
                VStack(spacing: 6) {
                    dnaToolbar
                    ArkheDNAHelixView(
                        experts: store.experts,
                        synapses: store.synapses,
                        selectedExpertId: $selectedExpertId,
                        showLiveMesh: showLiveMesh,
                        writeInScales: writeInScales,
                        rotationY: $rotationY,
                        rotationX: $rotationX
                    )
                    .frame(minHeight: compactHeader ? 280 : 360)

                    strandLegend
                }
                .frame(minWidth: 400)

                genePanelSide
            }

            if !store.proposedExperts.isEmpty {
                Divider()
                proposedEvolutionBar
            }
        }
        .onAppear {
            refresh()
            knownExpertIds = Set(store.experts.map(\.id))
        }
        .onChange(of: store.experts.map(\.id)) { _, newIds in
            let newSet = Set(newIds)
            let spawned = newSet.subtracting(knownExpertIds)
            for id in spawned {
                triggerWriteIn(for: id)
            }
            knownExpertIds = newSet
        }
        .onChange(of: selectedExpertId) { _, newId in
            loadGeneContext(for: newId)
        }
    }

    @ViewBuilder
    private var genePanelSide: some View {
        if let expert = selectedExpert {
            AgentGeneDetailPanel(
                expert: expert,
                context: geneContext,
                synapses: store.synapses,
                onWakeSleep: {
                    if expert.status == "dormant" {
                        daemonClient.wakeExpert(role: expert.role)
                    } else {
                        daemonClient.sleepExpert(role: expert.role)
                    }
                }
            )
        } else {
            VStack(spacing: 10) {
                Image(systemName: "dna")
                    .font(.system(size: 36))
                    .foregroundStyle(.secondary)
                Text("Arkhe DNA")
                    .font(.headline)
                Text("Rotate the helix. Tap a gene to open the full agent panel — CPU, memories, version history, and collaboration paths.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 16)
            }
            .frame(minWidth: 260, maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private var dnaHeader: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Arkhe DNA")
                    .font(.title2.bold())
                Text("Living strand — navigation & identity")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            dnaToolbar
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }

    private var dnaToolbar: some View {
        HStack(spacing: 10) {
            Toggle("Live Mesh", isOn: $showLiveMesh)
                .toggleStyle(.switch)
                .controlSize(.mini)
            Button("Reset view") {
                rotationY = 0
                rotationX = 0.55
            }
            .controlSize(.small)
            Button("Activity") { appState.selectedTab = .observatory }
                .controlSize(.small)
            Button("Refresh") { refresh() }
                .controlSize(.small)
        }
        .padding(.horizontal, 8)
    }

    private var strandLegend: some View {
        HStack(spacing: 12) {
            Text("Helix · \(store.experts.count) genes")
                .font(.caption2.monospaced())
            Spacer()
            if showLiveMesh {
                Text("Mesh overlay on")
                    .font(.caption2)
                    .foregroundStyle(.cyan)
            }
        }
        .foregroundStyle(.secondary)
        .padding(.horizontal, 10)
        .padding(.bottom, 6)
    }

    private var proposedEvolutionBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Text("Evolution:")
                    .font(.caption.weight(.semibold))
                ForEach(store.proposedExperts) { p in
                    Text("\(p.role)")
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.orange.opacity(0.15))
                        .clipShape(Capsule())
                }
            }
            .padding(8)
        }
    }

    private func refresh() {
        store.refresh(daemonClient: daemonClient)
        store.appleFmAvailable = FoundationModelService.isAvailable || daemonClient.appleFmRegistered
    }

    private func triggerWriteIn(for expertId: String) {
        writeInScales[expertId] = 0.01
        withAnimation(.spring(response: 0.9, dampingFraction: 0.65)) {
            writeInScales[expertId] = 1.0
        }
    }

    private func loadGeneContext(for expertId: String?) {
        guard let expertId, let expert = store.experts.first(where: { $0.id == expertId }) else {
            geneContext = nil
            return
        }

        let ai = aiResources.first { $0.role == expert.role || $0.id == expert.id }
        let agent = missionAgents.first { $0.role == expert.role || $0.id == expert.id }

        let decisions = recentEvents
            .filter { $0.payload.role == expert.role || $0.agentId == expert.id }
            .filter { $0.eventType == "agent.message" || $0.eventType.hasPrefix("model.") }
            .suffix(5)
            .map { e in
                e.payload.message ?? e.payload.summary ?? e.payload.outputPreview ?? e.eventType
            }

        var versionLines: [String] = [
            "v\(max(1, expert.activations)) — \(expert.activations) expressions",
            "Chromosome: \(DNAChromosomeFamily.from(cortex: expert.cortex).rawValue)",
            "Model route: \(expert.preferredModel)",
        ]
        if let proposal = store.proposedExperts.first(where: { $0.role == expert.role }) {
            versionLines.append("Evolution proposed: \(proposal.reason)")
        }

        geneContext = AgentGeneContext(
            aiResource: ai,
            missionAgent: agent,
            memorySnippets: [],
            recentDecisions: Array(decisions),
            versionLines: versionLines,
            isLoadingMemories: true
        )

        daemonClient.searchMemory(query: expert.role) { events in
            let snippets = events
                .filter { $0.payload.role == expert.role || $0.agentId == expert.id }
                .prefix(6)
                .map { e -> String in
                    let summary = e.payload.summary ?? e.payload.message ?? e.payload.title ?? e.eventType
                    return "\(e.eventType): \(summary)"
                }
            Task { @MainActor in
                geneContext = AgentGeneContext(
                    aiResource: ai,
                    missionAgent: agent,
                    memorySnippets: Array(snippets),
                    recentDecisions: Array(decisions),
                    versionLines: versionLines,
                    isLoadingMemories: false
                )
            }
        }
    }
}

struct AgentGeneContext {
    var aiResource: AIResourceModel?
    var missionAgent: AgentNodeModel?
    var memorySnippets: [String]
    var recentDecisions: [String]
    var versionLines: [String]
    var isLoadingMemories: Bool
}
