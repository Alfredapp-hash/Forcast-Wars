import Foundation
import Observation

@Observable
final class MissionControlViewModel {
    var missions: [MissionCardModel] = []
    var agents: [AgentNodeModel] = []
    var eventLog: [EventLogRow] = []
    var recentEvents: [ArkheEvent] = []
    var streamPaused = false
    var totalCostToday: Double = 0
    var activeAgentCount: Int = 0
    var pendingApprovals: Int = 0
    var daemonMemoryMb: Double = 0
    var lastModelRoute = "No model route yet"
    var workItemsAssigned = 0
    var aiResources: [AIResourceModel] = []
    var dormantExperts: [DormantExpertModel] = []
    var comms: [CommsEntry] = []
    var focusedMissionId: String? = nil   // Premium: focus mode from mission cards

    // Attention Cortex surface (attn-5): dedicated signals for the live strip + scan status driven by events.
    var attentionSignals: [AttentionSignal] = []
    var attentionScanActive = false

    // Forecast Wars — debate arena signals
    var activeDebateMissions: Int = 0
    var contentQueueDepth: Int = 0
    var resolutionQueueDepth: Int = 0
    var lastDebateEvent: String = "No debate activity yet"

    private let maxLogRows = 500
    private let maxComms = 60
    private let maxAttentionSignals = 20
    private let maxMissions = 80
    private let maxAgents = 120

    var focusedAgents: [AgentNodeModel] {
        guard let fid = focusedMissionId else { return agents }
        // Best-effort: agents don't carry missionId in the node model today,
        // so we treat "focused" as "all current" when focused (future: attach mission).
        // For now we just return the list so the canvas can receive a signal.
        return agents
    }

    var focusedComms: [CommsEntry] {
        // When focused we could filter comms by mission, but for visual punch we
        // just return all (the canvas will use the focusedMissionId for future filtering).
        return comms
    }

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
        case let t where t.hasPrefix("synapse.") || t == "agent.message":
            handleCommsEvent(event)
        case let t where t.hasPrefix("attention.") || t.hasPrefix("trend.") || t.hasPrefix("opportunity.") || t.hasPrefix("content.") || t.hasPrefix("video.") || t.hasPrefix("analytics.") || t.hasPrefix("media.dream"):
            handleAttentionEvent(event)
        case let t where t.hasPrefix("debate.") || t == "prediction.created":
            handleDebateEvent(event)
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
        comms.removeAll()
        attentionSignals.removeAll()
        recentEvents.removeAll()
        attentionScanActive = false
        activeAgentCount = 0
        focusedMissionId = nil
    }

    func event(forLogId id: String) -> ArkheEvent? {
        recentEvents.first { $0.id == id }
    }

    func setFocus(missionId: String?) {
        focusedMissionId = missionId
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
            trimMissionsIfNeeded()
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
            trimAgentsIfNeeded()
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

        recentEvents.insert(event, at: 0)
        if recentEvents.count > maxLogRows {
            recentEvents.removeLast()
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

    private func handleCommsEvent(_ event: ArkheEvent) {
        let p = event.payload
        let from = p.fromAgentId ?? event.agentId ?? event.displayAgent
        let to = p.toAgentId ?? "Director"
        let summary = p.message ?? p.reason ?? event.eventType

        let entry = CommsEntry(
            id: event.id,
            ts: formatTime(event.ts),
            from: from,
            to: to,
            summary: summary
        )

        comms.insert(entry, at: 0)
        if comms.count > maxComms {
            comms.removeLast()
        }
    }

    private func handleAttentionEvent(_ event: ArkheEvent) {
        // Surface Attention Cortex activity (trend scans, opportunities, content, video, analytics, media dreams)
        // as first-class entries in the live comms feed so Mission Control shows the "manufactured attention" loop in real time.
        // Also populates dedicated attentionSignals for the ATTENTION CORTEX strip + drives scan status pill.
        let p = event.payload
        let from: String = {
            if event.eventType.hasPrefix("trend.") { return "Trend Intelligence" }
            if event.eventType.hasPrefix("opportunity.") { return "Opportunity" }
            if event.eventType.hasPrefix("content.") { return "Content" }
            if event.eventType.hasPrefix("video.") { return "Video Production" }
            if event.eventType.hasPrefix("analytics.") || event.eventType.hasPrefix("media.") { return "Analytics" }
            if event.eventType.contains("publish") || event.eventType.contains("scheduled") { return "YouTube Agent" }
            if event.eventType.contains("dream") { return "Dreaming (Media)" }
            return "Attention Cortex"
        }()
        let to: String = {
            if event.eventType.contains("opportunity") { return "Filter" }
            if event.eventType.contains("content") || event.eventType.contains("video") { return "Production" }
            if event.eventType.contains("analytics") { return "Performance" }
            if event.eventType.contains("dream") { return "Neural Mesh" }
            if event.eventType.contains("publish") || event.eventType.contains("scheduled") { return "YouTube/X" }
            return "Media Loop"
        }()
        let summary = p.summary ?? p.topic ?? p.title ?? p.message ?? p.reason ?? event.eventType

        let entry = CommsEntry(
            id: event.id,
            ts: formatTime(event.ts),
            from: from,
            to: to,
            summary: summary
        )

        comms.insert(entry, at: 0)
        if comms.count > maxComms {
            comms.removeLast()
        }

        // Dedicated signals for the strip (last 3-5 visible, with opportunityScore or performance numbers as score).
        var effectiveScore: Double? = p.opportunityScore
        var richSummary = summary

        // Enrich analytics / publish events with key metrics for the live strip
        if event.eventType.contains("analytics") {
            if let views = p.views { richSummary = "\(summary) · \(views) views" }
            if let ctr = p.ctr { richSummary += String(format: " · CTR %.1f%%", ctr * 100) }
            if effectiveScore == nil, let retention = p.retentionPct { effectiveScore = retention }
        }
        if event.eventType.contains("publish") || event.eventType.contains("video.published") {
            if let url = p.url { richSummary = "\(summary) → \(url)" }
        }

        let sig = AttentionSignal(
            id: event.id,
            ts: formatTime(event.ts),
            eventType: event.eventType,
            summary: richSummary,
            score: effectiveScore
        )
        attentionSignals.insert(sig, at: 0)
        if attentionSignals.count > maxAttentionSignals {
            attentionSignals.removeLast()
        }

        // Transient scan status driven purely by events (no pending callback needed; events are source of truth).
        if event.eventType == "attention.scan.started" {
            attentionScanActive = true
        } else if event.eventType == "attention.scan.completed" {
            attentionScanActive = false
        }
    }

    private func handleDebateEvent(_ event: ArkheEvent) {
        let p = event.payload
        lastDebateEvent = p.summary ?? p.title ?? event.eventType

        switch event.eventType {
        case "prediction.created", "debate.room_created":
            activeDebateMissions += 1
        case "debate.round_started", "debate.turn_submitted":
            break
        case "debate.round_completed", "debate.resolved":
            activeDebateMissions = max(0, activeDebateMissions - 1)
        case "debate.resolve_request":
            resolutionQueueDepth += 1
        default:
            break
        }

        if event.eventType.contains("content") || event.eventType == "debate.round_completed" {
            contentQueueDepth += 1
        }

        let from = p.agentRole ?? "Hermes"
        let summary = p.summary ?? p.title ?? p.content ?? event.eventType
        let entry = CommsEntry(
            id: event.id,
            ts: formatTime(event.ts),
            from: from,
            to: "Forecast Wars",
            summary: String(summary.prefix(120))
        )
        comms.insert(entry, at: 0)
        if comms.count > maxComms { comms.removeLast() }
    }

    private func trimMissionsIfNeeded() {
        if missions.count > maxMissions {
            missions.removeLast(missions.count - maxMissions)
        }
    }

    private func trimAgentsIfNeeded() {
        if agents.count > maxAgents {
            agents.removeLast(agents.count - maxAgents)
        }
    }
}
