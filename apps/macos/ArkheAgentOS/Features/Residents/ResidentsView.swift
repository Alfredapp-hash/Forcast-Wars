import SwiftUI

struct ResidentsView: View {
    let daemonClient: DaemonClient
    @Bindable var store: ResidentsStore

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Resident Agents")
                        .font(.largeTitle.bold())
                    Text("Persistent specialists — wake to keep warm, sleep to save compute")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button("Refresh") { store.refresh(daemonClient: daemonClient) }
            }
            .padding(.horizontal)

            HStack(spacing: 12) {
                StatusChip(
                    label: "Apple FM",
                    value: store.appleFmAvailable ? "Ready" : "Unavailable",
                    color: store.appleFmAvailable ? .green : .secondary
                )
                StatusChip(
                    label: "Supabase",
                    value: store.supabaseConnected ? "Synced" : store.supabaseEnabled ? "Offline" : "Disabled",
                    color: store.supabaseConnected ? .green : .orange
                )
                StatusChip(
                    label: "Active",
                    value: "\(store.activeCount)",
                    color: .blue
                )
            }
            .padding(.horizontal)

            List(store.experts) { expert in
                ResidentExpertRow(expert: expert) {
                    if expert.status == "dormant" {
                        daemonClient.wakeExpert(role: expert.role)
                    } else {
                        daemonClient.sleepExpert(role: expert.role)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .onAppear {
            store.refresh(daemonClient: daemonClient)
            store.appleFmAvailable = FoundationModelService.isAvailable || daemonClient.appleFmRegistered
            daemonClient.onExpertUpdated = { expert in
                store.applyUpdate(expert)
            }
        }
    }
}

struct ResidentExpertRow: View {
    let expert: ResidentExpertRecord
    let toggle: () -> Void

    private var isActive: Bool {
        expert.status == "active" || expert.status == "busy"
    }

    private var layerLabel: String {
        switch expert.preferredLayer {
        case 1: return "Apple FM"
        case 4: return "Cloud"
        default: return "Ollama"
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(isActive ? Color.green : Color.secondary.opacity(0.4))
                .frame(width: 10, height: 10)
                .padding(.top, 4)

            VStack(alignment: .leading, spacing: 4) {
                Text(expert.role)
                    .font(.headline)
                Text(expert.specialty)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                HStack(spacing: 8) {
                    Text(expert.preferredModel)
                        .font(.caption2.monospaced())
                    Text(layerLabel)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(.quaternary)
                        .clipShape(Capsule())
                    Text("\(expert.activations) missions")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer()

            if isActive {
                Button("Sleep", action: toggle)
                    .buttonStyle(.bordered)
            } else {
                Button("Wake", action: toggle)
                    .buttonStyle(.borderedProminent)
            }
        }
        .padding(.vertical, 6)
    }
}

struct StatusChip: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.bold())
                .foregroundStyle(color)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(.quaternary.opacity(0.4))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

@Observable
final class ResidentsStore {
    var experts: [ResidentExpertRecord] = []
    var appleFmAvailable = false
    var supabaseEnabled = false
    var supabaseConnected = false

    var activeCount: Int {
        experts.filter { $0.status == "active" || $0.status == "busy" }.count
    }

    func refresh(daemonClient: DaemonClient) {
        daemonClient.requestExpertList { list in
            self.experts = list.sorted { $0.role < $1.role }
        }
        daemonClient.requestSupabaseStatus { status in
            self.supabaseEnabled = status.enabled
            self.supabaseConnected = status.connected
        }
    }

    func applyUpdate(_ expert: ResidentExpertRecord) {
        if let idx = experts.firstIndex(where: { $0.id == expert.id }) {
            experts[idx] = expert
        } else {
            experts.append(expert)
        }
    }
}

struct SupabaseStatusModel: Sendable {
    let enabled: Bool
    let connected: Bool
    let agentsSynced: Int
    let memoriesSynced: Int
}
