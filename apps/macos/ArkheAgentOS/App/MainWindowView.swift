import SwiftUI

struct MainWindowView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.openWindow) private var openWindow
    @AppStorage("arkhe.onboardingComplete") private var onboardingComplete = false

    var body: some View {
        @Bindable var appState = appState

        NavigationSplitView {
            SidebarView(
                selectedTab: $appState.selectedTab,
                approvalCount: appState.approvalsStore.pending.count,
                daysAlive: appState.operatingStatus.daysAlive,
                profitToday: appState.operatingStatus.profitTodayUsd
            )
        } detail: {
            ZStack(alignment: .top) {
                ZStack(alignment: .bottom) {
                    tabContent
                        .padding(.bottom, 56)
                    VoiceBar(daemonClient: appState.daemonClient)
                }

                VStack(spacing: 8) {
                    SystemStatusStrip(
                        alerts: appState.systemAlerts,
                        onDismiss: { appState.dismissAlert(id: $0) }
                    )

                    if let first = appState.approvalsStore.pending.first {
                        ApprovalBanner(
                            approval: first,
                            daemonClient: appState.daemonClient,
                            hermesClient: appState.hermesClient
                        )
                    }
                }
                .padding(.top, 8)
            }
        }
        .toolbar {
            ToolbarItem(placement: .automatic) {
                HStack(spacing: 8) {
                    Circle()
                        .fill(appState.daemonConnected ? Color.green : (appState.daemonReconnecting ? Color.orange : Color.red))
                        .frame(width: 8, height: 8)
                    Text(appState.daemonConnected ? "Daemon" : (appState.daemonReconnecting ? "Reconnecting…" : "Starting…"))
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
                daemonConnected: appState.daemonConnected,
                daemonLaunchOutcome: appState.daemonLaunchOutcome,
                complete: { onboardingComplete = true }
            )
        }
        .sheet(item: Binding(
            get: { appState.forensicsContext },
            set: { if $0 == nil { appState.dismissForensics() } }
        )) { context in
            ForensicsView(context: context)
        }
        .onChange(of: appState.openMissionControlPopout) { _, shouldOpen in
            if shouldOpen {
                openWindow(id: "mission-control-popout")
                appState.openMissionControlPopout = false
            }
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
            .environment(appState)
        case .missions:
            MissionsView(
                daemonClient: appState.daemonClient,
                history: appState.missionHistoryStore
            )
        case .agents:
            AgentsView(daemonClient: appState.daemonClient)
                .environment(appState)
        case .residents:
            ResidentsView(daemonClient: appState.daemonClient, store: appState.residentsStore)
                .environment(appState)
        case .browser:
            BrowserArtifactsView()
        case .replay:
            ReplayView(
                daemonClient: appState.daemonClient,
                missionId: appState.replayMissionId,
                focusEventId: appState.replayFocusEventId
            )
            .environment(appState)
        case .memory:
            MemoryView(daemonClient: appState.daemonClient)
                .environment(appState)
        case .observatory:
            ObservatoryView(
                daemonClient: appState.daemonClient,
                missionControl: appState.missionControlViewModel
            )
        case .approvals:
            ApprovalsView(
                daemonClient: appState.daemonClient,
                hermesClient: appState.hermesClient,
                store: appState.approvalsStore
            )
        case .report:
            DailyReportView()
                .environment(appState)
        case .settings:
            SettingsView(daemonClient: appState.daemonClient)
        }
    }
}

// PlaceholderScreen retained only as a last-resort fallback for unimplemented tabs during active development.
// All primary tabs now have real implementations. See docs/PREMIUM_CHECKLIST.md for remaining Premium work.
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
