import Foundation

struct ForensicsContext: Identifiable, Hashable, Sendable {
    let id: UUID
    let title: String
    let question: String
    let focusEvent: ArkheEvent?
    let evidenceChain: [ArkheEvent]
    let missionId: String?
    let agentId: String?

    init(
        title: String,
        question: String,
        focusEvent: ArkheEvent?,
        evidenceChain: [ArkheEvent],
        missionId: String?,
        agentId: String?
    ) {
        self.id = UUID()
        self.title = title
        self.question = question
        self.focusEvent = focusEvent
        self.evidenceChain = evidenceChain
        self.missionId = missionId
        self.agentId = agentId
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: ForensicsContext, rhs: ForensicsContext) -> Bool {
        lhs.id == rhs.id
    }
}

enum ForensicsHelper {
    static func buildContext(
        focusEvent: ArkheEvent?,
        allEvents: [ArkheEvent],
        question: String? = nil
    ) -> ForensicsContext {
        let sorted = allEvents.sorted { $0.ts < $1.ts }
        let chain = buildEvidenceChain(focus: focusEvent, events: sorted)
        let agentId = focusEvent?.agentId ?? focusEvent?.parentAgentId
        let missionId = focusEvent?.missionId ?? chain.last?.missionId
        let role = focusEvent?.payload.role ?? agentId ?? "Agent"
        let defaultQuestion = question ?? defaultQuestion(for: focusEvent, role: role)

        return ForensicsContext(
            title: "Forensics: \(role)",
            question: defaultQuestion,
            focusEvent: focusEvent,
            evidenceChain: chain,
            missionId: missionId,
            agentId: agentId
        )
    }

    static func buildEvidenceChain(focus: ArkheEvent?, events: [ArkheEvent]) -> [ArkheEvent] {
        guard let focus else {
            return Array(events.suffix(12))
        }

        let agentId = focus.agentId ?? focus.parentAgentId
        let missionId = focus.missionId

        var related = events.filter { event in
            if event.id == focus.id { return true }
            if let missionId, event.missionId == missionId {
                if agentId == nil { return true }
                return event.agentId == agentId || event.parentAgentId == agentId
            }
            if let agentId {
                return event.agentId == agentId || event.parentAgentId == agentId
            }
            return false
        }

        if let idx = related.firstIndex(where: { $0.id == focus.id }) {
            let start = max(0, idx - 8)
            related = Array(related[start...min(related.count - 1, idx)])
        } else {
            related.append(focus)
            related.sort { $0.ts < $1.ts }
        }

        return related
    }

    static func evidenceSummary(_ event: ArkheEvent, index: Int) -> String {
        let p = event.payload
        switch event.eventType {
        case let t where t.hasPrefix("browser."):
            if let url = p.url { return "\(index). \(event.eventType) — \(url)" }
            return "\(index). \(event.eventType)"
        case let t where t.hasPrefix("tool."):
            return "\(index). \(p.toolName ?? event.eventType) — \(p.summary ?? p.message ?? "tool action")"
        case "agent.message":
            return "\(index). agent.message — \(p.message ?? p.summary ?? "inter-agent reasoning")"
        case let t where t.hasPrefix("model."):
            let route = [p.provider, p.model].compactMap { $0 }.joined(separator: " · ")
            return "\(index). \(event.eventType)\(route.isEmpty ? "" : " — \(route)")"
        case let t where t.hasPrefix("approval."):
            return "\(index). \(event.eventType) — \(p.summary ?? p.action ?? "approval gate")"
        default:
            if let summary = p.summary ?? p.message ?? p.title ?? p.url ?? p.reason {
                return "\(index). \(event.eventType) — \(summary)"
            }
            return "\(index). \(event.eventType)"
        }
    }

    static func narrateStep(_ event: ArkheEvent) -> String {
        let p = event.payload
        switch event.eventType {
        case "browser.navigate":
            return "The agent navigated to \(p.url ?? "a page") to gather on-page evidence."
        case "browser.dom_snapshot", "browser.screenshot":
            return "The agent captured a \(event.eventType.replacingOccurrences(of: "browser.", with: "")) for forensic review."
        case "agent.message":
            return "The agent exchanged reasoning: \(p.message ?? p.summary ?? "see payload")."
        case let t where t.hasPrefix("model.route"):
            return "Model router selected \(p.provider ?? "provider") / \(p.model ?? "model") at layer \(p.layer.map(String.init) ?? "?")."
        case let t where t.hasPrefix("approval."):
            return "Human approval gate: \(p.summary ?? p.action ?? event.eventType)."
        case let t where t.hasPrefix("tool."):
            return "Tool invocation \(p.toolName ?? "unknown") — \(p.summary ?? p.message ?? "completed")."
        default:
            return evidenceLine(event)
        }
    }

    static func evidenceLine(_ event: ArkheEvent) -> String {
        let p = event.payload
        if let msg = p.message ?? p.summary ?? p.title { return msg }
        if let url = p.url { return url }
        if let tool = p.toolName { return tool }
        return event.eventType
    }

    static func encodeEvents(_ events: [ArkheEvent]) -> Data? {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try? encoder.encode(events)
    }

    static func encodeEventJSON(_ event: ArkheEvent) -> String {
        guard let data = encodeEvents([event]),
              let text = String(data: data, encoding: .utf8) else {
            return "{}"
        }
        return text
    }

    private static func defaultQuestion(for event: ArkheEvent?, role: String) -> String {
        guard let event else {
            return "What evidence led to this agent's latest actions?"
        }
        if event.eventType.hasPrefix("approval.") {
            return "Why did \(role) require human approval at this step?"
        }
        if event.eventType.hasPrefix("browser.") {
            return "Why did \(role) inspect this page and what did it find?"
        }
        if event.eventType == "agent.message" {
            return "What reasoning did \(role) communicate to other agents?"
        }
        return "Why did \(role) take this action (\(event.eventType))?"
    }
}
