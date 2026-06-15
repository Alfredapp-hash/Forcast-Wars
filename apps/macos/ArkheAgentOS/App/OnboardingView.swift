import SwiftUI

struct OnboardingView: View {
    let daemonClient: DaemonClient
    let daemonConnected: Bool
    let daemonLaunchOutcome: DaemonLaunchOutcome?
    let complete: () -> Void

    @State private var health: HealthStatus?
    @State private var attention: AttentionConfigModel?
    @State private var pollTask: Task<Void, Never>?

    private var daemonReady: Bool {
        daemonConnected && health?.status == "ok" && (daemonLaunchOutcome?.isHealthy ?? true)
    }

    private var ollamaReady: Bool {
        health?.ollama == "ok"
    }

    private var youtubeReady: Bool {
        attention?.youtubeApiKeyConfigured == true
    }

    private var playwrightReady: Bool {
        health?.playwright == "ok"
    }

    private var appleFmReady: Bool {
        if FoundationModelService.isAvailable { return true }
        if let fm = health?.appleFoundation {
            return fm == "ok"
        }
        return false
    }

    private var allChecksPassed: Bool {
        daemonReady && ollamaReady && youtubeReady && playwrightReady
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Welcome to Arkhe AgentOS")
                    .font(.largeTitle.bold())
                Text("Model readiness checklist before Mission Control.")
                    .foregroundStyle(.secondary)
            }

            if allChecksPassed {
                completionBanner
            }

            if let launch = daemonLaunchOutcome, !launch.isHealthy {
                StatusBanner(
                    severity: .warning,
                    title: "Daemon launch needs attention",
                    message: "\(launch.userMessage) \(recoveryHint(for: launch))"
                )
            }

            VStack(alignment: .leading, spacing: 14) {
                sectionHeader("Required")
                readinessRow(
                    title: "Daemon connected",
                    detail: daemonDetail,
                    ok: daemonReady,
                    optional: false
                )

                sectionHeader("Model readiness")
                readinessRow(
                    title: "Ollama (Layer 2)",
                    detail: ollamaDetail,
                    ok: ollamaReady,
                    optional: false
                )
                readinessRow(
                    title: "YouTube API key",
                    detail: youtubeDetail,
                    ok: youtubeReady,
                    optional: false
                )
                readinessRow(
                    title: "Playwright browser",
                    detail: playwrightDetail,
                    ok: playwrightReady,
                    optional: false
                )
                readinessRow(
                    title: "Apple Foundation Models",
                    detail: appleFmDetail,
                    ok: appleFmReady,
                    optional: true
                )
            }

            HStack {
                Button("Recheck") { refresh() }
                Spacer()
                if allChecksPassed {
                    Button("Launch Mission Control") { complete() }
                        .buttonStyle(.borderedProminent)
                        .keyboardShortcut(.defaultAction)
                } else {
                    Button(daemonReady ? "Continue anyway" : "Waiting for daemon…") {
                        if daemonReady { complete() }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(!daemonReady)
                }
            }
        }
        .padding(28)
        .frame(width: 580)
        .onAppear {
            refresh()
            startPolling()
        }
        .onDisappear {
            pollTask?.cancel()
        }
    }

    private var completionBanner: some View {
        HStack(spacing: 14) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 32))
                .foregroundStyle(Color.arkheSuccess)
                .symbolEffect(.pulse, options: .repeating.speed(0.35))

            VStack(alignment: .leading, spacing: 4) {
                Text("All systems ready")
                    .font(.title3.bold())
                Text("Daemon, models, attention cortex, and browser runtime are online. Your Neural Mesh is ready to grow.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.arkheSuccess.opacity(0.1))
        .overlay(ArkheSurface.bannerBorder(Color.arkheSuccess))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .transition(.opacity.combined(with: .scale(scale: 0.98)))
        .animation(.spring(duration: 0.45), value: allChecksPassed)
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title.uppercased())
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
    }

    private var daemonDetail: String {
        if let health {
            var parts = ["ws://127.0.0.1:9470 · \(health.status.uppercased())"]
            if let launch = daemonLaunchOutcome, launch.isHealthy {
                parts.append(launch.userMessage)
            }
            return parts.joined(separator: " · ")
        }
        if let launch = daemonLaunchOutcome {
            return launch.userMessage
        }
        return daemonConnected ? "Waiting for health…" : "Starting local control plane…"
    }

    private var ollamaDetail: String {
        switch health?.ollama {
        case "ok":
            return "Ollama reachable at 127.0.0.1:11434"
        case "unavailable":
            return "Start Ollama and pull qwen3:8b / nomic-embed-text for Layer 2 routing."
        case "degraded":
            return "Ollama probe inconclusive — local models may be slow to start."
        default:
            return "Checking Ollama probe…"
        }
    }

    private var youtubeDetail: String {
        if youtubeReady {
            return "Configured in ~/.arkhe/attention-config.json"
        }
        return "Add key in Settings → Attention Cortex / YouTube"
    }

    private var playwrightDetail: String {
        switch health?.playwright {
        case "ok":
            return "Chromium probe succeeded — browser missions ready."
        case "unavailable":
            return "Run `npx playwright install chromium` in the daemon environment."
        case "degraded":
            return "Probe pending or inconclusive until Chromium is installed."
        case "disabled":
            return "Browser runtime not configured in this daemon build."
        default:
            return "Waiting for daemon health check…"
        }
    }

    private var appleFmDetail: String {
        if appleFmReady {
            return "On-device Layer 1 available"
        }
        return "Optional — macOS 26+ with Apple Intelligence"
    }

    private func recoveryHint(for launch: DaemonLaunchOutcome) -> String {
        switch launch {
        case .entryNotFound:
            return "Dev: export ARKHE_REPO_ROOT and run pnpm dev:daemon. Release: run pnpm bundle:daemon before packaging."
        case .startFailed:
            return "Check Console.app for [DaemonLauncher] logs. Ensure Node 22+ is installed."
        case .startedButUnreachable:
            return "Process may still be booting. Tap Recheck or run pnpm dev:daemon manually."
        default:
            return ""
        }
    }

    private func readinessRow(title: String, detail: String, ok: Bool, optional: Bool) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: ok ? "checkmark.circle.fill" : (optional ? "circle.dashed" : "exclamationmark.triangle.fill"))
                .foregroundStyle(ok ? Color.arkheSuccess : (optional ? Color.secondary : Color.arkheWarning))
                .font(.title3)
                .contentTransition(.symbolEffect(.replace))

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(title)
                        .font(.headline)
                    if optional {
                        Text("optional")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 1)
                            .background(.quaternary)
                            .clipShape(Capsule())
                    }
                }
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: ok)
    }

    private func refresh() {
        daemonClient.requestHealth { status in
            health = status
        }
        daemonClient.requestAttentionConfig { config in
            attention = config
        }
    }

    private func startPolling() {
        pollTask?.cancel()
        pollTask = Task { @MainActor in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(3))
                guard !Task.isCancelled else { break }
                refresh()
            }
        }
    }
}
