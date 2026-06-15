import SwiftUI

struct ApprovalsView: View {
    let daemonClient: DaemonClient
    let hermesClient: HermesClient
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
                                resolve(approval, granted: false)
                            }
                            .buttonStyle(.bordered)
                            Button("Approve") {
                                resolve(approval, granted: true)
                            }
                            .buttonStyle(.borderedProminent)
                            if approval.source == .hermes {
                                Image(systemName: "arrow.triangle.branch")
                                    .foregroundStyle(.secondary)
                                    .help("Routed via Hermes")
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func resolve(_ approval: PendingApproval, granted: Bool) {
        switch approval.source {
        case .hermes:
            hermesClient.resolveApproval(approvalId: approval.id, granted: granted)
        case .daemon:
            daemonClient.resolveApproval(approvalId: approval.id, granted: granted)
        }
    }
}

struct RiskBadge: View {
    let riskClass: String

    private var color: Color {
        switch riskClass {
        case "green": return .arkheEmerald
        case "yellow": return .arkheAmber
        case "orange": return .arkheAmber
        default: return .arkheRose
        }
    }

    private var icon: String {
        switch riskClass {
        case "green": return "checkmark.shield.fill"
        case "yellow", "orange": return "exclamationmark.triangle.fill"
        default: return "xmark.octagon.fill"
        }
    }

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 9))
            Text(riskClass.uppercased())
                .font(.caption2.bold())
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(color.opacity(0.18))
        .foregroundStyle(color)
        .clipShape(Capsule())
        .overlay(Capsule().strokeBorder(color.opacity(0.3), lineWidth: 0.5))
    }
}

struct ApprovalBanner: View {
    let approval: PendingApproval
    let daemonClient: DaemonClient
    let hermesClient: HermesClient

    var body: some View {
        StatusBanner(
            severity: .warning,
            title: "Approval required",
            message: approval.summary,
            actionTitle: "Approve",
            action: { resolve(granted: true) }
        )
        .overlay(alignment: .trailing) {
            Button("Deny") { resolve(granted: false) }
                .controlSize(.small)
                .padding(.trailing, 36)
        }
        .padding(.horizontal, 12)
    }

    private func resolve(granted: Bool) {
        switch approval.source {
        case .hermes:
            hermesClient.resolveApproval(approvalId: approval.id, granted: granted)
        case .daemon:
            daemonClient.resolveApproval(approvalId: approval.id, granted: granted)
        }
    }
}
