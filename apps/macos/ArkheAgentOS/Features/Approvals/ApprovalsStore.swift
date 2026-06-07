import Foundation
import Observation

struct PendingApproval: Identifiable, Sendable {
    let id: String
    let summary: String
    let action: String
    let riskClass: String
    let requestedAt: String
}

@Observable
final class ApprovalsStore {
    var pending: [PendingApproval] = []

    func ingest(_ event: ArkheEvent) {
        switch event.eventType {
        case "approval.requested":
            let approvalId = event.payload.approvalId ?? event.id
            pending.append(PendingApproval(
                id: approvalId,
                summary: event.payload.summary ?? "Approval required",
                action: event.payload.action ?? "unknown",
                riskClass: event.payload.riskClass ?? "orange",
                requestedAt: event.ts
            ))
        case "approval.granted", "approval.denied", "approval.expired":
            if let approvalId = event.payload.approvalId {
                pending.removeAll { $0.id == approvalId }
            }
        default:
            break
        }
    }
}
