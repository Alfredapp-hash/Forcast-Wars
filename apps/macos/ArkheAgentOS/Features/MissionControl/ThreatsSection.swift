import SwiftUI

/// Small but high-signal "Threats & Warnings" block for the Mission Control telemetry panel.
/// Shows pending approvals and any missions running hot on budget.
struct ThreatsSection: View {
    let pendingApprovals: Int
    let highBudgetMissions: [MissionCardModel]

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("THREATS & WARNINGS")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            if pendingApprovals > 0 {
                Label("\(pendingApprovals) approval(s) pending", systemImage: "exclamationmark.shield")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }

            if !highBudgetMissions.isEmpty {
                ForEach(highBudgetMissions) { m in
                    Label("\(m.title) over 80% budget", systemImage: "chart.line.uptrend.xyaxis")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }
            }

            if pendingApprovals == 0 && highBudgetMissions.isEmpty {
                Text("All clear")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(8)
        .background(Color.secondary.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}