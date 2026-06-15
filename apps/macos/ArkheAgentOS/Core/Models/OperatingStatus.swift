import Foundation
import Observation

// MARK: - Revenue + Cost line items

struct RevenueSource: Identifiable, Sendable {
    let id: String
    var label: String
    var amountUsd: Double
}

struct CostSource: Identifiable, Sendable {
    let id: String
    var label: String
    var amountUsd: Double
}

// MARK: - Operating status store

@Observable
final class OperatingStatusStore {
    // ── Hero numbers ──────────────────────────────────────────────────────────
    var revenueTodayUsd: Double = 0
    var costTodayUsd: Double = 0
    var runwayDays: Double = 0
    var daysAlive: Int = 0
    var activeAgents: Int = 0
    var tasksCompleted: Int = 0
    var humansAssisted: Int = 0

    // ── Revenue breakdown ─────────────────────────────────────────────────────
    var revenueSources: [RevenueSource] = [
        RevenueSource(id: "clients",       label: "Website Clients",  amountUsd: 0),
        RevenueSource(id: "subscriptions", label: "Subscriptions",    amountUsd: 0),
        RevenueSource(id: "affiliate",     label: "Affiliate",        amountUsd: 0),
        RevenueSource(id: "youtube",       label: "YouTube",          amountUsd: 0),
        RevenueSource(id: "templates",     label: "Templates",        amountUsd: 0),
    ]

    // ── Cost breakdown ────────────────────────────────────────────────────────
    var costSources: [CostSource] = [
        CostSource(id: "openai",     label: "OpenAI",   amountUsd: 0),
        CostSource(id: "anthropic",  label: "Claude",   amountUsd: 0),
        CostSource(id: "ollama",     label: "Ollama",   amountUsd: 0),
        CostSource(id: "hosting",    label: "Hosting",  amountUsd: 0),
        CostSource(id: "storage",    label: "Storage",  amountUsd: 0),
    ]

    // ── Computed ──────────────────────────────────────────────────────────────
    var profitTodayUsd: Double { revenueTodayUsd - costTodayUsd }
    var totalRevenue: Double { revenueSources.reduce(0) { $0 + $1.amountUsd } }
    var totalCost: Double { costSources.reduce(0) { $0 + $1.amountUsd } }

    var statusLabel: String {
        if profitTodayUsd > 1 { return "GROWING" }
        if profitTodayUsd < -0.01 { return "DEFICIT" }
        return "BREAK-EVEN"
    }

    // ── Launch date persisted via UserDefaults ─────────────────────────────────
    private static let launchDateKey = "arkhe.launchDate"

    init() {
        if UserDefaults.standard.object(forKey: Self.launchDateKey) == nil {
            UserDefaults.standard.set(Date(), forKey: Self.launchDateKey)
        }
        recomputeDaysAlive()
    }

    // ── Event ingestion ───────────────────────────────────────────────────────

    func ingest(_ event: ArkheEvent) {
        let p = event.payload

        switch event.eventType {

        case "model.route.completed":
            let cost = p.confidence.map { _ in 0.0 } ?? 0
            addCost(provider: p.provider ?? "openai", amount: estimateModelCost(event))

        case "agent.completed", "mission.completed":
            tasksCompleted += 1
            if event.eventType == "mission.completed" {
                humansAssisted += 1
            }

        case "revenue.recorded":
            if let source = p.toolName ?? p.reason,
               let amount = p.budgetUsd {
                addRevenue(sourceId: source, amount: amount)
            }

        case "cost.recorded":
            if let provider = p.provider,
               let amount = p.budgetUsedUsd {
                addCost(provider: provider, amount: amount)
            }

        case "telemetry.agent.sample":
            if let agents = p.agents {
                let cost = agents.compactMap { $0.costUsd }.reduce(0, +)
                if cost > 0 { addCost(provider: "openai", amount: cost) }
            }

        default:
            break
        }

        recomputeRollups()
    }

    func syncFromViewModel(costToday: Double, agentCount: Int) {
        if costToday > costTodayUsd {
            costTodayUsd = costToday
        }
        activeAgents = agentCount
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private func addRevenue(sourceId: String, amount: Double) {
        if let idx = revenueSources.firstIndex(where: { $0.id == sourceId || sourceId.contains($0.id) }) {
            revenueSources[idx].amountUsd += amount
        } else {
            revenueSources.append(RevenueSource(id: sourceId, label: sourceId.capitalized, amountUsd: amount))
        }
    }

    private func addCost(provider: String, amount: Double) {
        let key = provider.lowercased()
        if let idx = costSources.firstIndex(where: { key.contains($0.id) || $0.id.contains(key) }) {
            costSources[idx].amountUsd += amount
        } else {
            costSources.append(CostSource(id: key, label: provider.capitalized, amountUsd: amount))
        }
    }

    private func recomputeRollups() {
        revenueTodayUsd = totalRevenue
        costTodayUsd = max(costTodayUsd, totalCost)
        recomputeDaysAlive()
    }

    private func recomputeDaysAlive() {
        let launch = UserDefaults.standard.object(forKey: Self.launchDateKey) as? Date ?? Date()
        daysAlive = max(1, Calendar.current.dateComponents([.day], from: launch, to: Date()).day ?? 1)
    }

    private func estimateModelCost(_ event: ArkheEvent) -> Double {
        switch event.payload.provider?.lowercased() {
        case "openai": return 0.002
        case "anthropic": return 0.003
        default: return 0.0
        }
    }
}
