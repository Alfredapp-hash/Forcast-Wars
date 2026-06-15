import SwiftUI

// MARK: - Daily Mission Report — Phase 5
// Self-documentary screen. Every night the system can read this and generate its video script.

struct DailyReportView: View {
    @Environment(AppState.self) private var appState
    @State private var exportedMarkdown: String? = nil
    @State private var showCopied = false

    private var status: OperatingStatusStore { appState.operatingStatus }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                heroSection
                Divider()
                financialsSection
                Divider()
                achievementsSection
                Divider()
                objectiveSection
                Divider()
                exportSection
            }
            .padding(28)
        }
        .background(Color(nsColor: .windowBackgroundColor))
    }

    // MARK: - Hero

    private var heroSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                Text("Day \(status.daysAlive)")
                    .font(.system(size: 52, weight: .black, design: .monospaced))
                    .foregroundStyle(.primary)

                VStack(alignment: .leading, spacing: 2) {
                    Text("ARKHE DAILY REPORT")
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(3)
                        .foregroundStyle(.secondary)
                    Text(Date(), format: .dateTime.weekday(.wide).month(.wide).day().year())
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }

            StatusPillLarge(label: status.statusLabel, profit: status.profitTodayUsd)
        }
    }

    // MARK: - Financials

    private var financialsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("FINANCIALS")
                .font(.system(size: 10, weight: .semibold))
                .tracking(3)
                .foregroundStyle(.secondary)

            HStack(spacing: 20) {
                ReportStatBox(label: "Revenue", value: String(format: "$%.2f", status.revenueTodayUsd), color: .arkheEmerald)
                ReportStatBox(label: "Cost", value: String(format: "$%.2f", status.costTodayUsd), color: .arkheAmber)
                ReportStatBox(
                    label: status.profitTodayUsd >= 0 ? "Profit" : "Deficit",
                    value: String(format: "%@$%.2f", status.profitTodayUsd >= 0 ? "+" : "-", abs(status.profitTodayUsd)),
                    color: status.profitTodayUsd >= 0 ? .arkheEmerald : .arkheRose
                )
            }

            if !status.revenueSources.filter({ $0.amountUsd > 0 }).isEmpty ||
               !status.costSources.filter({ $0.amountUsd > 0 }).isEmpty {
                HStack(alignment: .top, spacing: 20) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Revenue breakdown")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        ForEach(status.revenueSources.filter { $0.amountUsd > 0 }) { s in
                            HStack {
                                Text(s.label).font(.caption).foregroundStyle(.secondary)
                                Spacer()
                                Text(String(format: "$%.2f", s.amountUsd))
                                    .font(.system(size: 12, weight: .semibold, design: .monospaced))
                                    .foregroundStyle(Color.arkheEmerald)
                            }
                        }
                    }
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Cost breakdown")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        ForEach(status.costSources.filter { $0.amountUsd > 0 }) { s in
                            HStack {
                                Text(s.label).font(.caption).foregroundStyle(.secondary)
                                Spacer()
                                Text(String(format: "$%.2f", s.amountUsd))
                                    .font(.system(size: 12, weight: .semibold, design: .monospaced))
                                    .foregroundStyle(Color.arkheAmber)
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Achievements

    private var achievementsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("ACHIEVEMENTS")
                .font(.system(size: 10, weight: .semibold))
                .tracking(3)
                .foregroundStyle(.secondary)

            let achievements = buildAchievements()
            if achievements.isEmpty {
                Text("No achievements recorded yet today.")
                    .font(.subheadline)
                    .foregroundStyle(.tertiary)
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(achievements, id: \.self) { item in
                        HStack(alignment: .top, spacing: 10) {
                            Text("•")
                                .foregroundStyle(Color.arkheViolet)
                                .font(.subheadline)
                            Text(item)
                                .font(.subheadline)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Objective

    private var objectiveSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("CURRENT OBJECTIVE")
                .font(.system(size: 10, weight: .semibold))
                .tracking(3)
                .foregroundStyle(.secondary)

            Text(currentObjective)
                .font(.title3.weight(.semibold))
                .foregroundStyle(.primary)
        }
    }

    // MARK: - Export

    private var exportSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("EXPORT")
                .font(.system(size: 10, weight: .semibold))
                .tracking(3)
                .foregroundStyle(.secondary)

            HStack(spacing: 10) {
                Button {
                    let md = buildMarkdown()
                    NSPasteboard.general.clearContents()
                    NSPasteboard.general.setString(md, forType: .string)
                    showCopied = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) { showCopied = false }
                } label: {
                    Label(showCopied ? "Copied!" : "Copy Markdown", systemImage: showCopied ? "checkmark" : "doc.on.doc")
                }
                .buttonStyle(.bordered)

                Button {
                    saveMarkdownFile()
                } label: {
                    Label("Save Report", systemImage: "square.and.arrow.down")
                }
                .buttonStyle(.bordered)
            }

            if let md = exportedMarkdown {
                ScrollView {
                    Text(md)
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(8)
                }
                .frame(height: 120)
                .background(.quaternary.opacity(0.3))
                .clipShape(RoundedRectangle(cornerRadius: 6))
            }
        }
    }

    // MARK: - Helpers

    private func buildAchievements() -> [String] {
        var items: [String] = []
        if status.tasksCompleted > 0 { items.append("\(status.tasksCompleted) tasks completed") }
        if status.humansAssisted > 0 { items.append("\(status.humansAssisted) humans assisted") }
        if status.activeAgents > 0 { items.append("\(status.activeAgents) agents active") }
        if status.revenueTodayUsd > 0 { items.append(String(format: "$%.2f revenue generated", status.revenueTodayUsd)) }
        return items
    }

    private var currentObjective: String {
        let profit = status.profitTodayUsd
        if profit > 50 { return "Scale — maintain positive trajectory and expand agent capabilities." }
        if profit > 0 { return "Grow — \(String(format: "$%.2f", profit))/day surplus. Increase revenue channels." }
        if profit < 0 { return "Close the gap — deficit of \(String(format: "$%.2f", abs(profit)))/day. Optimize costs and drive revenue." }
        return "Break-even — push toward first profitable day." }

    private func buildMarkdown() -> String {
        let date = Date().formatted(.dateTime.month().day().year())
        return """
        # Arkhe Daily Report — Day \(status.daysAlive)
        *\(date)*

        ## Status: \(status.statusLabel)

        ## Financials
        | | Amount |
        |---|---|
        | Revenue | $\(String(format: "%.2f", status.revenueTodayUsd)) |
        | Cost | $\(String(format: "%.2f", status.costTodayUsd)) |
        | \(status.profitTodayUsd >= 0 ? "Profit" : "Deficit") | \(status.profitTodayUsd >= 0 ? "+" : "")$\(String(format: "%.2f", status.profitTodayUsd)) |

        ## Achievements
        \(buildAchievements().map { "- \($0)" }.joined(separator: "\n"))

        ## Current Objective
        \(currentObjective)
        """
    }

    private func saveMarkdownFile() {
        let md = buildMarkdown()
        exportedMarkdown = md
        let panel = NSSavePanel()
        panel.nameFieldStringValue = "arkhe-day-\(status.daysAlive).md"
        panel.allowedContentTypes = [.plainText]
        if panel.runModal() == .OK, let url = panel.url {
            try? md.write(to: url, atomically: true, encoding: .utf8)
        }
    }
}

// MARK: - Sub-components

private struct ReportStatBox: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(.system(size: 28, weight: .bold, design: .monospaced))
                .foregroundStyle(color)
            Text(label.uppercased())
                .font(.system(size: 9, weight: .semibold))
                .tracking(2)
                .foregroundStyle(.secondary)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.07))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(color.opacity(0.2), lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

private struct StatusPillLarge: View {
    let label: String
    let profit: Double

    private var color: Color {
        if profit > 0.01 { return .arkheEmerald }
        if profit < -0.01 { return .arkheRose }
        return .arkheAzure
    }

    var body: some View {
        Text(label)
            .font(.system(size: 12, weight: .black))
            .tracking(3)
            .padding(.horizontal, 14)
            .padding(.vertical, 5)
            .background(color.opacity(0.12))
            .foregroundStyle(color)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(color.opacity(0.3), lineWidth: 1))
    }
}
