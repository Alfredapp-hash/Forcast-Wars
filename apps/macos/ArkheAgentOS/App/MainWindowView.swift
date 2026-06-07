import SwiftUI

struct MainWindowView: View {
    @Environment(AppState.self) private var appState
    @AppStorage("arkhe.onboardingComplete") private var onboardingComplete = false

    var body: some View {
        @Bindable var appState = appState

        NavigationSplitView {
            SidebarView(
                selectedTab: $appState.selectedTab,
                approvalCount: appState.approvalsStore.pending.count
            )
        } detail: {
            ZStack(alignment: .top) {
                ZStack(alignment: .bottom) {
                    tabContent
                    VoiceBar(daemonClient: appState.daemonClient)
                        .padding(.bottom, 12)
                }

                if let first = appState.approvalsStore.pending.first {
                    ApprovalBanner(approval: first, daemonClient: appState.daemonClient)
                        .padding(.top, 12)
                }
            }
        }
        .toolbar {
            ToolbarItem(placement: .automatic) {
                HStack(spacing: 8) {
                    Circle()
                        .fill(appState.daemonConnected ? Color.green : Color.red)
                        .frame(width: 8, height: 8)
                    Text(appState.daemonConnected ? "Daemon" : "Starting…")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .sheet(isPresented: Binding(
            get: { !onboardingComplete },
            set: { if !$0 { onboardingComplete = true } }
        )) {
            OnboardingView(
                daemonClient: appState.daemonClient,
                complete: { onboardingComplete = true }
            )
        }
    }

    @ViewBuilder
    private var tabContent: some View {
        switch appState.selectedTab {
        case .missionControl:
            MissionControlView(
                daemonClient: appState.daemonClient,
                viewModel: appState.missionControlViewModel
            )
        case .missions:
            MissionsView(
                daemonClient: appState.daemonClient,
                history: appState.missionHistoryStore
            )
        case .agents:
            AgentsView(daemonClient: appState.daemonClient)
        case .residents:
            ResidentsView(daemonClient: appState.daemonClient, store: appState.residentsStore)
        case .browser:
            BrowserArtifactsView()
        case .replay:
            ReplayView(
                daemonClient: appState.daemonClient,
                missionId: appState.replayMissionId
            )
        case .memory:
            MemoryView(daemonClient: appState.daemonClient)
        case .observatory:
            ObservatoryView(
                daemonClient: appState.daemonClient,
                missionControl: appState.missionControlViewModel
            )
        case .approvals:
            ApprovalsView(
                daemonClient: appState.daemonClient,
                store: appState.approvalsStore
            )
        case .settings:
            SettingsView(daemonClient: appState.daemonClient)
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
