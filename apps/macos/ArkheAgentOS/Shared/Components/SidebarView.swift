import SwiftUI

struct SidebarView: View {
    @Binding var selectedTab: SidebarTab

    var body: some View {
        List(selection: $selectedTab) {
            Section("Command") {
                ForEach(SidebarTab.allCases.filter { $0 != .settings }) { tab in
                    Label(tab.rawValue, systemImage: tab.icon)
                        .tag(tab)
                }
            }
            Section {
                Label(SidebarTab.settings.rawValue, systemImage: SidebarTab.settings.icon)
                    .tag(SidebarTab.settings)
            }
        }
        .listStyle(.sidebar)
        .navigationTitle("Arkhe AgentOS")
        .frame(minWidth: 200)
    }
}
