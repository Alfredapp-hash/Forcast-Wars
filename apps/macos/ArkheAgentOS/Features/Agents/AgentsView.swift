import SwiftUI

struct AgentsView: View {
    @Environment(AppState.self) private var appState
    let daemonClient: DaemonClient

    @State private var snapshot: RuntimeSnapshot?
    @State private var selectedAgentId: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Agents")
                    .font(.largeTitle.bold())
                Spacer()
                Button("Refresh") { refresh() }
            }
            .padding(.horizontal)

            if let snapshot, snapshot.agents.isEmpty {
                ContentUnavailableView(
                    "No agents running",
                    systemImage: "cpu",
                    description: Text("Agents appear when a mission is active.")
                )
            } else if let snapshot {
                HSplitView {
                    List(snapshot.agents, selection: $selectedAgentId) { agent in
                        HStack {
                            Circle()
                                .fill(statusColor(agent.status))
                                .frame(width: 8, height: 8)
                            VStack(alignment: .leading) {
                                Text(agent.role)
                                    .font(.headline)
                                Text(agent.status)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .tag(agent.id as String?)
                    }
                    .frame(minWidth: 240)

                    if let agent = snapshot.agents.first(where: { $0.id == selectedAgentId }) {
                        agentDetail(agent, workItems: snapshot.workItems)
                    } else {
                        Text("Select an agent")
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }
            } else {
                ProgressView("Loading runtime…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .onAppear { refresh() }
    }

    private func refresh() {
        daemonClient.requestRuntimeSnapshot { snap in
            snapshot = snap
            if selectedAgentId == nil {
                selectedAgentId = snap.agents.first?.id
            }
        }
    }

    private func agentDetail(_ agent: RuntimeAgentRecord, workItems: [RuntimeWorkItemRecord]) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text(agent.role)
                    .font(.title2.bold())
                Group {
                    LabeledContent("Agent ID", value: agent.id)
                    LabeledContent("Status", value: agent.status)
                    LabeledContent("Mission", value: agent.missionId ?? "—")
                    LabeledContent("Spawned", value: String(agent.spawnedAt.prefix(19)))
                    LabeledContent("Updated", value: String(agent.updatedAt.prefix(19)))
                }
                .font(.subheadline)

                if let workItemId = agent.currentWorkItemId {
                    Divider()
                    Text("Current work item")
                        .font(.headline)
                    Text(workItemId)
                        .font(.caption.monospaced())
                }

                let assigned = workItems.filter { $0.assignedAgentId == agent.id }
                if !assigned.isEmpty {
                    Divider()
                    Text("Work queue")
                        .font(.headline)
                    ForEach(assigned) { item in
                        HStack {
                            Text(item.title)
                            Spacer()
                            Text(item.status)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Divider()
                HStack {
                    if let missionId = agent.missionId {
                        Button("Replay mission") {
                            appState.openReplay(missionId: missionId)
                        }
                    }
                    Button("Agent forensics") {
                        appState.openForensicsForAgent(agentId: agent.id, missionId: agent.missionId)
                    }
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "running": return .green
        case "spawning", "idle": return .blue
        case "waiting_approval": return .orange
        default: return .red
        }
    }
}
