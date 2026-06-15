import SwiftUI

// MARK: - Hex initialiser

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: alpha)
    }
}

// MARK: - Premium palette
//
// Refined, slightly-desaturated hues — never raw system green/orange/red.
// These names are the canonical tokens. The legacy `arkhe*` aliases below
// keep older call-sites working while inheriting the upgraded values.

extension Color {
    // Brand
    static let arkheEmerald = Color(hex: 0x34D399)   // success / revenue / growth
    static let arkheAmber   = Color(hex: 0xF59E0B)   // warning / cost
    static let arkheRose    = Color(hex: 0xF43F5E)   // error / deficit
    static let arkheAzure   = Color(hex: 0x3B82F6)   // info / model
    static let arkheViolet  = Color(hex: 0x8B5CF6)   // accent / agents
    static let arkheCyan    = Color(hex: 0x22D3EE)   // browser / secondary accent

    // Surfaces (adaptive to appearance via opacity layering)
    static let arkheInk      = Color(hex: 0x0B0F17)  // deepest surface
    static let arkheCharcoal = Color(hex: 0x141A24)  // card surface

    // Legacy aliases — now powered by the refined palette
    static let arkheSuccess = arkheEmerald
    static let arkheWarning = arkheAmber
    static let arkheError   = arkheRose
    static let arkheInfo    = arkheAzure
    static let arkheAccent  = arkheViolet
    static let arkheMuted   = Color.secondary

    static func arkheSeverity(_ severity: SystemAlert.Severity) -> Color {
        switch severity {
        case .info: return .arkheInfo
        case .warning: return .arkheWarning
        case .error: return .arkheError
        }
    }
}

// MARK: - Spacing scale

enum ArkheSpace {
    static let xxs: CGFloat = 2
    static let xs:  CGFloat = 4
    static let sm:  CGFloat = 8
    static let md:  CGFloat = 12
    static let lg:  CGFloat = 20
    static let xl:  CGFloat = 32
}

// MARK: - Corner radii

enum ArkheRadius {
    static let pill: CGFloat = 999
    static let card: CGFloat = 12
    static let inset: CGFloat = 8
    static let tile: CGFloat = 10
}

// MARK: - Shadows

struct ArkheShadow {
    let color: Color
    let radius: CGFloat
    let x: CGFloat
    let y: CGFloat

    static let card = ArkheShadow(color: .black.opacity(0.18), radius: 10, x: 0, y: 3)
    static let subtle = ArkheShadow(color: .black.opacity(0.10), radius: 5, x: 0, y: 1)
    static let floating = ArkheShadow(color: .black.opacity(0.28), radius: 22, x: 0, y: 10)
}

extension View {
    func arkheShadow(_ shadow: ArkheShadow = .card) -> some View {
        self.shadow(color: shadow.color, radius: shadow.radius, x: shadow.x, y: shadow.y)
    }

    /// Premium glow used for active nodes / accent emphasis.
    func arkheGlow(_ color: Color, radius: CGFloat = 8) -> some View {
        self.shadow(color: color.opacity(0.6), radius: radius)
            .shadow(color: color.opacity(0.3), radius: radius * 2)
    }
}

// MARK: - Typography ramp

extension Font {
    /// Big monospaced metric number (hero stats).
    static func arkheDisplay(_ size: CGFloat = 22) -> Font {
        .system(size: size, weight: .bold, design: .monospaced)
    }
    /// Uppercase tracked metric label.
    static let arkheMetricLabel = Font.system(size: 9, weight: .semibold)
    /// Section header.
    static let arkheSection = Font.system(size: 10, weight: .semibold)
}

extension Text {
    /// Standard tracked uppercase label styling.
    func arkheLabelStyle() -> some View {
        self.font(.arkheMetricLabel)
            .tracking(1.5)
            .foregroundStyle(.tertiary)
    }
}

// MARK: - Surfaces

enum ArkheSurface {
    static func bannerBackground(_ color: Color) -> some View {
        color.opacity(0.08)
    }

    static func bannerBorder(_ color: Color) -> some View {
        RoundedRectangle(cornerRadius: ArkheRadius.tile)
            .strokeBorder(color.opacity(0.25), lineWidth: 1)
    }

    /// Premium gradient card fill tinted toward an accent color.
    static func cardGradient(_ accent: Color) -> LinearGradient {
        LinearGradient(
            colors: [accent.opacity(0.10), accent.opacity(0.03)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

// MARK: - Premium card modifier

struct ArkheCard: ViewModifier {
    var accent: Color = .arkheViolet
    var radius: CGFloat = ArkheRadius.card

    func body(content: Content) -> some View {
        content
            .background(ArkheSurface.cardGradient(accent))
            .background(.regularMaterial)
            .overlay(
                RoundedRectangle(cornerRadius: radius)
                    .strokeBorder(accent.opacity(0.18), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: radius))
            .arkheShadow(.subtle)
    }
}

extension View {
    func arkheCard(accent: Color = .arkheViolet, radius: CGFloat = ArkheRadius.card) -> some View {
        modifier(ArkheCard(accent: accent, radius: radius))
    }
}
