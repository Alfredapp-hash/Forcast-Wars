import SwiftUI

struct MissionsView: View {
    @Environment(AppState.self) private var appState
    let daemonClient: DaemonClient
    let history: MissionHistoryStore

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Missions")
                .font(.largeTitle.bold())
                .padding(.horizontal)

            if history.missions.isEmpty {
                ContentUnavailableView(
                    "No missions yet",
                    systemImage: "flag.checkered",
                    description: Text("Launch a mission from Mission Control or the voice bar.")
                )
            } else {
                List(history.missions) { mission in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(mission.title)
                                .font(.headline)
                            HStack(spacing: 12) {
                                StatusPill(status: mission.status)
                                Text("\(mission.agentCount) agents")
                                Text("\(mission.eventCount) events")
                            }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            Text(formatDate(mission.createdAt))
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                        }
                        Spacer()
                        Button("Replay") {
                            appState.openReplay(missionId: mission.id)
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .onAppear { loadHistory() }
    }

    private func loadHistory() {
        daemonClient.searchMemory(query: "mission.") { events in
            let sorted = events.sorted { $0.ts < $1.ts }
            for event in sorted {
                history.ingest(event)
            }
        }
    }

    private func formatDate(_ iso: String) -> String {
        String(iso.prefix(19).replacingOccurrences(of: "T", with: " "))
    }
}

struct StatusPill: View {
    let status: String

    private var color: Color {
        switch status {
        case "completed", "active", "running": return .green
        case "paused": return .orange
        case "failed", "cancelled": return .red
        default: return .secondary
        }
    }

    var body: some View {
        Text(status.uppercased())
            .font(.caption2.bold())
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}
