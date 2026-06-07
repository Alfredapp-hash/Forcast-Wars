import SwiftUI

struct SidebarView: View {
    @Binding var selectedTab: SidebarTab
    var approvalCount: Int = 0

    var body: some View {
        List(selection: $selectedTab) {
            Section("Command") {
                ForEach(SidebarTab.allCases.filter { $0 != .settings }) { tab in
                    HStack {
                        Label(tab.rawValue, systemImage: tab.icon)
                        if tab == .approvals && approvalCount > 0 {
                            Spacer()
                            Text("\(approvalCount)")
                                .font(.caption2.bold())
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(.orange.opacity(0.25))
                                .clipShape(Capsule())
                        }
                    }
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
