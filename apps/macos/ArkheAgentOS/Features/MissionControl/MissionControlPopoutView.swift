import SwiftUI

/// Standalone Mission Control window for multi-monitor setups.
struct MissionControlPopoutView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        MissionControlView(
            daemonClient: appState.daemonClient,
            viewModel: appState.missionControlViewModel
        )
        .environment(appState)
        .frame(minWidth: 1000, minHeight: 700)
    }
}
