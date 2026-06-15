import SwiftUI
import Charts

struct MissionControlView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.openWindow) private var openWindow
    let daemonClient: DaemonClient
    @Bindable var viewModel: MissionControlViewModel
    @State private var showKillConfirm = false

    var body: some View {
        VStack(spacing: 0) {
            OperatingStatusHeader(status: appState.operatingStatus)
            controlBar
            Divider()
            HSplitView {
                activeMissionsPanel
                    .frame(minWidth: 240, idealWidth: 280)
                dnaCenterPanel
                    .frame(minWidth: 480, idealWidth: 560)
                telemetryPanel
                    .frame(minWidth: 260, idealWidth: 300)
            }
            .frame(maxHeight: .infinity)
            Divider()
            eventStreamPanel
                .frame(height: 220)
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .onAppear {
            appState.residentsStore.refresh(daemonClient: daemonClient)
        }
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

    private var controlBar: some View {
        HStack(spacing: 10) {
            if viewModel.activeDebateMissions > 0 {
                Label("\(viewModel.activeDebateMissions) live debates", systemImage: "swords")
                    .font(.caption2.bold())
                    .padding(.horizontal, 6)
                    .padding(.vertical, 1)
                    .background(Color.cyan.opacity(0.15))
                    .clipShape(Capsule())
                    .foregroundStyle(.cyan)
            }
            if viewModel.contentQueueDepth > 0 {
                Label("\(viewModel.contentQueueDepth) content", systemImage: "doc.text")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            if viewModel.resolutionQueueDepth > 0 {
                Label("\(viewModel.resolutionQueueDepth) resolutions", systemImage: "gavel")
                    .font(.caption2)
                    .foregroundStyle(.orange)
            }
            if viewModel.attentionScanActive {
                Text("ATTN SCAN")
                    .font(.caption2.bold())
                    .padding(.horizontal, 6)
                    .padding(.vertical, 1)
                    .background(Color.blue.opacity(0.15))
                    .clipShape(Capsule())
                    .foregroundStyle(.blue)
            }
            Spacer()
            Button {
                openWindow(id: "mission-control-popout")
            } label: {
                Image(systemName: "rectangle.split.2x1")
            }
            .help("Pop out Mission Control to a separate window")
            Button(viewModel.streamPaused ? "Resume Stream" : "Pause Stream") {
                viewModel.streamPaused.toggle()
            }
            .foregroundStyle(viewModel.streamPaused ? .orange : .secondary)
            Button("Attention Scan") {
                daemonClient.triggerAttentionScan()
            }
            .buttonStyle(.bordered)
            Button("Kill Switch") {
                showKillConfirm = true
            }
            .buttonStyle(.borderedProminent)
            .tint(.red)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
    }

    private var activeMissionsPanel: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("ACTIVE MISSIONS")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 12)

            if viewModel.missions.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    emptyHint("No active missions.\nUse the Director bar at the bottom — type a command and press Send or Enter.")
                }
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(viewModel.missions) { mission in
                            MissionCardView(
                                mission: mission,
                                onPause: {
                                    daemonClient.pauseMission(missionId: mission.id)
                                },
                                isFocused: viewModel.focusedMissionId == mission.id,
                                onFocus: {
                                    viewModel.setFocus(missionId: viewModel.focusedMissionId == mission.id ? nil : mission.id)
                                }
                            )
                        }
                    }
                    .padding(.horizontal, 12)
                }
            }
        }
        .padding(.vertical, 12)
    }

    private var dnaCenterPanel: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("LIVING ORG MAP")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text("· tasks animate in real time")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                Spacer()
                Button("DNA Tab") {
                    appState.selectedTab = .residents
                }
                .controlSize(.small)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)

            LivingOrgMap(
                agents: viewModel.agents,
                recentEvents: viewModel.recentEvents
            )
            .frame(maxHeight: .infinity)

            CommsFeedView(comms: viewModel.focusedComms)
                .frame(height: 88)
                .padding(.horizontal, 12)
                .padding(.bottom, 8)
        }
    }

    private var telemetryPanel: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                RevenueBoardView(status: appState.operatingStatus)
                CostBoardView(status: appState.operatingStatus)

                BoardSectionHeader("SYSTEM")
                MetricTile(label: "Pending Approvals", value: "\(viewModel.pendingApprovals)")
                MetricTile(label: "Daemon Memory", value: String(format: "%.0f MB", viewModel.daemonMemoryMb))
                MetricTile(label: "Last Model Route", value: viewModel.lastModelRoute)

                ThreatsSection(
                    pendingApprovals: viewModel.pendingApprovals,
                    highBudgetMissions: viewModel.missions.filter { $0.budgetUsedUsd / max($0.budgetUsd, 1) > 0.8 }
                )

                AttentionCortexStrip(
                    signals: Array(viewModel.attentionSignals.prefix(5)),
                    scanActive: viewModel.attentionScanActive
                )
            }
            .padding(12)
        }
    }

    private var eventStreamPanel: some View {
        CinematicFeedView(
            rows: viewModel.eventLog,
            paused: viewModel.streamPaused
        ) { row in
            if let event = viewModel.event(forLogId: row.id) {
                appState.presentForensics(
                    focusEvent: event,
                    allEvents: viewModel.recentEvents
                )
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
    var isFocused: Bool = false
    var onFocus: (() -> Void)?   // Premium: tapping the card focuses the hierarchy + comms

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
        .background(isFocused ? Color.accentColor.opacity(0.12) : Color.secondary.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(isFocused ? Color.accentColor : Color.clear, lineWidth: 1.5)
        )
        .onTapGesture {
            onFocus?()
        }
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

/// Dedicated ATTENTION CORTEX live strip (under telemetry or next to Threats).
/// Shows last few signals with nice formatting and opportunityScore badges (green>80, orange>60).
struct AttentionCortexStrip: View {
    let signals: [AttentionSignal]
    let scanActive: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Text("ATTENTION CORTEX")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                if scanActive {
                    Text("SCANNING…")
                        .font(.caption2.bold())
                        .padding(.horizontal, 5)
                        .padding(.vertical, 1)
                        .background(Color.blue.opacity(0.2))
                        .clipShape(Capsule())
                        .foregroundStyle(.blue)
                }
                Spacer()
            }

            if signals.isEmpty {
                Text("No attention signals yet. Use ⌘K → 'Scan for Attention Opportunities' or the header button.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(signals) { sig in
                        HStack(spacing: 6) {
                            Text(sig.eventType.replacingOccurrences(of: "attention.", with: "").replacingOccurrences(of: "analytics.media.", with: "analytics."))
                                .font(.caption2.monospaced())
                                .foregroundStyle(.secondary)
                                .frame(width: 110, alignment: .leading)

                            Text(sig.summary)
                                .font(.caption2)
                                .lineLimit(1)

                            if let sc = sig.score {
                                scoreBadge(for: sc)
                            }
                            Spacer()
                        }
                    }
                }
            }
        }
        .padding(8)
        .background(Color.secondary.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private func scoreBadge(for score: Double) -> some View {
        let color: Color = score > 80 ? .green : (score >= 60 ? .orange : .secondary)
        return Text(String(format: " %0.0f ", score))
            .font(.caption2.bold())
            .foregroundStyle(color)
            .background(color.opacity(0.15))
            .clipShape(Capsule())
    }
}
