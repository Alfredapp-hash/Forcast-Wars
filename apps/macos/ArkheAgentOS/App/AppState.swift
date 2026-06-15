import Foundation
import Observation

@Observable
final class AppState {
    var selectedTab: SidebarTab = .missionControl
    var replayMissionId: String?
    var replayFocusEventId: String?
    var forensicsContext: ForensicsContext?
    var daemonConnected = false
    var daemonReconnecting = false
    var openMissionControlPopout = false
    var lastHealth: HealthStatus?
    var daemonLaunchOutcome: DaemonLaunchOutcome?
    var dismissedAlertIds: Set<String> = []
    /// Bumped to request focus on the bottom command bar (⌘L).
    var commandBarFocusToken = UUID()

    let daemonClient = DaemonClient()
    let hermesClient = HermesClient()
    let approvalsStore = ApprovalsStore()
    let missionHistoryStore = MissionHistoryStore()
    let missionControlViewModel = MissionControlViewModel()
    let residentsStore = ResidentsStore()
    let operatingStatus = OperatingStatusStore()
    var hermesConnected = false

    private let daemonLauncher = DaemonLauncher()
    private var healthPollTask: Task<Void, Never>?

    var systemAlerts: [SystemAlert] {
        buildSystemAlerts().filter { !dismissedAlertIds.contains($0.id) }
    }

    init() {
        daemonLaunchOutcome = daemonLauncher.ensureRunning()

        daemonClient.onConnectionChange = { [weak self] connected in
            Task { @MainActor in
                guard let self else { return }
                self.daemonConnected = connected
                if connected {
                    self.refreshSystemHealth()
                    self.residentsStore.refresh(daemonClient: self.daemonClient)
                }
            }
        }

        daemonClient.onReconnectingChange = { [weak self] reconnecting in
            Task { @MainActor in
                self?.daemonReconnecting = reconnecting
            }
        }

        daemonClient.onHealth = { [weak self] status in
            Task { @MainActor in
                self?.lastHealth = status
            }
        }

        daemonClient.onEvent = { [weak self] message in
            Task { @MainActor in
                guard let self else { return }
                self.approvalsStore.ingest(message.event)
                self.missionHistoryStore.ingest(message.event)
                self.missionControlViewModel.ingest(message)
                self.operatingStatus.ingest(message.event)
                self.operatingStatus.syncFromViewModel(
                    costToday: self.missionControlViewModel.totalCostToday,
                    agentCount: self.missionControlViewModel.activeAgentCount
                )
                if message.event.eventType == "model.route.failed" {
                    self.refreshSystemHealth()
                }
            }
        }

        daemonClient.onExportAudit = { events in
            Task { @MainActor in
                print("[AppState] Audit export received with \(events.count) events (from ⌘K or AgentOS menu)")
            }
        }

        hermesClient.onApprovalRequested = { [weak self] approval in
            guard let self else { return }
            // Synthesise a minimal ArkheEvent so ApprovalsStore.ingest() works unchanged
            let fakeEvent = ArkheEvent.hermesApproval(approval)
            self.approvalsStore.ingest(fakeEvent)
        }

        hermesClient.onApprovalResolved = { [weak self] approvalId, granted in
            guard let self else { return }
            let fakeEvent = ArkheEvent.hermesApprovalResolved(
                approvalId: approvalId, granted: granted
            )
            self.approvalsStore.ingest(fakeEvent)
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.daemonClient.connect()
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
            self.hermesClient.connect()
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.loadMissionHistory()
            self.residentsStore.refresh(daemonClient: self.daemonClient)
        }

        startHealthPolling()
    }

    deinit {
        healthPollTask?.cancel()
        hermesClient.disconnect()
    }

    func openReplay(missionId: String, focusEventId: String? = nil) {
        replayMissionId = missionId
        replayFocusEventId = focusEventId
        selectedTab = .replay
    }

    func presentForensics(_ context: ForensicsContext) {
        forensicsContext = context
    }

    func presentForensics(focusEvent: ArkheEvent?, allEvents: [ArkheEvent], question: String? = nil) {
        forensicsContext = ForensicsHelper.buildContext(
            focusEvent: focusEvent,
            allEvents: allEvents,
            question: question
        )
    }

    func dismissForensics() {
        forensicsContext = nil
    }

    func requestCommandBarFocus() {
        commandBarFocusToken = UUID()
    }

    func openForensicsForAgent(agentId: String, missionId: String?) {
        daemonClient.searchMemory(query: agentId) { events in
            let filtered = events.filter {
                $0.agentId == agentId || $0.parentAgentId == agentId
            }
            let sorted = filtered.sorted { $0.ts < $1.ts }
            let focus = sorted.last
            Task { @MainActor in
                self.presentForensics(
                    focusEvent: focus,
                    allEvents: sorted,
                    question: "What evidence explains \(focus?.payload.role ?? agentId)'s recent actions?"
                )
            }
        }
    }

    func openForensicsForSynapse(_ synapse: AgentSynapseRecord) {
        daemonClient.searchMemory(query: synapse.sourceAgentId) { sourceEvents in
            self.daemonClient.searchMemory(query: synapse.targetAgentId) { targetEvents in
                var seen = Set<String>()
                let combined = (sourceEvents + targetEvents).filter { event in
                    guard seen.insert(event.id).inserted else { return false }
                    if event.eventType.hasPrefix("synapse.") { return true }
                    let agentMatch = event.agentId == synapse.sourceAgentId
                        || event.agentId == synapse.targetAgentId
                        || event.parentAgentId == synapse.sourceAgentId
                        || event.parentAgentId == synapse.targetAgentId
                    return agentMatch
                }
                let sorted = combined.sorted { $0.ts < $1.ts }
                let focus = sorted.last(where: { $0.eventType.hasPrefix("synapse.") }) ?? sorted.last
                Task { @MainActor in
                    self.presentForensics(
                        focusEvent: focus,
                        allEvents: sorted,
                        question: "What evidence explains the \(synapse.sourceRole) ↔ \(synapse.targetRole) collaboration (weight \(Int(synapse.weight * 100)), \(synapse.messages) messages)?"
                    )
                }
            }
        }
    }

    func dismissAlert(id: String) {
        dismissedAlertIds.insert(id)
    }

    func refreshSystemHealth() {
        daemonClient.requestHealth { [weak self] status in
            Task { @MainActor in
                self?.lastHealth = status
            }
        }
    }

    private func startHealthPolling() {
        healthPollTask?.cancel()
        healthPollTask = Task { @MainActor [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(45))
                guard let self, self.daemonConnected else { continue }
                self.refreshSystemHealth()
                self.residentsStore.refresh(daemonClient: self.daemonClient)
            }
        }
    }

    private func loadMissionHistory() {
        daemonClient.searchMemory(query: "mission.") { events in
            let sorted = events.sorted { $0.ts < $1.ts }
            for event in sorted {
                self.missionHistoryStore.ingest(event)
            }
        }
    }

    private func buildSystemAlerts() -> [SystemAlert] {
        var alerts: [SystemAlert] = []

        if daemonReconnecting {
            alerts.append(SystemAlert(
                id: "daemon-reconnecting",
                severity: .warning,
                title: "Reconnecting to daemon…",
                message: "The local control plane link dropped. Missions pause until the WebSocket reconnects.",
                actionTitle: "Retry now",
                action: { [weak self] in self?.daemonClient.forceReconnect() }
            ))
        } else if !daemonConnected {
            let retryLaunch: () -> Void = { [weak self] in
                guard let self else { return }
                self.daemonLaunchOutcome = self.daemonLauncher.ensureRunning()
                self.daemonClient.forceReconnect()
            }

            switch daemonLaunchOutcome {
            case .some(.entryNotFound), .some(.startFailed):
                let message = daemonLaunchOutcome?.userMessage ?? "Daemon could not start."
                alerts.append(SystemAlert(
                    id: "daemon-launch-failed",
                    severity: .error,
                    title: "Daemon launch failed",
                    message: message,
                    actionTitle: "Retry launch",
                    action: retryLaunch
                ))
            case .startedButUnreachable:
                alerts.append(SystemAlert(
                    id: "daemon-starting",
                    severity: .warning,
                    title: "Daemon still starting",
                    message: daemonLaunchOutcome?.userMessage ?? "ws://127.0.0.1:9470 is not responding yet.",
                    actionTitle: "Retry",
                    action: { [weak self] in self?.daemonClient.forceReconnect() }
                ))
            default:
                alerts.append(SystemAlert(
                    id: "daemon-offline",
                    severity: .error,
                    title: "Daemon not connected",
                    message: "Arkhe AgentOS could not reach ws://127.0.0.1:9470. Check that the bundled Node daemon is running or restart the app.",
                    actionTitle: "Retry",
                    action: retryLaunch
                ))
            }
        }

        if let health = lastHealth {
            if health.ollama == "unavailable" {
                alerts.append(SystemAlert(
                    id: "ollama-unavailable",
                    severity: .warning,
                    title: "Ollama unavailable",
                    message: "Local models (Layer 2) need Ollama running with qwen3:8b and nomic-embed-text. Install from ollama.com and run `ollama pull qwen3:8b`.",
                    actionTitle: nil,
                    action: nil
                ))
            }

            if health.supabase == "degraded" {
                alerts.append(SystemAlert(
                    id: "supabase-degraded",
                    severity: .warning,
                    title: "Supabase sync degraded",
                    message: "Cloud memory is configured but unreachable. Local missions continue; resident sync may be stale.",
                    actionTitle: "Open Settings",
                    action: { [weak self] in self?.selectedTab = .settings }
                ))
            }

            if health.playwright == "unavailable" {
                alerts.append(SystemAlert(
                    id: "playwright-unavailable",
                    severity: .warning,
                    title: "Browser runtime unavailable",
                    message: "Playwright Chromium probe failed. Install with `npx playwright install chromium` from the repo (or rebuild via pnpm bundle:daemon). Browser missions and live agent browsing are blocked until Chromium is available.",
                    actionTitle: nil,
                    action: nil
                ))
            } else if health.playwright == "degraded" {
                alerts.append(SystemAlert(
                    id: "playwright-degraded",
                    severity: .info,
                    title: "Browser runtime checking",
                    message: "Playwright Chromium has not passed a health probe yet. Browser missions may fail until the daemon finishes its first Chromium launch.",
                    actionTitle: nil,
                    action: nil
                ))
            }

            if health.eventBus == "degraded" {
                alerts.append(SystemAlert(
                    id: "eventbus-degraded",
                    severity: .info,
                    title: "Event bus in-process only",
                    message: "NATS JetStream is offline. Events still flow locally; multi-daemon mesh features are limited.",
                    actionTitle: nil,
                    action: nil
                ))
            }
        }

        if !FoundationModelService.isAvailable {
            #if canImport(FoundationModels)
            if #available(macOS 26.0, *) {
                alerts.append(SystemAlert(
                    id: "apple-fm-unavailable",
                    severity: .info,
                    title: "Apple Foundation Models unavailable",
                    message: "On-device Apple Intelligence is not ready on this Mac. Layer 1 routing falls back to Ollama or cloud when allowed.",
                    actionTitle: nil,
                    action: nil
                ))
            }
            #endif
        }

        return alerts
    }
}

enum SidebarTab: String, CaseIterable, Identifiable {
    case missionControl = "Mission Control"
    case missions = "Missions"
    case agents = "Agents"
    case residents = "Arkhe DNA"
    case browser = "Browser"
    case replay = "Replay"
    case memory = "Memory"
    case observatory = "Observatory"
    case approvals = "Approvals"
    case report = "Daily Report"
    case settings = "Settings"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .missionControl: return "gauge.with.dots.needle.67percent"
        case .missions: return "flag.checkered"
        case .agents: return "cpu"
        case .residents: return "waveform.path.ecg"
        case .browser: return "globe"
        case .replay: return "play.rectangle.on.rectangle"
        case .memory: return "brain"
        case .observatory: return "chart.xyaxis.line"
        case .approvals: return "checkmark.shield"
        case .report: return "doc.text.fill"
        case .settings: return "gearshape"
        }
    }

    var shortcut: Int? {
        switch self {
        case .missionControl: return 1
        case .missions: return 2
        case .agents: return 3
        case .residents: return 4
        case .browser: return 5
        case .replay: return 6
        case .memory: return 7
        case .observatory: return 8
        case .approvals: return 9
        case .report: return 0
        default: return nil
        }
    }
}
