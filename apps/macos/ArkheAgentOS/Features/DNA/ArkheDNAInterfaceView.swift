import SwiftUI

/// Primary Arkhe DNA tab — shared hub with helical strand, full gene panel, write-in animation.
struct ArkheDNAInterfaceView: View {
    @Environment(AppState.self) private var appState
    let daemonClient: DaemonClient
    @Bindable var store: ResidentsStore

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if store.experts.isEmpty {
                EmptyStateView(
                    title: "Arkhe DNA is forming",
                    systemImage: "waveform.path.ecg",
                    description: "Run missions to spawn agents. Each specialist writes itself into the helix as a gene within its chromosome family."
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                DNAHubView(
                    daemonClient: daemonClient,
                    store: store,
                    aiResources: appState.missionControlViewModel.aiResources,
                    missionAgents: appState.missionControlViewModel.agents,
                    recentEvents: appState.missionControlViewModel.recentEvents,
                    compactHeader: false
                )
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear { refresh() }
    }

    private func refresh() {
        store.refresh(daemonClient: daemonClient)
        store.appleFmAvailable = FoundationModelService.isAvailable || daemonClient.appleFmRegistered
    }
}
