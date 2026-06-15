import SwiftUI

/// Live inter-agent + Attention Cortex communications feed (agent.message + synapse.* + attention.*/trend.* etc).
/// Attention Cortex activity (scans, trends, video publishes, analytics) now appears here so Mission Control visualizes the autonomous media loop.
struct CommsFeedView: View {
    let comms: [CommsEntry]

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("INTER-AGENT COMMS")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 8)

            if comms.isEmpty {
                EmptyStateView(
                    title: "No comms yet",
                    systemImage: "bubble.left.and.bubble.right",
                    description: "Inter-agent messages and synapse activity appear here during missions."
                )
                .padding(.horizontal, 4)
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 3) {
                        ForEach(comms) { entry in
                            HStack(spacing: 6) {
                                Text(entry.ts)
                                    .font(.system(.caption2, design: .monospaced))
                                    .foregroundStyle(.secondary)
                                    .frame(width: 52, alignment: .leading)

                                Text("\(entry.from) → \(entry.to)")
                                    .font(.system(.caption2, design: .monospaced))
                                    .lineLimit(1)

                                Text(entry.summary)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)

                                Spacer()
                            }
                            .padding(.horizontal, 8)
                        }
                    }
                }
                .frame(maxHeight: 110)
            }
        }
        .padding(.vertical, 6)
        .background(.quaternary.opacity(0.25))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}

struct CommsEntry: Identifiable {
    let id: String
    let ts: String
    let from: String
    let to: String
    let summary: String
}