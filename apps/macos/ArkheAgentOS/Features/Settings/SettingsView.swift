import SwiftUI

struct SettingsView: View {
    let daemonClient: DaemonClient

    @AppStorage("arkhe.voiceSource") private var voiceSource = "apple"
    @AppStorage("arkhe.defaultBudgetUsd") private var defaultBudgetUsd = 5.0
    @AppStorage("arkhe.maxMissionBudgetUsd") private var maxMissionBudgetUsd = 25.0
    @AppStorage("arkhe.paidCloudEnabled") private var paidCloudEnabled = false
    @AppStorage("arkhe.autoApproveHint") private var autoApproveHint = false
    @State private var settingsStatus = "Not synced"

    var body: some View {
        Form {
            Section("Voice") {
                Picker("Speech provider", selection: $voiceSource) {
                    Text("Apple Speech").tag("apple")
                    Text("Whisper (coming soon)").tag("whisper")
                }
                Text("Voice commands are sent to the Director with source \"voice\".")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section("Economics") {
                Stepper(value: $defaultBudgetUsd, in: 1...50, step: 1) {
                    Text("Default per-agent budget: $\(Int(defaultBudgetUsd))")
                }
                Stepper(value: $maxMissionBudgetUsd, in: 1...250, step: 5) {
                    Text("Max mission budget: $\(Int(maxMissionBudgetUsd))")
                }
                Toggle("Allow paid cloud escalation", isOn: $paidCloudEnabled)
                Button("Apply Budget & Cloud Gates") {
                    daemonClient.updateRuntimeSettings(
                        defaultBudgetUsd: defaultBudgetUsd,
                        maxMissionBudgetUsd: maxMissionBudgetUsd,
                        paidCloudEnabled: paidCloudEnabled
                    ) { settings in
                        defaultBudgetUsd = settings.defaultBudgetUsd
                        maxMissionBudgetUsd = settings.maxMissionBudgetUsd
                        paidCloudEnabled = settings.paidCloudEnabled
                        settingsStatus = settings.paidCloudEnabled ? "Cloud allowed" : "Cloud blocked"
                    }
                }
                Text("Budget caps are enforced by the Director during mission planning. Paid cloud stays blocked unless enabled here and configured in the daemon.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(settingsStatus)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Section("Safety") {
                Toggle("Show auto-approve dev hint", isOn: $autoApproveHint)
                if autoApproveHint {
                    Text("Set ARKHE_AUTO_APPROVE=1 on the daemon for smoke tests. Production missions require manual approval for orange actions.")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }
            }

            Section("Daemon") {
                LabeledContent("WebSocket", value: "ws://127.0.0.1:9470")
                LabeledContent("Data", value: "~/.arkhe")
                LabeledContent("Memory", value: "~/.arkhe/events.json")
                LabeledContent("Artifacts", value: "~/.arkhe/artifacts")
                Button("Request Health Check") {
                    daemonClient.requestHealth()
                }
            }

            Section("Supabase Memory") {
                LabeledContent("Project", value: SupabaseConfig.url)
                LabeledContent("Workspace", value: SupabaseConfig.workspaceId)
                LabeledContent("Publishable key", value: "Configured")
                Text("Daemon sync uses SUPABASE_SECRET_KEY in .env (never stored in app).")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Button("Check Sync Status") {
                    daemonClient.requestSupabaseStatus { status in
                        print("[Settings] Supabase enabled=\(status.enabled) connected=\(status.connected)")
                    }
                }
            }

            Section("Danger Zone") {
                Button("Kill Switch", role: .destructive) {
                    daemonClient.sendKillSwitch()
                }
            }
        }
        .formStyle(.grouped)
        .navigationTitle("Settings")
        .onAppear {
            daemonClient.requestRuntimeSettings { settings in
                defaultBudgetUsd = settings.defaultBudgetUsd
                maxMissionBudgetUsd = settings.maxMissionBudgetUsd
                paidCloudEnabled = settings.paidCloudEnabled
                settingsStatus = "Loaded from daemon"
            }
        }
    }
}