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
    var daemonMemoryMb: Double = 0
    var lastModelRoute = "No model route yet"
    var workItemsAssigned = 0
    var aiResources: [AIResourceModel] = []
    var dormantExperts: [DormantExpertModel] = []

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
        case let t where t.hasPrefix("model."):
            handleModelEvent(event)
        case let t where t.hasPrefix("telemetry."):
            handleTelemetryEvent(event)
        default:
            break
        }

        recomputeRollups()
    }

    func updateExperts(from snapshot: RuntimeSnapshot) {
        if let resources = snapshot.aiResources, !resources.isEmpty {
            aiResources = resources.map { record in
                AIResourceModel(
                    id: record.agentId,
                    role: record.role,
                    status: record.status,
                    layer: record.layer,
                    model: record.model,
                    provider: record.provider,
                    cpuPct: record.cpuPct,
                    memMb: record.memMb,
                    tokensUsed: record.inputTokens + record.outputTokens,
                    costTodayUsd: record.costTodayUsd,
                    latencyMs: record.latencyMs,
                    confidence: record.confidence
                )
            }
        }

        if let experts = snapshot.experts {
            dormantExperts = experts
                .filter { $0.status == "dormant" }
                .map { expert in
                    DormantExpertModel(
                        id: expert.id,
                        role: expert.role,
                        preferredModel: expert.preferredModel,
                        specialty: expert.specialty
                    )
                }
        }
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
                parentId: event.parentAgentId,
                currentWorkItemId: p.workItemId
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
                if let workItemId = p.workItemId { node.currentWorkItemId = workItemId }
                agents[idx] = node
            }
        }

        if event.eventType == "agent.message", let workItemId = p.workItemId {
            workItemsAssigned += 1
            if let target = p.toAgentId, let idx = agents.firstIndex(where: { $0.id == target }) {
                agents[idx].currentWorkItemId = workItemId
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

    private func handleModelEvent(_ event: ArkheEvent) {
        let p = event.payload
        if let provider = p.provider, let model = p.model {
            lastModelRoute = "L\(p.layer ?? 2) · \(provider) · \(model)"
        }

        if event.eventType == "model.route.completed", let agentId = event.agentId {
            upsertAIResource(from: event)
        }
    }

    private func handleTelemetryEvent(_ event: ArkheEvent) {
        if let mem = event.payload.system?.memUsedMb {
            daemonMemoryMb = mem
        }

        if event.eventType == "telemetry.agent.sample" {
            ingestAgentTelemetry(event)
        }
    }

    private func upsertAIResource(from event: ArkheEvent) {
        guard let agentId = event.agentId else { return }
        let p = event.payload
        let layer = p.layer ?? 2
        let model = AIResourceModel(
            id: agentId,
            role: agents.first(where: { $0.id == agentId })?.role ?? event.displayAgent,
            status: agents.first(where: { $0.id == agentId })?.status ?? "running",
            layer: layer,
            model: p.model ?? "unknown",
            provider: p.provider ?? "mock",
            cpuPct: layer == 1 ? 2 : layer == 4 ? 22 : 35,
            memMb: layer == 1 ? 800 : layer == 2 ? 6200 : 4200,
            tokensUsed: 0,
            costTodayUsd: 0,
            latencyMs: p.latencyMs ?? 0,
            confidence: p.confidence ?? 0
        )
        if let idx = aiResources.firstIndex(where: { $0.id == agentId }) {
            var existing = aiResources[idx]
            existing.model = model.model
            existing.layer = model.layer
            existing.latencyMs = model.latencyMs
            existing.confidence = model.confidence
            aiResources[idx] = existing
        } else {
            aiResources.append(model)
        }
    }

    private func ingestAgentTelemetry(_ event: ArkheEvent) {
        guard let agentsPayload = event.payload.agents else { return }
        for agent in agentsPayload {
            let resource = AIResourceModel(
                id: agent.agentId,
                role: agent.role ?? agent.agentId,
                status: agent.status,
                layer: agent.layer ?? 2,
                model: agent.model ?? "pending",
                provider: agent.provider ?? "local",
                cpuPct: agent.cpuPct,
                memMb: Double(agent.memMb),
                tokensUsed: agent.tokensUsed ?? 0,
                costTodayUsd: agent.costUsd ?? 0,
                latencyMs: agent.latencyMs ?? 0,
                confidence: agent.confidence ?? 0
            )
            if let idx = aiResources.firstIndex(where: { $0.id == agent.agentId }) {
                aiResources[idx] = resource
            } else {
                aiResources.append(resource)
            }
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
            if let reason = p.reason { return reason }
            if let outputPreview = p.outputPreview { return outputPreview }
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
        totalCostToday = aiResources.reduce(0) { $0 + $1.costTodayUsd }
        if totalCostToday == 0 {
            totalCostToday = missions.reduce(0) { $0 + $1.budgetUsedUsd }
        }
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
