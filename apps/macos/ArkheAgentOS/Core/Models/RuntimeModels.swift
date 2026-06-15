import Foundation

struct HealthStatus: Codable, Sendable {
    let status: String
    let daemon: String
    let ipc: String
    let eventBus: String
    let modelRouter: String
    let ollama: String?
    let supabase: String?
    let playwright: String?
    let appleFoundation: String?
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
    let neuralMesh: NeuralMeshSnapshot?
    let aiResources: [AIResourceRecord]?
}

struct ResidentExpertRecord: Codable, Sendable, Identifiable {
    let id: String
    let role: String
    let specialty: String
    let cortex: String?
    let permanent: Bool?
    let preferredLayer: Int
    let preferredModel: String
    let status: String
    let activations: Int
}

struct NeuralMeshSnapshot: Codable, Sendable {
    let synapses: [AgentSynapseRecord]
    let proposedExperts: [ProposedExpertRecord]
}

struct AgentSynapseRecord: Codable, Sendable, Identifiable {
    let id: String
    let sourceAgentId: String
    let targetAgentId: String
    let sourceRole: String
    let targetRole: String
    let weight: Double
    let messages: Int
    let successes: Int
    let failures: Int
    let trusted: Bool
}

struct ProposedExpertRecord: Codable, Sendable, Identifiable {
    let role: String
    let sourceRoles: [String]
    let confidence: Double
    let reason: String

    var id: String { role }
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
    let importance: Double?
    let contextTags: [String]?
    let accessCount: Int?
    let lastAccessedAt: String?
    let createdAt: String
    let similarity: Double?
    let recencyScore: Double?
    let activationScore: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case agentId = "agent_id"
        case missionId = "mission_id"
        case memoryType = "memory_type"
        case content
        case importance
        case contextTags = "context_tags"
        case accessCount = "access_count"
        case lastAccessedAt = "last_accessed_at"
        case createdAt = "created_at"
        case similarity
        case recencyScore = "recency_score"
        case activationScore = "activation_score"
    }
}

struct RuntimeSettingsModel: Codable, Sendable {
    let defaultBudgetUsd: Double
    let paidCloudEnabled: Bool
    let maxMissionBudgetUsd: Double
}

struct AttentionConfigModel: Codable, Sendable {
    let youtubeApiKeyConfigured: Bool
    let youtubeApiKeyMasked: String?
    let youtubeTrendQuery: String
    let youtubeRefreshTokenConfigured: Bool
    let youtubeRefreshTokenMasked: String?
    let lastPollAt: String?
    let lastPollOk: Bool?
    let xBearerTokenConfigured: Bool
    let xBearerTokenMasked: String?
    let xTrendQuery: String
    let xLastPollAt: String?
    let xLastPollOk: Bool?
}

struct DreamingStatusModel: Codable, Sendable {
    let enabled: Bool
    let lastRunAt: String?
    let lastReflection: String?
    let eventCount: Int
}

struct DocumentaryConfigModel: Codable, Sendable {
    let enabled: Bool
    let channelName: String
    let publishingMode: String
    let qualityThreshold: Int
    let pipelineBudgetUsd: Double
    let lastPipelineRunAt: String?
    let lastPipelineStatus: String
    let lastPipelineStage: String?
}

struct DocumentarySustainabilityModel: Codable, Sendable {
    let readinessScore: Int
    let consecutiveSustainableMonths: Int
    let requiredConsecutiveMonths: Int
    let reserveMonthsCovered: Double
    let requiredReserveMonths: Int
    let autonomousPublishReady: Bool
    let summary: String
}

struct DocumentaryStatusModel: Codable, Sendable {
    let run: DocumentaryRunModel?
    let sustainability: DocumentarySustainabilityModel
}

struct DocumentaryRunModel: Codable, Sendable {
    let id: String
    let startedAt: String
    let completedAt: String?
    let status: String
    let currentStage: String?
    let publishMode: String
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

    private let maxMissions = 200

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
        trimIfNeeded()
    }

    private func trimIfNeeded() {
        if missions.count > maxMissions {
            missions.removeLast(missions.count - maxMissions)
        }
    }
}
