import SwiftUI

@main
struct ArkheAgentOSApp: App {
    @State private var appState = AppState()
    @State private var showCommandPalette = false

    var body: some Scene {
        WindowGroup {
            MainWindowView()
                .environment(appState)
                .frame(minWidth: 1200, minHeight: 800)
                .commandPalette(isPresented: $showCommandPalette, appState: appState)
        }
        .windowStyle(.titleBar)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("New Mission") {
                    appState.selectedTab = .missionControl
                }
                .keyboardShortcut("n", modifiers: [.command])
            }
            CommandGroup(after: .appInfo) {
                Button("Focus Command Bar") {
                    appState.requestCommandBarFocus()
                }
                .keyboardShortcut("l", modifiers: .command)
                Button("Command Palette") {
                    showCommandPalette = true
                }
                .keyboardShortcut("k", modifiers: .command)
            }
            // Attention / AgentOS menu (⌘K remains primary surface for scan/wakes; this provides discoverable top-level access)
            CommandMenu("AgentOS") {
                Button("Scan for Attention Opportunities") {
                    appState.daemonClient.triggerAttentionScan()
                }
                .keyboardShortcut("a", modifiers: [.command, .shift])
                Button("Dream Now") {
                    appState.daemonClient.dreamNow()
                }
                Divider()
                Button("Open Command Palette") {
                    showCommandPalette = true
                }
                .keyboardShortcut("k", modifiers: .command)
                Button("Export Mission Audit") {
                    appState.daemonClient.exportAudit()
                }
            }
            CommandGroup(replacing: .help) {
                Link("Send Feedback", destination: SupportConfig.mailtoURL)
                Link("Report an Issue", destination: SupportConfig.feedbackIssuesURL)
                Link("Privacy Policy", destination: SupportConfig.privacyPolicyURL)
            }
            CommandGroup(after: .windowArrangement) {
                Button("Pop Out Mission Control") {
                    appState.openMissionControlPopout = true
                }
                .keyboardShortcut("m", modifiers: [.command, .shift])
            }
        }

        Window("Mission Control", id: "mission-control-popout") {
            MissionControlPopoutView()
                .environment(appState)
        }
        .defaultSize(width: 1100, height: 750)
        .windowStyle(.titleBar)
    }
}
