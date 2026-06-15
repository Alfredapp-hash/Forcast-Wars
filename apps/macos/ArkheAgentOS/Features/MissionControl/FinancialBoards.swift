import SwiftUI

// MARK: - Shared section header

struct BoardSectionHeader: View {
    let title: String
    init(_ title: String) { self.title = title }

    var body: some View {
        Text(title)
            .font(.system(size: 9, weight: .semibold))
            .tracking(2)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 4)
    }
}

// MARK: - Revenue Board

struct RevenueBoardView: View {
    let status: OperatingStatusStore

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            BoardSectionHeader("REVENUE SOURCES")

            ForEach(status.revenueSources.filter { $0.amountUsd > 0 }) { source in
                BoardLineItem(label: source.label, value: source.amountUsd, color: .arkheEmerald)
            }

            if status.revenueSources.allSatisfy({ $0.amountUsd == 0 }) {
                Text("No revenue recorded yet")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .padding(.vertical, 2)
            }

            Divider()

            HStack {
                Text("TOTAL")
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
                    .foregroundStyle(.secondary)
                Spacer()
                RollingNumber(value: status.totalRevenue, format: .currency, color: .arkheEmerald, size: 18)
            }
        }
        .padding(ArkheSpace.md)
        .arkheCard(accent: .arkheEmerald)
    }
}

// MARK: - Cost Board

struct CostBoardView: View {
    let status: OperatingStatusStore

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            BoardSectionHeader("COST SOURCES")

            ForEach(status.costSources.filter { $0.amountUsd > 0 }) { source in
                BoardLineItem(label: source.label, value: source.amountUsd, color: .arkheAmber)
            }

            if status.costSources.allSatisfy({ $0.amountUsd == 0 }) {
                Text("No costs recorded yet")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .padding(.vertical, 2)
            }

            Divider()

            HStack {
                Text("TOTAL")
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
                    .foregroundStyle(.secondary)
                Spacer()
                RollingNumber(value: status.totalCost, format: .currency, color: .arkheAmber, size: 18)
            }
        }
        .padding(ArkheSpace.md)
        .arkheCard(accent: .arkheAmber)
    }
}

// MARK: - Shared line item

private struct BoardLineItem: View {
    let label: String
    let value: Double
    let color: Color

    var body: some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            Spacer()
            Text(String(format: "$%.2f", value))
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .foregroundStyle(color.opacity(0.9))
        }
    }
}
