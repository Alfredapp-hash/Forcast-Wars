import SwiftUI

struct SidebarView: View {
    @Binding var selectedTab: SidebarTab
    var approvalCount: Int = 0
    var daysAlive: Int = 0
    var profitToday: Double = 0

    var body: some View {
        VStack(spacing: 0) {
            brandHeader

            ScrollView {
                VStack(spacing: ArkheSpace.xxs) {
                    sectionLabel("COMMAND")
                    ForEach(SidebarTab.allCases.filter { $0 != .settings }) { tab in
                        SidebarRow(
                            tab: tab,
                            isSelected: selectedTab == tab,
                            badge: tab == .approvals && approvalCount > 0 ? approvalCount : nil,
                            action: { selectedTab = tab }
                        )
                    }

                    sectionLabel("SYSTEM")
                    SidebarRow(
                        tab: .settings,
                        isSelected: selectedTab == .settings,
                        badge: nil,
                        action: { selectedTab = .settings }
                    )
                }
                .padding(.horizontal, ArkheSpace.sm)
                .padding(.top, ArkheSpace.xs)
            }

            statusFooter
        }
        .frame(minWidth: 216)
        .background(.regularMaterial)
    }

    // MARK: - Brand header

    private var brandHeader: some View {
        HStack(spacing: ArkheSpace.sm) {
            ZStack {
                RoundedRectangle(cornerRadius: ArkheRadius.inset)
                    .fill(ArkheSurface.cardGradient(.arkheViolet))
                    .frame(width: 28, height: 28)
                    .overlay(RoundedRectangle(cornerRadius: ArkheRadius.inset).strokeBorder(Color.arkheViolet.opacity(0.4), lineWidth: 1))
                Image(systemName: "hexagon.fill")
                    .font(.system(size: 13))
                    .foregroundStyle(Color.arkheViolet)
            }
            VStack(alignment: .leading, spacing: 0) {
                Text("ARKHE")
                    .font(.system(size: 13, weight: .black))
                    .tracking(2)
                Text("AGENTOS")
                    .font(.system(size: 8, weight: .medium))
                    .tracking(3)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(.horizontal, ArkheSpace.md)
        .padding(.vertical, ArkheSpace.md)
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 9, weight: .semibold))
            .tracking(2)
            .foregroundStyle(.tertiary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, ArkheSpace.sm)
            .padding(.top, ArkheSpace.md)
            .padding(.bottom, ArkheSpace.xxs)
    }

    // MARK: - Status footer

    private var statusFooter: some View {
        VStack(spacing: ArkheSpace.xs) {
            Divider()
            HStack {
                VStack(alignment: .leading, spacing: 1) {
                    Text("DAY \(daysAlive)")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                    Text(profitToday >= 0 ? "Surplus" : "Deficit")
                        .font(.system(size: 8, weight: .medium))
                        .tracking(1)
                        .foregroundStyle(.tertiary)
                }
                Spacer()
                Text(String(format: "%@$%.2f", profitToday >= 0 ? "+" : "-", abs(profitToday)))
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .foregroundStyle(profitToday >= 0 ? Color.arkheEmerald : Color.arkheRose)
            }
            .padding(.horizontal, ArkheSpace.md)
            .padding(.bottom, ArkheSpace.sm)
        }
    }
}

// MARK: - Row

private struct SidebarRow: View {
    let tab: SidebarTab
    let isSelected: Bool
    let badge: Int?
    let action: () -> Void

    @State private var hovered = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: ArkheSpace.sm) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(isSelected ? Color.arkheViolet : .clear)
                    .frame(width: 3, height: 16)

                Image(systemName: tab.icon)
                    .font(.system(size: 13))
                    .foregroundStyle(isSelected ? Color.arkheViolet : .secondary)
                    .frame(width: 20)

                Text(tab.rawValue)
                    .font(.system(size: 13, weight: isSelected ? .semibold : .regular))
                    .foregroundStyle(isSelected ? .primary : .secondary)

                Spacer()

                if let badge {
                    Text("\(badge)")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 1)
                        .background(Color.arkheAmber)
                        .clipShape(Capsule())
                }
            }
            .padding(.vertical, 6)
            .padding(.trailing, ArkheSpace.sm)
            .background(
                RoundedRectangle(cornerRadius: ArkheRadius.inset)
                    .fill(isSelected ? Color.arkheViolet.opacity(0.12)
                          : (hovered ? Color.primary.opacity(0.05) : .clear))
            )
        }
        .buttonStyle(.plain)
        .onHover { hovered = $0 }
    }
}
