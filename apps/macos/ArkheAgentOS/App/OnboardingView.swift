import SwiftUI

struct OnboardingView: View {
    let daemonClient: DaemonClient
    let complete: () -> Void

    @State private var health: HealthStatus?
    @State private var supabase: SupabaseStatusModel?

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Welcome to Arkhe AgentOS")
                    .font(.largeTitle.bold())
                Text("A quick alpha readiness check before Mission Control.")
                    .foregroundStyle(.secondary)
            }

            readinessRow(
                title: "Daemon",
                detail: health?.status.uppercased() ?? "Checking ws://127.0.0.1:9470",
                ok: health?.status == "ok"
            )

            readinessRow(
                title: "Supabase Ark-playground",
                detail: supabase?.connected == true ? "Synced" : "Configured in ~/.arkhe/daemon.env or .env",
                ok: supabase?.connected == true
            )

            readinessRow(
                title: "Voice",
                detail: "Apple Speech is requested on launch. Apple FM requires macOS 26+.",
                ok: true
            )

            readinessRow(
                title: "Local Models",
                detail: "Optional: run Ollama and pull qwen3:8b / nomic-embed-text.",
                ok: true
            )

            HStack {
                Button("Recheck") {
                    refresh()
                }
                Spacer()
                Button("Enter Mission Control") {
                    complete()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(28)
        .frame(width: 560)
        .onAppear { refresh() }
    }

    private func readinessRow(title: String, detail: String, ok: Bool) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: ok ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                .foregroundStyle(ok ? .green : .orange)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func refresh() {
        daemonClient.requestHealth { status in
            health = status
        }
        daemonClient.requestSupabaseStatus { status in
            supabase = status
        }
    }
}
