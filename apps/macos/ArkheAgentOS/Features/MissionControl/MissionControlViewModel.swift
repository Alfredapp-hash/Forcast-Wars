import Foundation
import Observation

@Observable
final class MissionControlViewModel {
    var missions: [MissionCardModel] = []
    var agents: [AgentNodeModel] = []
    var eventLog: [EventLogRow] = []
    var streamPaused = false
    var totalCostToday: Double = 0
    var activeAgentCount: Int = 0
    var pendingApprovals: Int = 0

    private let maxLogRows = 500

    func ingest(_ message: EventStreamMessage) {
        guard !streamPaused else { return }

        let event = message.event
        appendLogRow(from: event)

        switch event.eventType {
        case let t where t.hasPrefix("mission."):
            handleMissionEvent(event)
        case let t where t.hasPrefix("agent."):
            handleAgentEvent(event)
        case let t where t.hasPrefix("approval."):
            handleApprovalEvent(event)
        default:
            break
        }

        recomputeRollups()
    }

    func killAll() {
        missions.removeAll()
        agents.removeAll()
        activeAgentCount = 0
    }

    private func handleMissionEvent(_ event: ArkheEvent) {
        let p = event.payload
        let missionId = event.missionId ?? p.title ?? event.id

        switch event.eventType {
        case "mission.created", "mission.started", "mission.planned":
            let card = MissionCardModel(
                id: missionId,
                title: p.title ?? "Untitled Mission",
                status: p.status ?? "active",
                completionPct: p.completionPct ?? 0,
                budgetUsedUsd: p.budgetUsedUsd ?? 0,
                budgetUsd: p.budgetUsd ?? 5,
                agentCount: p.spawnedAgentIds?.count ?? 0,
                pendingApprovals: 0
            )
            if let idx = missions.firstIndex(where: { $0.id == missionId }) {
                missions[idx] = card
            } else {
                missions.append(card)
            }
        case "mission.completed", "mission.failed", "mission.cancelled":
            missions.removeAll { $0.id == missionId }
        default:
            if var existing = missions.first(where: { $0.id == missionId }) {
                if let pct = p.completionPct { existing.completionPct = pct }
                if let used = p.budgetUsedUsd { existing.budgetUsedUsd = used }
                if let idx = missions.firstIndex(where: { $0.id == missionId }) {
                    missions[idx] = existing
                }
            }
        }
    }

    private func handleAgentEvent(_ event: ArkheEvent) {
        let p = event.payload
        let agentId = p.agentId ?? event.agentId ?? event.id

        switch event.eventType {
        case "agent.spawned", "agent.started":
            let node = AgentNodeModel(
                id: agentId,
                role: p.role ?? "Agent",
                status: p.status ?? "running",
                cpuPct: Double.random(in: 4...18),
                costUsd: 0,
                healthScore: p.healthScore ?? 100,
                parentId: event.parentAgentId
            )
            if let idx = agents.firstIndex(where: { $0.id == agentId }) {
                agents[idx] = node
            } else {
                agents.append(node)
            }
        case "agent.terminated", "agent.completed", "agent.failed":
            agents.removeAll { $0.id == agentId }
        default:
            if let idx = agents.firstIndex(where: { $0.id == agentId }) {
                var node = agents[idx]
                if let status = p.status { node.status = status }
                if let health = p.healthScore { node.healthScore = health }
                agents[idx] = node
            }
        }
    }

    private func handleApprovalEvent(_ event: ArkheEvent) {
        if event.eventType == "approval.requested" {
            pendingApprovals += 1
        } else if event.eventType == "approval.granted" || event.eventType == "approval.denied" {
            pendingApprovals = max(0, pendingApprovals - 1)
        }
    }

    private func appendLogRow(from event: ArkheEvent) {
        let summary: String = {
            let p = event.payload
            if let msg = p.message { return msg }
            if let title = p.title { return title }
            if let role = p.role { return role }
            if let tool = p.toolName { return tool }
            if let url = p.url { return url }
            if let summary = p.summary { return summary }
            if let transcript = p.transcript { return transcript }
            return event.eventType
        }()

        let row = EventLogRow(
            id: event.id,
            ts: formatTime(event.ts),
            agent: event.displayAgent,
            eventType: event.eventType,
            summary: summary,
            status: event.payload.error == nil ? "✓" : "✗"
        )

        eventLog.insert(row, at: 0)
        if eventLog.count > maxLogRows {
            eventLog.removeLast()
        }
    }

    private func recomputeRollups() {
        activeAgentCount = agents.filter { $0.status == "running" || $0.status == "spawning" }.count
        totalCostToday = missions.reduce(0) { $0 + $1.budgetUsedUsd }
    }

    private func formatTime(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: iso) else {
            return String(iso.suffix(12))
        }
        let out = DateFormatter()
        out.dateFormat = "HH:mm:ss.SSS"
        return out.string(from: date)
    }
}
