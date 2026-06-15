import SwiftUI
import WebKit

/// Live dual-mode Agent Browser (Premium Phase 2 / big experiential gap from the spec).
/// - User: normal browsing
/// - Agent: agent-controlled view with live action log + in-browser orange/red approval modals
/// - Split: placeholder for future side-by-side
///
/// This version has a functional simulated approval flow inside the Agent overlay so the experience feels real.
struct LiveAgentBrowserView: View {
    @State private var mode: BrowserMode = .user
    @State private var urlString = "https://arkhe.com"
    @State private var currentURL: URL?

    // Live Agent mode state
    @State private var agentActions: [BrowserAction] = []
    @State private var pendingApproval: BrowserAction?
    @State private var lastResolution: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            header

            Picker("", selection: $mode) {
                Text("User").tag(BrowserMode.user)
                Text("Agent").tag(BrowserMode.agent)
                Text("Split").tag(BrowserMode.split)
            }
            .pickerStyle(.segmented)
            .frame(width: 260)
            .padding(.horizontal)

            ZStack {
                WebPreview(url: currentURL ?? URL(string: urlString)!)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .padding(.horizontal)

                if mode == .agent {
                    agentOverlay
                }
                if mode == .split {
                    splitOverlay
                }
            }
        }
        .onAppear {
            if currentURL == nil { currentURL = URL(string: urlString) }
            if agentActions.isEmpty {
                // Seed a couple of realistic actions
                agentActions = [
                    BrowserAction(ts: now(), type: "navigate", detail: "https://arkhe.com", risk: .green),
                    BrowserAction(ts: now(), type: "screenshot", detail: "captured page.png", risk: .green)
                ]
            }
        }
        .sheet(item: $pendingApproval) { action in
            ApprovalModal(action: action) { granted in
                resolveApproval(action: action, granted: granted)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private var header: some View {
        HStack {
            Text("Agent Browser")
                .font(.largeTitle.bold())
            Spacer()
            TextField("URL", text: $urlString)
                .textFieldStyle(.roundedBorder)
                .frame(width: 320)
                .onSubmit { navigate() }
            Button("Go") { navigate() }
                .buttonStyle(.bordered)
        }
        .padding(.horizontal)
    }

    private var agentOverlay: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Top status bar
            HStack {
                Label("Agent controlling this tab", systemImage: "cpu")
                    .font(.caption.bold())
                    .padding(6)
                    .background(.orange.opacity(0.18))
                    .clipShape(Capsule())
                if !lastResolution.isEmpty {
                    Text(lastResolution)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .padding(.leading, 8)
                }
                Spacer()
                Button("Simulate Orange Action") {
                    simulateOrangeAction()
                }
                .font(.caption)
                .buttonStyle(.bordered)
            }
            .padding(.horizontal, 10)
            .padding(.top, 8)

            Spacer()

            // Live action log
            VStack(alignment: .leading, spacing: 4) {
                Text("AGENT ACTIONS (live)")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 10)

                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 3) {
                        ForEach(agentActions) { act in
                            HStack(spacing: 6) {
                                Text(act.ts)
                                    .font(.system(.caption2, design: .monospaced))
                                    .foregroundStyle(.secondary)
                                    .frame(width: 58, alignment: .leading)
                                Text(act.type)
                                    .font(.caption2.monospaced().weight(.semibold))
                                Text(act.detail)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                                Spacer()
                                RiskDot(risk: act.risk)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 2)
                        }
                    }
                }
                .frame(maxHeight: 110)
            }
            .padding(.bottom, 8)

            // Quick trigger area (feels like the in-browser surface)
            HStack {
                Button("Trigger Red Action (form submit)") {
                    triggerRedAction()
                }
                .font(.caption)
                .buttonStyle(.borderedProminent)
                .tint(.red)

                Text("Orange/red actions surface native approval modals inside the browser view.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 10)
            .padding(.bottom, 12)
        }
    }

    private var splitOverlay: some View {
        HStack {
            Spacer()
            VStack {
                Text("Split mode (user tab + agent tab) — coming in full Premium implementation")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding()
                Spacer()
            }
            Spacer()
        }
    }

    private func navigate() {
        currentURL = URL(string: urlString)
        if mode == .agent {
            logAction(type: "navigate", detail: urlString, risk: .green)
        }
    }

    private func simulateOrangeAction() {
        let act = BrowserAction(ts: now(), type: "click", detail: "#submit-contact (orange)", risk: .orange)
        agentActions.append(act)
        pendingApproval = act
    }

    private func triggerRedAction() {
        let act = BrowserAction(ts: now(), type: "submit", detail: "contact form on competitor.com (red)", risk: .red)
        agentActions.append(act)
        pendingApproval = act
    }

    private func resolveApproval(action: BrowserAction, granted: Bool) {
        lastResolution = granted ? "Approved: \(action.detail)" : "Denied: \(action.detail)"
        // Remove the pending one from the log or mark it
        if let idx = agentActions.firstIndex(where: { $0.id == action.id }) {
            agentActions[idx] = BrowserAction(
                id: action.id,
                ts: action.ts,
                type: action.type,
                detail: action.detail + (granted ? " ✓" : " ✗"),
                risk: action.risk
            )
        }
        pendingApproval = nil
    }

    private func logAction(type: String, detail: String, risk: RiskClass) {
        agentActions.append(BrowserAction(ts: now(), type: type, detail: detail, risk: risk))
        if agentActions.count > 30 { agentActions.removeFirst() }
    }

    private func now() -> String {
        let f = DateFormatter()
        f.dateFormat = "HH:mm:ss"
        return f.string(from: Date())
    }
}

enum BrowserMode: String, CaseIterable, Identifiable {
    case user, agent, split
    var id: String { rawValue }
}

struct BrowserAction: Equatable, Identifiable {
    let id: UUID
    let ts: String
    let type: String
    let detail: String
    let risk: RiskClass

    init(id: UUID = UUID(), ts: String, type: String, detail: String, risk: RiskClass) {
        self.id = id
        self.ts = ts
        self.type = type
        self.detail = detail
        self.risk = risk
    }
}

enum RiskClass: String {
    case green, yellow, orange, red
}

struct RiskDot: View {
    let risk: RiskClass
    var body: some View {
        let color: Color = {
            switch risk {
            case .green: return .green
            case .yellow: return .yellow
            case .orange: return .orange
            case .red: return .red
            }
        }()
        return Circle().fill(color).frame(width: 6, height: 6)
    }
}

struct ApprovalModal: View {
    let action: BrowserAction
    let onResolve: (Bool) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: action.risk == .red ? "exclamationmark.triangle.fill" : "exclamationmark.shield.fill")
                    .foregroundStyle(action.risk == .red ? .red : .orange)
                Text("Approval required — Agent Browser")
                    .font(.headline)
            }

            Text("\(action.type) — \(action.detail)")
                .font(.subheadline.monospaced())

            Text("This action was classified as **\(action.risk.rawValue.uppercased())** risk.")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack {
                Button("Deny", role: .destructive) { onResolve(false) }
                    .buttonStyle(.bordered)
                Spacer()
                Button("Approve") { onResolve(true) }
                    .buttonStyle(.borderedProminent)
            }
            .padding(.top, 8)
        }
        .padding(20)
        .frame(width: 420)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// Reuse the existing WebPreview (from artifacts view) for the live preview surface.
private struct WebPreview: NSViewRepresentable {
    let url: URL
    func makeNSView(context: Context) -> WKWebView { WKWebView() }
    func updateNSView(_ webView: WKWebView, context: Context) {
        if webView.url != url { webView.load(URLRequest(url: url)) }
    }
}