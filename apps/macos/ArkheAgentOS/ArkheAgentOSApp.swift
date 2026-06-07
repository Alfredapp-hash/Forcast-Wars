import SwiftUI

@main
struct ArkheAgentOSApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            MainWindowView()
                .environment(appState)
                .frame(minWidth: 1200, minHeight: 800)
        }
        .windowStyle(.titleBar)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("New Mission") {
                    appState.selectedTab = .missionControl
                }
                .keyboardShortcut("n", modifiers: [.command])
            }
        }
    }
}
