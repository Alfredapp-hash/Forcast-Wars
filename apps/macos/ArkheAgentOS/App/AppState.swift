import Foundation
import Observation

@Observable
final class AppState {
    var selectedTab: SidebarTab = .missionControl
    var replayMissionId: String?
    var daemonConnected = false

    let daemonClient = DaemonClient()
    let approvalsStore = ApprovalsStore()
    let missionHistoryStore = MissionHistoryStore()
    let missionControlViewModel = MissionControlViewModel()
    let residentsStore = ResidentsStore()

    private let daemonLauncher = DaemonLauncher()

    init() {
        daemonLauncher.ensureRunning()

        daemonClient.onConnectionChange = { [weak self] connected in
            Task { @MainActor in
                self?.daemonConnected = connected
            }
        }

        daemonClient.onEvent = { [weak self] message in
            Task { @MainActor in
                guard let self else { return }
                self.approvalsStore.ingest(message.event)
                self.missionHistoryStore.ingest(message.event)
                self.missionControlViewModel.ingest(message)
            }
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.daemonClient.connect()
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.loadMissionHistory()
            self.residentsStore.refresh(daemonClient: self.daemonClient)
        }
    }

    func openReplay(missionId: String) {
        replayMissionId = missionId
        selectedTab = .replay
    }

    private func loadMissionHistory() {
        daemonClient.searchMemory(query: "mission.") { events in
            let sorted = events.sorted { $0.ts < $1.ts }
            for event in sorted {
                self.missionHistoryStore.ingest(event)
            }
        }
    }
}

enum SidebarTab: String, CaseIterable, Identifiable {
    case missionControl = "Mission Control"
    case missions = "Missions"
    case agents = "Agents"
    case residents = "Residents"
    case browser = "Browser"
    case replay = "Replay"
    case memory = "Memory"
    case observatory = "Observatory"
    case approvals = "Approvals"
    case settings = "Settings"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .missionControl: return "gauge.with.dots.needle.67percent"
        case .missions: return "flag.checkered"
        case .agents: return "cpu"
        case .residents: return "person.3.fill"
        case .browser: return "globe"
        case .replay: return "play.rectangle.on.rectangle"
        case .memory: return "brain"
        case .observatory: return "chart.xyaxis.line"
        case .approvals: return "checkmark.shield"
        case .settings: return "gearshape"
        }
    }

    var shortcut: Int? {
        switch self {
        case .missionControl: return 1
        case .missions: return 2
        case .agents: return 3
        case .residents: return 4
        case .browser: return 5
        case .replay: return 6
        case .memory: return 7
        case .observatory: return 8
        case .approvals: return 9
        default: return nil
        }
    }
}
