import SwiftUI

struct MainWindowView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        @Bindable var appState = appState

        NavigationSplitView {
            SidebarView(selectedTab: $appState.selectedTab)
        } detail: {
            ZStack(alignment: .bottom) {
                tabContent
                VoiceBar(daemonClient: appState.daemonClient)
                    .padding(.bottom, 12)
            }
        }
        .toolbar {
            ToolbarItem(placement: .automatic) {
                HStack(spacing: 8) {
                    Circle()
                        .fill(appState.daemonConnected ? Color.green : Color.red)
                        .frame(width: 8, height: 8)
                    Text(appState.daemonConnected ? "Daemon" : "Offline")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    @ViewBuilder
    private var tabContent: some View {
        switch appState.selectedTab {
        case .missionControl:
            MissionControlView(daemonClient: appState.daemonClient)
        case .missions:
            PlaceholderScreen(title: "Missions", hint: "Mission history will appear here.")
        case .agents:
            PlaceholderScreen(title: "Agents", hint: "Agents appear when missions run.")
        case .browser:
            PlaceholderScreen(title: "Agent Browser", hint: "WKWebView browser coming soon.")
        case .replay:
            PlaceholderScreen(title: "Replay", hint: "Enable recording on your next mission.")
        case .memory:
            PlaceholderScreen(title: "Memory", hint: "Personal Knowledge Vault coming soon.")
        case .observatory:
            PlaceholderScreen(title: "Observatory", hint: "Agent observability dashboards coming soon.")
        case .approvals:
            PlaceholderScreen(title: "Approvals", hint: "All clear — no pending approvals.")
        case .settings:
            PlaceholderScreen(title: "Settings", hint: "Voice, security, and economics settings.")
        }
    }
}

struct PlaceholderScreen: View {
    let title: String
    let hint: String

    var body: some View {
        VStack(spacing: 12) {
            Text(title)
                .font(.largeTitle.bold())
            Text(hint)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(nsColor: .windowBackgroundColor))
    }
}
