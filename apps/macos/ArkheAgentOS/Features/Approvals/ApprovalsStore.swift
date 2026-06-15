import Foundation
import Observation

enum ApprovalSource: String, Sendable {
    case daemon
    case hermes
}

struct PendingApproval: Identifiable, Sendable {
    let id: String
    let summary: String
    let action: String
    let riskClass: String
    let requestedAt: String
    var source: ApprovalSource = .daemon
}

@Observable
final class ApprovalsStore {
    var pending: [PendingApproval] = []

    private let maxPending = 50

    func ingest(_ event: ArkheEvent) {
        switch event.eventType {
        case "approval.requested":
            let approvalId = event.payload.approvalId ?? event.id
            let src: ApprovalSource = (event.agentId == nil && event.payload.approvalId != nil) ? .hermes : .daemon
            pending.removeAll { $0.id == approvalId }
            pending.append(PendingApproval(
                id: approvalId,
                summary: event.payload.summary ?? "Approval required",
                action: event.payload.action ?? "unknown",
                riskClass: event.payload.riskClass ?? "orange",
                requestedAt: event.ts,
                source: src
            ))
            if pending.count > maxPending {
                pending.removeLast(pending.count - maxPending)
            }
        case "approval.granted", "approval.denied", "approval.expired":
            if let approvalId = event.payload.approvalId {
                pending.removeAll { $0.id == approvalId }
            }
        case let t where t.hasPrefix("debate.") || t == "prediction.created":
            if event.eventType == "debate.round_completed" || event.payload.summary?.contains("content") == true {
                let approvalId = "content_\(event.id)"
                pending.append(PendingApproval(
                    id: approvalId,
                    summary: event.payload.summary ?? "Content awaiting review",
                    action: "content_approval",
                    riskClass: "yellow",
                    requestedAt: event.ts,
                    source: .hermes
                ))
            }
        default:
            break
        }
    }
}
