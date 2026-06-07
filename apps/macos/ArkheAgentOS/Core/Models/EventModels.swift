import Foundation

struct EventStreamMessage: Codable, Sendable {
    let topic: String
    let event: ArkheEvent
    let emittedAt: String
    let source: String
}

struct ArkheEvent: Codable, Sendable, Identifiable {
    let id: String
    let ts: String
    let schemaVersion: String
    let missionId: String?
    let workspaceId: String?
    let agentId: String?
    let parentAgentId: String?
    let eventType: String
    let payload: EventPayload

    var displayAgent: String {
        agentId ?? parentAgentId ?? "system"
    }
}

struct EventPayload: Codable, Sendable {
    // Mission
    let title: String?
    let status: String?
    let objective: String?
    let budgetUsd: Double?
    let budgetUsedUsd: Double?
    let completionPct: Double?
    let riskScore: Double?
    let spawnedAgentIds: [String]?

    // Agent
    let agentId: String?
    let kind: String?
    let role: String?
    let healthScore: Double?
    let message: String?

    // Tool / browser
    let toolName: String?
    let riskClass: String?
    let url: String?

    // Voice
    let transcript: String?
    let intent: String?

    // Approval
    let summary: String?
    let action: String?

    // Generic
    let error: String?
}

struct MissionCardModel: Identifiable, Sendable {
    let id: String
    var title: String
    var status: String
    var completionPct: Double
    var budgetUsedUsd: Double
    var budgetUsd: Double
    var agentCount: Int
    var pendingApprovals: Int
}

struct AgentNodeModel: Identifiable, Sendable {
    let id: String
    var role: String
    var status: String
    var cpuPct: Double
    var costUsd: Double
    var healthScore: Double
    var parentId: String?
}

struct EventLogRow: Identifiable, Sendable {
    let id: String
    let ts: String
    let agent: String
    let eventType: String
    let summary: String
    let status: String
}
