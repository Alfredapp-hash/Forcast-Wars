import Foundation

struct HealthStatus: Codable, Sendable {
    let status: String
    let daemon: String
    let ipc: String
    let eventBus: String
    let modelRouter: String
    let uptimeSeconds: Int
    let eventsSeen: Int
    let clientsConnected: Int
}

struct RuntimeAgentRecord: Codable, Sendable, Identifiable {
    let id: String
    let missionId: String?
    let role: String
    let status: String
    let parentAgentId: String?
    let currentWorkItemId: String?
    let spawnedAt: String
    let updatedAt: String
}

struct RuntimeWorkItemRecord: Codable, Sendable, Identifiable {
    let id: String
    let missionId: String?
    let assignedAgentId: String?
    let title: String
    let status: String
    let createdAt: String
}

struct RuntimeSnapshot: Codable, Sendable {
    let agents: [RuntimeAgentRecord]
    let workItems: [RuntimeWorkItemRecord]
    let experts: [ResidentExpertRecord]?
    let aiResources: [AIResourceRecord]?
}

struct ResidentExpertRecord: Codable, Sendable, Identifiable {
    let id: String
    let role: String
    let specialty: String
    let preferredLayer: Int
    let preferredModel: String
    let status: String
    let activations: Int
}

struct AIResourceRecord: Codable, Sendable, Identifiable {
    let agentId: String
    let role: String
    let status: String
    let layer: Int
    let provider: String
    let model: String
    let cpuPct: Double
    let memMb: Double
    let inputTokens: Int
    let outputTokens: Int
    let costUsd: Double
    let costTodayUsd: Double
    let latencyMs: Int
    let confidence: Double
    let networkKbps: Double

    var id: String { agentId }
}

struct AIResourceModel: Identifiable, Sendable {
    let id: String
    var role: String
    var status: String
    var layer: Int
    var model: String
    var provider: String
    var cpuPct: Double
    var memMb: Double
    var tokensUsed: Int
    var costTodayUsd: Double
    var latencyMs: Int
    var confidence: Double
}

struct DormantExpertModel: Identifiable, Sendable {
    let id: String
    let role: String
    let preferredModel: String
    let specialty: String
}

struct VaultMemoryRecord: Codable, Sendable, Identifiable {
    let id: String
    let agentId: String
    let missionId: String?
    let memoryType: String
    let content: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case agentId = "agent_id"
        case missionId = "mission_id"
        case memoryType = "memory_type"
        case content
        case createdAt = "created_at"
    }
}

struct RuntimeSettingsModel: Codable, Sendable {
    let defaultBudgetUsd: Double
    let paidCloudEnabled: Bool
    let maxMissionBudgetUsd: Double
}

struct MissionHistoryEntry: Identifiable, Sendable {
    let id: String
    var title: String
    var status: String
    var createdAt: String
    var completedAt: String?
    var agentCount: Int
    var eventCount: Int
}

@Observable
final class MissionHistoryStore {
    var missions: [MissionHistoryEntry] = []

    func ingest(_ event: ArkheEvent) {
        guard let missionId = event.missionId else { return }

        switch event.eventType {
        case "mission.created", "mission.planned", "mission.started":
            let title = event.payload.title ?? "Mission"
            if let idx = missions.firstIndex(where: { $0.id == missionId }) {
                missions[idx].title = title
                missions[idx].status = event.payload.status ?? missions[idx].status
                missions[idx].eventCount += 1
            } else {
                missions.insert(
                    MissionHistoryEntry(
                        id: missionId,
                        title: title,
                        status: event.payload.status ?? "active",
                        createdAt: event.ts,
                        completedAt: nil,
                        agentCount: event.payload.spawnedAgentIds?.count ?? 0,
                        eventCount: 1
                    ),
                    at: 0
                )
            }
        case "agent.spawned":
            if let idx = missions.firstIndex(where: { $0.id == missionId }) {
                missions[idx].agentCount += 1
                missions[idx].eventCount += 1
            }
        case "mission.completed", "mission.failed", "mission.cancelled":
            if let idx = missions.firstIndex(where: { $0.id == missionId }) {
                missions[idx].status = event.eventType.replacingOccurrences(of: "mission.", with: "")
                missions[idx].completedAt = event.ts
                missions[idx].eventCount += 1
            } else {
                missions.insert(
                    MissionHistoryEntry(
                        id: missionId,
                        title: event.payload.title ?? "Mission",
                        status: event.eventType.replacingOccurrences(of: "mission.", with: ""),
                        createdAt: event.ts,
                        completedAt: event.ts,
                        agentCount: 0,
                        eventCount: 1
                    ),
                    at: 0
                )
            }
        default:
            if let idx = missions.firstIndex(where: { $0.id == missionId }) {
                missions[idx].eventCount += 1
            }
        }
    }
}
