import SwiftUI

struct ApprovalsView: View {
    let daemonClient: DaemonClient
    @Bindable var store: ApprovalsStore

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Approvals")
                .font(.largeTitle.bold())
                .padding(.horizontal)

            if store.pending.isEmpty {
                ContentUnavailableView(
                    "All clear",
                    systemImage: "checkmark.shield",
                    description: Text("No pending approvals.")
                )
            } else {
                List(store.pending) { approval in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            RiskBadge(riskClass: approval.riskClass)
                            Text(approval.action)
                                .font(.headline)
                        }
                        Text(approval.summary)
                            .foregroundStyle(.secondary)
                        HStack {
                            Button("Deny") {
                                daemonClient.resolveApproval(approvalId: approval.id, granted: false)
                            }
                            .buttonStyle(.bordered)
                            Button("Approve") {
                                daemonClient.resolveApproval(approvalId: approval.id, granted: true)
                            }
                            .buttonStyle(.borderedProminent)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct RiskBadge: View {
    let riskClass: String

    private var color: Color {
        switch riskClass {
        case "green": return .green
        case "yellow": return .yellow
        case "orange": return .orange
        default: return .red
        }
    }

    var body: some View {
        Text(riskClass.uppercased())
            .font(.caption2.bold())
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.2))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}

struct ApprovalBanner: View {
    let approval: PendingApproval
    let daemonClient: DaemonClient

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.shield.fill")
                .foregroundStyle(.orange)
            VStack(alignment: .leading, spacing: 2) {
                Text("Approval required")
                    .font(.headline)
                Text(approval.summary)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button("Deny") {
                daemonClient.resolveApproval(approvalId: approval.id, granted: false)
            }
            Button("Approve") {
                daemonClient.resolveApproval(approvalId: approval.id, granted: true)
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}
