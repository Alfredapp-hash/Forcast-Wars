import Foundation

final class DaemonClient: @unchecked Sendable {
    var onEvent: ((EventStreamMessage) -> Void)?
    var onConnectionChange: ((Bool) -> Void)?
    var onMemorySearchResults: (([ArkheEvent]) -> Void)?
    var onReplayMission: ((String, [ArkheEvent]) -> Void)?
    var onExportAudit: (([ArkheEvent]) -> Void)?
    var onRuntimeSnapshot: ((RuntimeSnapshot) -> Void)?
    var onHealth: ((HealthStatus) -> Void)?

    private var pendingMemorySearch: (([ArkheEvent]) -> Void)?
    private var pendingReplay: ((String, [ArkheEvent]) -> Void)?
    private var pendingExportAudit: (([ArkheEvent]) -> Void)?
    private var pendingRuntimeSnapshot: ((RuntimeSnapshot) -> Void)?
    private var pendingHealth: ((HealthStatus) -> Void)?
    private var pendingVaultSearch: (([VaultMemoryRecord]) -> Void)?
    private var pendingRuntimeSettings: ((RuntimeSettingsModel) -> Void)?
    private var webSocketTask: URLSessionWebSocketTask?
    private let session = URLSession(configuration: .default)
    private let wsURL = URL(string: "ws://127.0.0.1:9470")!
    private var isConnected = false

    func connect() {
        webSocketTask = session.webSocketTask(with: wsURL)
        webSocketTask?.resume()
        receiveLoop()
        sendJSON(["type": "subscribe", "topics": ["arkhe.events.*"]])
    }

    func registerCapabilities() {
        let appleFm = FoundationModelService.isAvailable
        sendJSON([
            "type": "register_capabilities",
            "payload": ["appleFoundation": appleFm],
        ])
    }

    var onExpertUpdated: ((ResidentExpertRecord) -> Void)?
    var appleFmRegistered = false

    private var pendingExpertList: (([ResidentExpertRecord]) -> Void)?
    private var pendingSupabaseStatus: ((SupabaseStatusModel) -> Void)?

    func sendCommand(utterance: String, source: String) {
        sendJSON([
            "type": "command",
            "payload": [
                "utterance": utterance,
                "source": source,
            ],
        ])
    }

    func sendKillSwitch() {
        sendJSON(["type": "kill_switch"])
    }

    func requestHealth(completion: ((HealthStatus) -> Void)? = nil) {
        pendingHealth = completion
        sendJSON(["type": "health"])
    }

    func requestRuntimeSnapshot(completion: ((RuntimeSnapshot) -> Void)? = nil) {
        pendingRuntimeSnapshot = completion
        sendJSON(["type": "runtime_snapshot"])
    }

    func searchMemory(query: String, completion: (([ArkheEvent]) -> Void)? = nil) {
        pendingMemorySearch = completion
        sendJSON(["type": "memory_search", "payload": ["query": query]])
    }

    func replayMission(missionId: String, completion: ((String, [ArkheEvent]) -> Void)? = nil) {
        pendingReplay = completion
        sendJSON(["type": "replay_mission", "payload": ["missionId": missionId]])
    }

    func exportAudit(completion: (([ArkheEvent]) -> Void)? = nil) {
        pendingExportAudit = completion
        sendJSON(["type": "export_audit"])
    }

    func pauseMission(missionId: String) {
        sendJSON(["type": "pause_mission", "payload": ["missionId": missionId]])
    }

    func resumeMission(missionId: String) {
        sendJSON(["type": "resume_mission", "payload": ["missionId": missionId]])
    }

    func resolveApproval(approvalId: String, granted: Bool) {
        sendJSON([
            "type": "approval_resolve",
            "payload": [
                "approvalId": approvalId,
                "granted": granted,
            ],
        ])
    }

    func wakeExpert(role: String) {
        sendJSON(["type": "expert_wake", "payload": ["role": role]])
    }

    func sleepExpert(role: String) {
        sendJSON(["type": "expert_sleep", "payload": ["role": role]])
    }

    func requestExpertList(completion: (([ResidentExpertRecord]) -> Void)? = nil) {
        pendingExpertList = completion
        sendJSON(["type": "expert_list"])
    }

    func requestSupabaseStatus(completion: ((SupabaseStatusModel) -> Void)? = nil) {
        pendingSupabaseStatus = completion
        sendJSON(["type": "supabase_status"])
    }

    func searchVault(query: String, completion: (([VaultMemoryRecord]) -> Void)? = nil) {
        pendingVaultSearch = completion
        sendJSON(["type": "vault_search", "payload": ["query": query]])
    }

    func requestRuntimeSettings(completion: ((RuntimeSettingsModel) -> Void)? = nil) {
        pendingRuntimeSettings = completion
        sendJSON(["type": "runtime_settings"])
    }

    func updateRuntimeSettings(defaultBudgetUsd: Double, maxMissionBudgetUsd: Double, paidCloudEnabled: Bool, completion: ((RuntimeSettingsModel) -> Void)? = nil) {
        pendingRuntimeSettings = completion
        sendJSON([
            "type": "runtime_settings_update",
            "payload": [
                "defaultBudgetUsd": defaultBudgetUsd,
                "maxMissionBudgetUsd": maxMissionBudgetUsd,
                "paidCloudEnabled": paidCloudEnabled,
            ],
        ])
    }

    private func respondToAppleFmRequest(requestId: String, prompt: String, taskClass: String) {
        Task {
            let output = await FoundationModelService.generate(prompt: prompt, taskClass: taskClass)
            sendJSON([
                "type": "apple_fm_response",
                "payload": [
                    "requestId": requestId,
                    "output": output ?? "",
                ],
            ])
        }
    }

    private func sendJSON(_ object: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: object),
              let text = String(data: data, encoding: .utf8) else { return }
        webSocketTask?.send(.string(text)) { error in
            if let error {
                print("[DaemonClient] send error: \(error)")
            }
        }
    }

    private func receiveLoop() {
        webSocketTask?.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let message):
                self.handle(message)
                self.receiveLoop()
            case .failure(let error):
                print("[DaemonClient] receive error: \(error)")
                self.setConnected(false)
                DispatchQueue.global().asyncAfter(deadline: .now() + 2) {
                    self.connect()
                }
            }
        }
    }

    private func handle(_ message: URLSessionWebSocketTask.Message) {
        guard case .string(let text) = message,
              let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else { return }

        switch type {
        case "connected":
            setConnected(true)
            registerCapabilities()
        case "capabilities_registered":
            appleFmRegistered = json["appleFoundation"] as? Bool ?? false
        case "apple_fm_request":
            if let requestId = json["requestId"] as? String,
               let prompt = json["prompt"] as? String,
               let taskClass = json["taskClass"] as? String {
                respondToAppleFmRequest(requestId: requestId, prompt: prompt, taskClass: taskClass)
            }
        case "expert_list":
            let experts = decodeExperts(json["experts"])
            DispatchQueue.main.async {
                self.pendingExpertList?(experts)
                self.pendingExpertList = nil
            }
        case "expert_updated":
            if let expert = decodeExpert(json["expert"]) {
                DispatchQueue.main.async {
                    self.onExpertUpdated?(expert)
                }
            }
        case "supabase_status":
            if let status = decodeSupabaseStatus(json["status"]) {
                DispatchQueue.main.async {
                    self.pendingSupabaseStatus?(status)
                    self.pendingSupabaseStatus = nil
                }
            }
        case "vault_search":
            let memories = decodeVaultMemories(json["results"])
            DispatchQueue.main.async {
                self.pendingVaultSearch?(memories)
                self.pendingVaultSearch = nil
            }
        case "runtime_settings":
            if let settings = decodeRuntimeSettings(json["settings"]) {
                DispatchQueue.main.async {
                    self.pendingRuntimeSettings?(settings)
                    self.pendingRuntimeSettings = nil
                }
            }
        case "event":
            if let eventData = try? JSONSerialization.data(withJSONObject: json["message"] ?? [:]),
               let streamMessage = try? JSONDecoder().decode(EventStreamMessage.self, from: eventData) {
                DispatchQueue.main.async {
                    self.onEvent?(streamMessage)
                }
            }
        case "memory_search":
            let events = decodeEvents(json["results"])
            DispatchQueue.main.async {
                self.onMemorySearchResults?(events)
                self.pendingMemorySearch?(events)
                self.pendingMemorySearch = nil
            }
        case "replay_mission":
            let missionId = json["missionId"] as? String ?? ""
            let events = decodeEvents(json["events"])
            DispatchQueue.main.async {
                self.onReplayMission?(missionId, events)
                self.pendingReplay?(missionId, events)
                self.pendingReplay = nil
            }
        case "export_audit":
            let events = decodeEvents(json["events"])
            DispatchQueue.main.async {
                self.onExportAudit?(events)
                self.pendingExportAudit?(events)
                self.pendingExportAudit = nil
            }
        case "runtime_snapshot":
            if let snapshotData = try? JSONSerialization.data(withJSONObject: json["snapshot"] ?? [:]),
               let snapshot = try? JSONDecoder().decode(RuntimeSnapshot.self, from: snapshotData) {
                DispatchQueue.main.async {
                    self.onRuntimeSnapshot?(snapshot)
                    self.pendingRuntimeSnapshot?(snapshot)
                    self.pendingRuntimeSnapshot = nil
                }
            }
        case "health":
            if let statusData = try? JSONSerialization.data(withJSONObject: json["status"] ?? [:]),
               let status = try? JSONDecoder().decode(HealthStatus.self, from: statusData) {
                DispatchQueue.main.async {
                    self.onHealth?(status)
                    self.pendingHealth?(status)
                    self.pendingHealth = nil
                }
            }
        default:
            break
        }
    }

    private func decodeEvents(_ value: Any?) -> [ArkheEvent] {
        guard let array = value as? [[String: Any]],
              let data = try? JSONSerialization.data(withJSONObject: array),
              let events = try? JSONDecoder().decode([ArkheEvent].self, from: data) else {
            return []
        }
        return events
    }

    private func decodeExperts(_ value: Any?) -> [ResidentExpertRecord] {
        guard let array = value as? [[String: Any]],
              let data = try? JSONSerialization.data(withJSONObject: array),
              let experts = try? JSONDecoder().decode([ResidentExpertRecord].self, from: data) else {
            return []
        }
        return experts
    }

    private func decodeExpert(_ value: Any?) -> ResidentExpertRecord? {
        guard let dict = value,
              let data = try? JSONSerialization.data(withJSONObject: dict),
              let expert = try? JSONDecoder().decode(ResidentExpertRecord.self, from: data) else {
            return nil
        }
        return expert
    }

    private func decodeSupabaseStatus(_ value: Any?) -> SupabaseStatusModel? {
        guard let dict = value as? [String: Any] else { return nil }
        return SupabaseStatusModel(
            enabled: dict["enabled"] as? Bool ?? false,
            connected: dict["connected"] as? Bool ?? false,
            agentsSynced: dict["agentsSynced"] as? Int ?? 0,
            memoriesSynced: dict["memoriesSynced"] as? Int ?? 0
        )
    }

    private func decodeVaultMemories(_ value: Any?) -> [VaultMemoryRecord] {
        guard let array = value as? [[String: Any]],
              let data = try? JSONSerialization.data(withJSONObject: array),
              let memories = try? JSONDecoder().decode([VaultMemoryRecord].self, from: data) else {
            return []
        }
        return memories
    }

    private func decodeRuntimeSettings(_ value: Any?) -> RuntimeSettingsModel? {
        guard let dict = value,
              let data = try? JSONSerialization.data(withJSONObject: dict),
              let settings = try? JSONDecoder().decode(RuntimeSettingsModel.self, from: data) else {
            return nil
        }
        return settings
    }

    private func setConnected(_ connected: Bool) {
        guard connected != isConnected else { return }
        isConnected = connected
        DispatchQueue.main.async {
            self.onConnectionChange?(connected)
        }
    }
}
