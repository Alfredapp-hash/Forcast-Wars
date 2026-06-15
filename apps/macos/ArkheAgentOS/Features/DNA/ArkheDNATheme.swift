import SwiftUI

/// Chromosome families on the Arkhe DNA strand — maps registry `cortex` to visual regions.
enum DNAChromosomeFamily: String, CaseIterable, Identifiable {
    case executive = "Executive"
    case personal = "Personal"
    case development = "Development"
    case business = "Business"
    case research = "Research"
    case memory = "Memory"
    case system = "System"
    case attention = "Attention"
    /// Dormant until Financial Governor reports genesis readiness (3 sustainable months + 6-month reserve).
    case genesis = "Genesis"

    var id: String { rawValue }

    var subtitle: String {
        switch self {
        case .executive: return "Planning, orchestration, delegation"
        case .personal: return "Scheduling, communication, household"
        case .development: return "Coding, testing, security, deployment"
        case .business: return "SEO, marketing, sales, analytics"
        case .research: return "Web research, legal, synthesis"
        case .memory: return "Retrieval, reflection, dreaming"
        case .system: return "Monitoring, routing, permissions, models"
        case .attention: return "Trends, content, video, media loop"
        case .genesis: return "Financial independence — unlocks when sustainability gate passes"
        }
    }

    static func from(cortex: String?) -> DNAChromosomeFamily {
        switch (cortex ?? "general").lowercased() {
        case "core": return .executive
        case "personal": return .personal
        case "development": return .development
        case "business": return .business
        case "attention", "media": return .attention
        case "genesis": return .genesis
        case "memory": return .memory
        case "system": return .system
        default: return .research
        }
    }

    func color(for status: String) -> Color {
        let base: Color = {
            switch self {
            case .executive: return Color(red: 0.55, green: 0.45, blue: 1.0)
            case .personal: return Color(red: 0.35, green: 0.78, blue: 0.95)
            case .development: return Color(red: 0.45, green: 0.95, blue: 0.55)
            case .business: return Color(red: 1.0, green: 0.72, blue: 0.35)
            case .research: return Color(red: 0.65, green: 0.75, blue: 1.0)
            case .memory: return Color(red: 0.85, green: 0.55, blue: 0.95)
            case .system: return Color(red: 0.75, green: 0.75, blue: 0.78)
            case .attention: return Color(red: 1.0, green: 0.45, blue: 0.55)
            case .genesis: return Color(red: 0.95, green: 0.82, blue: 0.35)
            }
        }()
        let active = status == "active" || status == "busy"
        return active ? base : base.opacity(0.35)
    }
}
