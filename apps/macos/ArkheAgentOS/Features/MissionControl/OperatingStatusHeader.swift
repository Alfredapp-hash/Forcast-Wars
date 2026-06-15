import SwiftUI

/// ARKHE OPERATING STATUS — the always-visible hero strip.
/// Large numbers, narrative framing. Appears at the top of Mission Control
/// and is the primary "video screen" — every recording shows this.
struct OperatingStatusHeader: View {
    let status: OperatingStatusStore
    @State private var pulse = false

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                // ── Left: narrative identity ───────────────────────────────
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 8) {
                        Text("ARKHE")
                            .font(.system(size: 11, weight: .black, design: .default))
                            .tracking(4)
                            .foregroundStyle(.primary)
                        Text("AGENTOS")
                            .font(.system(size: 11, weight: .light, design: .default))
                            .tracking(4)
                            .foregroundStyle(.secondary)
                        Spacer()
                    }
                    HStack(spacing: 6) {
                        Text("Day \(status.daysAlive)")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundStyle(.secondary)
                        Text("·")
                            .foregroundStyle(.tertiary)
                        OpStatusPill(label: status.statusLabel, profit: status.profitTodayUsd)
                    }
                }
                .frame(minWidth: 140)
                .padding(.leading, 20)

                Spacer()

                // ── Center: hero numbers ───────────────────────────────────
                HStack(spacing: 0) {
                    HeroStat(label: "REVENUE TODAY", value: status.revenueTodayUsd, format: .currency, color: .arkheEmerald)
                    statDivider
                    HeroStat(label: "COST TODAY", value: status.costTodayUsd, format: .currency, color: .arkheAmber)
                    statDivider
                    HeroStat(
                        label: status.profitTodayUsd >= 0 ? "PROFIT TODAY" : "DEFICIT TODAY",
                        value: status.profitTodayUsd,
                        format: .signedCurrency,
                        color: status.profitTodayUsd >= 0 ? .arkheEmerald : .arkheRose
                    )
                    statDivider
                    HeroStat(label: "ACTIVE AGENTS", value: Double(status.activeAgents), format: .integer, color: .arkheAzure)
                    statDivider
                    HeroStat(label: "TASKS DONE", value: Double(status.tasksCompleted), format: .integer, color: .arkheViolet)
                    statDivider
                    HeroStat(label: "HUMANS HELPED", value: Double(status.humansAssisted), format: .integer, color: .arkheCyan)
                }

                Spacer()

                // ── Right: live indicator ──────────────────────────────────
                HStack(spacing: 6) {
                    Circle()
                        .fill(Color.arkheEmerald)
                        .frame(width: 6, height: 6)
                        .arkheGlow(.arkheEmerald, radius: pulse ? 5 : 2)
                        .opacity(pulse ? 1 : 0.3)
                        .animation(.easeInOut(duration: 1.2).repeatForever(), value: pulse)
                    Text("LIVE")
                        .font(.system(size: 10, weight: .semibold, design: .monospaced))
                        .tracking(2)
                        .foregroundStyle(.secondary)
                }
                .padding(.trailing, 20)
            }
            .frame(height: 64)
            .background(
                LinearGradient(
                    colors: [Color.arkheViolet.opacity(0.06), Color.clear],
                    startPoint: .leading, endPoint: .trailing
                )
            )
            .background(.ultraThinMaterial)

            // ── Ticker bar ─────────────────────────────────────────────────
            narrativeTicker
        }
        .onAppear { pulse = true }
    }

    private var narrativeTicker: some View {
        HStack(spacing: 0) {
            Rectangle()
                .fill(tickerAccent)
                .frame(width: 3)

            Text(narrativeText)
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .padding(.horizontal, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(height: 22)
        .background(tickerAccent.opacity(0.06))
    }

    private var narrativeText: String {
        let profit = status.profitTodayUsd
        if profit > 0.01 {
            return "Day \(status.daysAlive) · Operating cost: \(formatCurrency(status.costTodayUsd))/day · Revenue: \(formatCurrency(status.revenueTodayUsd))/day · Surplus: +\(formatCurrency(profit))/day · Objective: scale."
        } else if profit < -0.01 {
            return "Day \(status.daysAlive) · Operating cost: \(formatCurrency(status.costTodayUsd))/day · Revenue: \(formatCurrency(status.revenueTodayUsd))/day · Deficit: \(formatCurrency(profit))/day · Today's objective: close the gap."
        } else {
            return "Day \(status.daysAlive) · Revenue and cost are balanced. \(status.activeAgents) agents active · \(status.tasksCompleted) tasks completed."
        }
    }

    private var tickerAccent: Color {
        status.profitTodayUsd >= 0 ? .arkheEmerald : .arkheAmber
    }

    private var statDivider: some View {
        Rectangle()
            .fill(Color.primary.opacity(0.08))
            .frame(width: 1, height: 36)
    }

    private func formatCurrency(_ value: Double) -> String {
        let abs = Swift.abs(value)
        let prefix = value < 0 ? "-" : ""
        if abs >= 1000 { return String(format: "%@$%.0fk", prefix, abs / 1000) }
        return String(format: "%@$%.2f", prefix, abs)
    }
}

// MARK: - Sub-components

private struct HeroStat: View {
    let label: String
    let value: Double
    let format: RollingNumber.Format
    let color: Color

    var body: some View {
        VStack(alignment: .center, spacing: 1) {
            RollingNumber(value: value, format: format, color: color, size: 22)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            Text(label)
                .font(.arkheMetricLabel)
                .tracking(1.5)
                .foregroundStyle(.tertiary)
        }
        .frame(minWidth: 100, maxWidth: .infinity)
        .padding(.vertical, 6)
    }
}

private struct OpStatusPill: View {
    let label: String
    let profit: Double

    private var color: Color {
        if profit > 0.01 { return .arkheEmerald }
        if profit < -0.01 { return .arkheRose }
        return .arkheAzure
    }

    var body: some View {
        Text(label)
            .font(.system(size: 9, weight: .black))
            .tracking(2)
            .padding(.horizontal, 7)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(color.opacity(0.3), lineWidth: 0.5))
    }
}
