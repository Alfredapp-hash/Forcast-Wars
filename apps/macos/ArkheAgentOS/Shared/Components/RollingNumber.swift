import SwiftUI

/// Premium animated number that counts up/down to its target value and
/// briefly glows when it changes. Used for hero stats and financial totals.
struct RollingNumber: View {
    let value: Double
    var format: Format = .currency
    var color: Color = .primary
    var size: CGFloat = 22

    enum Format {
        case currency
        case signedCurrency
        case integer
    }

    @State private var displayed: Double = 0
    @State private var glow = false

    var body: some View {
        Text(formatted(displayed))
            .font(.arkheDisplay(size))
            .foregroundStyle(color)
            .monospacedDigit()
            .contentTransition(.numericText(value: displayed))
            .shadow(color: glow ? color.opacity(0.7) : .clear, radius: glow ? 8 : 0)
            .onAppear { displayed = value }
            .onChange(of: value) { _, newValue in
                withAnimation(.snappy(duration: 0.5)) {
                    displayed = newValue
                }
                triggerGlow()
            }
    }

    private func triggerGlow() {
        withAnimation(.easeOut(duration: 0.15)) { glow = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            withAnimation(.easeIn(duration: 0.6)) { glow = false }
        }
    }

    private func formatted(_ v: Double) -> String {
        switch format {
        case .currency:
            return formatCurrency(v, signed: false)
        case .signedCurrency:
            return formatCurrency(v, signed: true)
        case .integer:
            return "\(Int(v.rounded()))"
        }
    }

    private func formatCurrency(_ value: Double, signed: Bool) -> String {
        let absVal = abs(value)
        let sign = value < 0 ? "-" : (signed ? "+" : "")
        if absVal >= 1000 {
            return String(format: "%@$%.1fk", sign, absVal / 1000)
        }
        return String(format: "%@$%.2f", sign, absVal)
    }
}
