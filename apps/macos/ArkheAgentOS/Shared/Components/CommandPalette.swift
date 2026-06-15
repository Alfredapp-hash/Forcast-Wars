import SwiftUI

/// Command Palette (⌘K) — Premium quick win.
/// Currently a skeleton with a few high-value actions. Expand with fuzzy search over missions/agents/residents/actions.
struct CommandPalette: View {
    @Environment(AppState.self) private var appState
    @State private var query = ""
    @Binding var isPresented: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            TextField("Type a command or search… (e.g. scan attention, wake trend, dream now, alfred, export audit)", text: $query)
                .textFieldStyle(.roundedBorder)
                .onSubmit { executeFirstMatch() }

            List(filteredActions, id: \.title) { action in
                Button(action.title) {
                    action.run()
                    isPresented = false
                }
                .buttonStyle(.plain)
            }
            .listStyle(.plain)
            .frame(maxHeight: 280)
        }
        .padding()
        .frame(width: 560, height: 380)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .onAppear { query = "" }
    }

    private var filteredActions: [PaletteAction] {
        let q = query.lowercased().trimmingCharacters(in: .whitespaces)
        let all = defaultActions()
        guard !q.isEmpty else { return all }
        return all.filter { action in
            let titleL = action.title.lowercased()
            let kwJoined = (action.keywords + [titleL]).joined(separator: " ")
            if titleL.contains(q) || action.keywords.contains(q) { return true }
            // Improved fuzzy search: multi-token (e.g. "attention scan", "wake video"), "alfred", "trend", "media", "video" etc surface correct actions fast.
            let tokens = q.split(separator: " ").map { String($0) }
            return tokens.allSatisfy { tok in
                titleL.contains(tok) || action.keywords.contains { $0.contains(tok) } || kwJoined.contains(tok)
            }
        }
    }

    private func defaultActions() -> [PaletteAction] {
        [
            PaletteAction(title: "New Mission", keywords: ["new", "mission", "director"]) {
                appState.selectedTab = .missionControl
            },
            PaletteAction(title: "Open Residents / Neural Mesh", keywords: ["residents", "mesh", "dna", "experts"]) {
                appState.selectedTab = .residents
            },
            PaletteAction(title: "Focus Attention Cortex in Residents", keywords: ["focus", "attention", "cortex", "residents", "neural", "mesh", "trend", "alfred", "media"]) {
                appState.selectedTab = .residents
            },
            PaletteAction(title: "Open Observatory (AI Resources)", keywords: ["observatory", "resources", "cost", "cpu"]) {
                appState.selectedTab = .observatory
            },
            PaletteAction(title: "Open Memory (Ark Vault)", keywords: ["memory", "vault", "brain", "search", "dni"]) {
                appState.selectedTab = .memory
            },
            PaletteAction(title: "Open Live Agent Browser", keywords: ["live", "browser", "agent", "playwright", "artifacts", "media", "video"]) {
                appState.selectedTab = .browser
            },
            PaletteAction(title: "Dream Now (force reflection)", keywords: ["dream", "reflection", "memory", "vault", "media"]) {
                appState.daemonClient.dreamNow()
            },
            // Top-level Attention Cortex actions (attn-5, p2-4). Both titles + rich keywords so "attention", "scan", "alfred", "trend", "media", "video" hit immediately.
            PaletteAction(title: "Scan for Attention Opportunities", keywords: ["attention", "scan", "trend", "media", "cortex", "autonomous", "alfred", "video", "opportunity", "produce"]) {
                appState.daemonClient.triggerAttentionScan()
            },
            PaletteAction(title: "Run Attention Cortex", keywords: ["attention", "run", "cortex", "scan", "media", "alfred", "trend", "video", "manufacture"]) {
                appState.daemonClient.triggerAttentionScan()
            },
            // Wake key permanent + core Attention Cortex agents (exact roles from orchestrator/agent-registry.ts so Residents shows them as cortex:"attention").
            PaletteAction(title: "Wake Trend Intelligence Agent", keywords: ["wake", "trend", "intelligence", "attention", "cortex", "alfred", "scan", "media"]) {
                appState.daemonClient.wakeExpert(role: "Trend Intelligence Agent")
            },
            PaletteAction(title: "Wake Opportunity Agent", keywords: ["wake", "opportunity", "attention", "cortex", "filter", "score", "alfred", "trend"]) {
                appState.daemonClient.wakeExpert(role: "Opportunity Agent")
            },
            PaletteAction(title: "Wake Video Production Agent", keywords: ["wake", "video", "production", "attention", "cortex", "veo", "kling", "runway", "media", "alfred"]) {
                appState.daemonClient.wakeExpert(role: "Video Production Agent")
            },
            PaletteAction(title: "Wake YouTube Agent", keywords: ["wake", "youtube", "publish", "attention", "cortex", "media", "upload", "video"]) {
                appState.daemonClient.wakeExpert(role: "YouTube Agent")
            },
            PaletteAction(title: "Wake Analytics Agent", keywords: ["wake", "analytics", "attention", "cortex", "performance", "views", "ctr", "media", "alfred", "video"]) {
                appState.daemonClient.wakeExpert(role: "Analytics Agent")
            },
            PaletteAction(title: "Wake Dreaming Agent (Media)", keywords: ["wake", "dream", "dreaming", "media", "attention", "cortex", "reflection", "alfred", "mesh"]) {
                appState.daemonClient.wakeExpert(role: "Dreaming Agent (Media)")
            },
            PaletteAction(title: "Export last mission audit", keywords: ["export", "audit", "mission", "log", "compliance", "memory"]) {
                appState.daemonClient.exportAudit()
            },
            PaletteAction(title: "Kill Switch", keywords: ["kill", "stop", "terminate"]) {
                appState.daemonClient.sendKillSwitch()
            }
        ]
    }

    private func executeFirstMatch() {
        if let first = filteredActions.first {
            first.run()
            isPresented = false
        }
    }
}

private struct PaletteAction {
    let title: String
    let keywords: [String]
    let run: () -> Void
}

// Convenience modifier to present with ⌘K
extension View {
    func commandPalette(isPresented: Binding<Bool>, appState: AppState) -> some View {
        self.sheet(isPresented: isPresented) {
            CommandPalette(isPresented: isPresented)
                .environment(appState)
        }
        .keyboardShortcut("k", modifiers: .command)
    }
}