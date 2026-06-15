import SwiftUI
import WebKit

// MARK: - ResidentsView

/// Entry point for the Arkhe DNA tab (sidebar: "Arkhe DNA").
struct ResidentsView: View {
    @Environment(AppState.self) private var appState
    let daemonClient: DaemonClient
    @Bindable var store: ResidentsStore

    private enum DNAMode: String, CaseIterable {
        case helix    = "DNA Helix"
        case residents = "Residents"
    }
    @State private var mode: DNAMode = .helix

    var body: some View {
        VStack(spacing: 0) {
            // ── Mode toggle header ───────────────────────────────────────
            HStack(spacing: 12) {
                Image(systemName: "waveform.path.ecg")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.cyan)

                Text("Arkhe DNA")
                    .font(.system(size: 13, weight: .black))
                    .foregroundStyle(.primary)

                Spacer()

                Picker("", selection: $mode) {
                    ForEach(DNAMode.allCases, id: \.self) { m in
                        Text(m.rawValue).tag(m)
                    }
                }
                .pickerStyle(.segmented)
                .frame(width: 220)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(.ultraThinMaterial)

            Divider()

            // ── Content ─────────────────────────────────────────────────
            switch mode {
            case .helix:
                AgentDNAWebPanel()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)

            case .residents:
                ArkheDNAInterfaceView(daemonClient: daemonClient, store: store)
                    .onAppear {
                        daemonClient.onExpertUpdated = { expert in
                            store.applyUpdate(expert)
                        }
                    }
            }
        }
    }
}

// MARK: - Agent DNA Web Panel (WKWebView embed)

private struct AgentDNAWebPanel: NSViewRepresentable {
    // Local Next.js dev server — update to deployed URL when available
    private static let helixURL = URL(string: "http://localhost:3000/agent-dna-demo")!

    func makeNSView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        // Allow local http:// connections (localhost is ATS-exempt on macOS)
        let wv = WKWebView(frame: .zero, configuration: cfg)
        wv.load(URLRequest(url: Self.helixURL))
        return wv
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        // Reload only if the view somehow got a blank URL (e.g. tab reuse)
        if webView.url == nil {
            webView.load(URLRequest(url: Self.helixURL))
        }
    }
}

// MARK: - Shared row components (resident list in Settings / future surfaces)

struct StatusChip: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.bold())
                .foregroundStyle(color)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct ResidentExpertRow: View {
    let expert: ResidentExpertRecord
    let toggle: () -> Void

    var body: some View {
        HStack {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)
            VStack(alignment: .leading, spacing: 2) {
                Text(expert.role)
                    .font(.headline)
                Text("\(expert.specialty) · L\(expert.preferredLayer) · \(modelLabel)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button(expert.status == "dormant" ? "Wake" : "Sleep", action: toggle)
                .controlSize(.small)
        }
        .padding(.vertical, 4)
    }

    private var statusColor: Color {
        switch expert.status {
        case "active", "busy": return .green
        case "dormant": return .secondary
        default: return .orange
        }
    }

    private var modelLabel: String {
        if expert.preferredModel.contains("ollama") { return "Ollama" }
        if expert.preferredModel.contains("apple") { return "Apple FM" }
        return expert.preferredModel
    }
}

struct SynapseRow: View {
    let synapse: AgentSynapseRecord

    var body: some View {
        HStack {
            Text("\(synapse.sourceRole) → \(synapse.targetRole)")
                .font(.caption)
            Spacer()
            Text(String(format: "%.2f", synapse.weight))
                .font(.caption.monospaced())
                .foregroundStyle(synapse.trusted ? .yellow : .secondary)
        }
    }
}
