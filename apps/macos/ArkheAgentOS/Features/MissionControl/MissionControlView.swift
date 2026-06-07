import SwiftUI
import Charts

struct MissionControlView: View {
    let daemonClient: DaemonClient
    @Bindable var viewModel: MissionControlViewModel
    @State private var showKillConfirm = false

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            HSplitView {
                activeMissionsPanel
                    .frame(minWidth: 240, idealWidth: 280)
                agentHierarchyPanel
                    .frame(minWidth: 360)
                telemetryPanel
                    .frame(minWidth: 260, idealWidth: 300)
            }
            .frame(maxHeight: .infinity)
            Divider()
            eventStreamPanel
                .frame(height: 220)
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .confirmationDialog("Kill all agents?", isPresented: $showKillConfirm) {
            Button("Kill Everything", role: .destructive) {
                daemonClient.sendKillSwitch()
                viewModel.killAll()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This terminates all agents and revokes active browser sessions.")
        }
    }

    private var header: some View {
        HStack {
            Text("MISSION CONTROL")
                .font(.system(.title3, design: .default, weight: .semibold))
            Circle()
                .fill(.green)
                .frame(width: 8, height: 8)
            Text("Live")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Button("Pause Stream") {
                viewModel.streamPaused.toggle()
            }
            Button("Kill Switch") {
                showKillConfirm = true
            }
            .buttonStyle(.borderedProminent)
            .tint(.red)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    private var activeMissionsPanel: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("ACTIVE MISSIONS")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 12)

            if viewModel.missions.isEmpty {
                emptyHint("No active missions.\nSay \"Director, create a mission\".")
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(viewModel.missions) { mission in
                            MissionCardView(mission: mission) {
                                daemonClient.pauseMission(missionId: mission.id)
                            }
                        }
                    }
                    .padding(.horizontal, 12)
                }
            }
        }
        .padding(.vertical, 12)
    }

    private var agentHierarchyPanel: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("AGENT HIERARCHY")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 12)

            if viewModel.agents.isEmpty {
                emptyHint("No agents running.")
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 10)], spacing: 10) {
                        ForEach(viewModel.agents) { agent in
                            AgentNodeView(agent: agent)
                        }
                    }
                    .padding(.horizontal, 12)
                }
            }
        }
        .padding(.vertical, 12)
    }

    private var telemetryPanel: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("TELEMETRY")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            MetricTile(label: "Active Agents", value: "\(viewModel.activeAgentCount)")
            MetricTile(label: "Cost Today", value: String(format: "$%.2f", viewModel.totalCostToday))
            MetricTile(label: "Pending Approvals", value: "\(viewModel.pendingApprovals)")
            MetricTile(label: "Daemon Memory", value: String(format: "%.0f MB", viewModel.daemonMemoryMb))
            MetricTile(label: "Work Items", value: "\(viewModel.workItemsAssigned)")
            MetricTile(label: "Last Model Route", value: viewModel.lastModelRoute)

            if !viewModel.agents.isEmpty {
                Chart(viewModel.agents) { agent in
                    BarMark(
                        x: .value("Agent", agent.role),
                        y: .value("CPU", agent.cpuPct)
                    )
                    .foregroundStyle(by: .value("Agent", agent.role))
                }
                .chartLegend(.hidden)
                .frame(height: 120)
            }

            Spacer()
        }
        .padding(12)
    }

    private var eventStreamPanel: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("EVENT STREAM")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                if viewModel.streamPaused {
                    Text("PAUSED")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.orange)
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 8)

            if viewModel.eventLog.isEmpty {
                emptyHint("Waiting for events from daemon…")
                    .frame(maxWidth: .infinity)
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 2) {
                        ForEach(viewModel.eventLog) { row in
                            EventLogRowView(row: row)
                        }
                    }
                    .padding(.horizontal, 12)
                }
            }
        }
    }

    private func emptyHint(_ text: String) -> some View {
        Text(text)
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding()
    }
}

struct MissionCardView: View {
    let mission: MissionCardModel
    var onPause: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Circle().fill(.green).frame(width: 8, height: 8)
                Text(mission.title).font(.headline)
                Spacer()
                if let onPause {
                    Button("Pause", action: onPause)
                        .buttonStyle(.borderless)
                        .font(.caption)
                }
            }
            ProgressView(value: mission.completionPct, total: 100)
            HStack {
                Text("\(mission.agentCount) agents")
                Spacer()
                Text(String(format: "$%.2f / $%.2f", mission.budgetUsedUsd, mission.budgetUsd))
                    .foregroundStyle(mission.budgetUsedUsd / mission.budgetUsd > 0.8 ? .orange : .secondary)
            }
            .font(.caption)
        }
        .padding(10)
        .background(.quaternary.opacity(0.4))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct AgentNodeView: View {
    let agent: AgentNodeModel

    private var statusColor: Color {
        switch agent.status {
        case "running": return .green
        case "spawning", "idle": return .blue
        case "waiting_approval": return .orange
        default: return .red
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Circle().fill(statusColor).frame(width: 8, height: 8)
                Text(agent.role).font(.subheadline.weight(.semibold))
            }
            Text("\(agent.status) · \(Int(agent.cpuPct))% CPU")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(String(format: "$%.2f · %.0f health", agent.costUsd, agent.healthScore))
                .font(.caption2)
                .foregroundStyle(.secondary)
            if let workItemId = agent.currentWorkItemId {
                Text("work · \(workItemId)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.quaternary.opacity(0.35))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct MetricTile: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.system(.title3, design: .monospaced, weight: .medium))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(8)
        .background(.quaternary.opacity(0.3))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}

struct EventLogRowView: View {
    let row: EventLogRow

    var body: some View {
        HStack(spacing: 8) {
            Text(row.ts)
                .font(.system(.caption, design: .monospaced))
                .foregroundStyle(.secondary)
                .frame(width: 90, alignment: .leading)
            Text(row.agent)
                .font(.system(.caption, design: .monospaced))
                .frame(width: 120, alignment: .leading)
            Text(row.eventType)
                .font(.system(.caption, design: .monospaced))
                .frame(width: 160, alignment: .leading)
            Text(row.summary)
                .font(.system(.caption, design: .monospaced))
                .lineLimit(1)
            Spacer()
            Text(row.status)
                .font(.caption)
        }
    }
}
