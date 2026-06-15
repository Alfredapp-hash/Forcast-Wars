import SwiftUI

// MARK: - Cinematic activity feed — replaces the table-style event log

struct CinematicFeedView: View {
    let rows: [EventLogRow]
    let paused: Bool
    let onTapRow: (EventLogRow) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            feedHeader
            Divider()
            if rows.isEmpty {
                Text("Waiting for events from daemon…")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollViewReader { proxy in
                    ScrollView(.vertical, showsIndicators: false) {
                        LazyVStack(alignment: .leading, spacing: 0) {
                            ForEach(rows.prefix(200)) { row in
                                CinematicRow(row: row, onTap: { onTapRow(row) })
                                    .id(row.id)
                            }
                        }
                    }
                    .onChange(of: rows.first?.id) { _, newId in
                        if !paused, let id = newId {
                            withAnimation(.easeOut(duration: 0.3)) {
                                proxy.scrollTo(id, anchor: .top)
                            }
                        }
                    }
                }
            }
        }
    }

    private var feedHeader: some View {
        HStack(spacing: 8) {
            Text("LIVE ACTIVITY")
                .font(.system(size: 9, weight: .semibold))
                .tracking(2)
                .foregroundStyle(.secondary)
            if paused {
                Text("PAUSED")
                    .font(.system(size: 9, weight: .bold))
                    .tracking(1)
                    .foregroundStyle(.orange)
            }
            Spacer()
            Text("\(rows.count) events")
                .font(.system(size: 9, design: .monospaced))
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }
}

// MARK: - Single row

private struct CinematicRow: View {
    let row: EventLogRow
    let onTap: () -> Void
    @State private var hovered = false

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 8) {
                // Event-type color stripe
                Rectangle()
                    .fill(eventColor.opacity(0.7))
                    .frame(width: 2)

                // Icon
                Image(systemName: eventIcon)
                    .font(.system(size: 9))
                    .foregroundStyle(eventColor)
                    .frame(width: 14)

                // Prose description
                Text(proseDescription)
                    .font(.system(size: 11))
                    .foregroundStyle(Color.primary.opacity(hovered ? 1.0 : 0.85))
                    .lineLimit(1)

                Spacer()

                // Timestamp
                Text(row.ts)
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(.tertiary)
                    .frame(width: 80, alignment: .trailing)

                // Status dot
                Circle()
                    .fill(row.status == "✓" ? Color.arkheEmerald.opacity(0.7) : Color.arkheRose.opacity(0.7))
                    .frame(width: 5, height: 5)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(hovered ? Color.primary.opacity(0.04) : Color.clear)
        }
        .buttonStyle(.plain)
        .onHover { hovered = $0 }
    }

    private var proseDescription: String {
        let agent = row.agent == "system" ? "System" : row.agent.capitalized
        let summary = row.summary.isEmpty ? "" : " · \(row.summary)"

        switch row.eventType {
        case "agent.spawned":   return "\(agent) spawned\(summary)"
        case "agent.started":   return "\(agent) started\(summary)"
        case "agent.completed": return "\(agent) completed task\(summary)"
        case "agent.terminated":return "\(agent) terminated\(summary)"
        case "agent.message":   return "\(agent) sent message\(summary)"
        case "mission.created": return "New mission created\(summary)"
        case "mission.started": return "Mission started\(summary)"
        case "mission.completed": return "Mission completed\(summary)"
        case "mission.failed":  return "Mission failed\(summary)"
        case "model.route.selected": return "\(agent) routed to \(row.summary)"
        case "model.route.completed": return "\(agent) model call completed\(summary)"
        case "approval.requested": return "Approval required\(summary)"
        case "approval.granted": return "Approval granted\(summary)"
        case "approval.denied": return "Approval denied\(summary)"
        case "browser.navigate": return "\(agent) navigating\(summary)"
        case "attention.scan.started": return "Attention scan started"
        case "attention.scan.completed": return "Attention scan completed\(summary)"
        default:
            let clean = row.eventType.replacingOccurrences(of: ".", with: " ")
            return "\(agent) · \(clean)\(summary)"
        }
    }

    private var eventColor: Color {
        let t = row.eventType
        if t.hasPrefix("mission.") { return .arkheAzure }
        if t.hasPrefix("agent.") { return .arkheEmerald }
        if t.hasPrefix("approval.") { return .arkheAmber }
        if t.hasPrefix("model.") { return .arkheViolet }
        if t.hasPrefix("browser.") { return .arkheCyan }
        if t.hasPrefix("attention.") || t.hasPrefix("trend.") { return .arkheAmber }
        return .secondary
    }

    private var eventIcon: String {
        let t = row.eventType
        if t.hasPrefix("mission.") { return "flag.fill" }
        if t.contains("spawn") || t.contains("start") { return "play.fill" }
        if t.contains("complete") { return "checkmark.circle.fill" }
        if t.contains("fail") || t.contains("error") { return "xmark.circle.fill" }
        if t.hasPrefix("approval.") { return "shield.fill" }
        if t.hasPrefix("model.") { return "cpu" }
        if t.hasPrefix("browser.") { return "globe" }
        if t.hasPrefix("attention.") { return "chart.bar.fill" }
        if t == "agent.message" { return "arrow.right.circle" }
        return "circle.fill"
    }
}
