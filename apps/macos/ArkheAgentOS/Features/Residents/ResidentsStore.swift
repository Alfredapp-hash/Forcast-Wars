import Foundation
import Observation

@Observable
final class ResidentsStore {
    var experts: [ResidentExpertRecord] = []
    var appleFmAvailable = false
    var supabaseEnabled = false
    var supabaseConnected = false
    var synapses: [AgentSynapseRecord] = []
    var proposedExperts: [ProposedExpertRecord] = []

    private let maxSynapses = 500
    private let maxProposedExperts = 50

    var activeCount: Int {
        experts.filter { $0.status == "active" || $0.status == "busy" }.count
    }

    func refresh(daemonClient: DaemonClient) {
        daemonClient.requestExpertList { list in
            self.experts = list.sorted { $0.role < $1.role }
        }
        daemonClient.requestSupabaseStatus { status in
            self.supabaseEnabled = status.enabled
            self.supabaseConnected = status.connected
        }
        daemonClient.requestRuntimeSnapshot { snapshot in
            self.synapses = Array((snapshot.neuralMesh?.synapses ?? []).prefix(self.maxSynapses))
            self.proposedExperts = Array((snapshot.neuralMesh?.proposedExperts ?? []).prefix(self.maxProposedExperts))
        }
    }

    func applyUpdate(_ expert: ResidentExpertRecord) {
        if let idx = experts.firstIndex(where: { $0.id == expert.id }) {
            experts[idx] = expert
        } else {
            experts.append(expert)
        }
    }
}

struct SupabaseStatusModel: Sendable {
    let enabled: Bool
    let connected: Bool
    let agentsSynced: Int
    let memoriesSynced: Int
}
