import Foundation
import Observation

@Observable
final class AppState {
    var selectedTab: SidebarTab = .missionControl
    var requestNewMission = false
    var daemonConnected = false
    let daemonClient = DaemonClient()

    init() {
        daemonClient.onConnectionChange = { [weak self] connected in
            Task { @MainActor in
                self?.daemonConnected = connected
            }
        }
        daemonClient.connect()
    }
}

enum SidebarTab: String, CaseIterable, Identifiable {
    case missionControl = "Mission Control"
    case missions = "Missions"
    case agents = "Agents"
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
        case .browser: return 4
        case .replay: return 5
        case .memory: return 6
        case .observatory: return 7
        case .approvals: return 8
        default: return nil
        }
    }
}
