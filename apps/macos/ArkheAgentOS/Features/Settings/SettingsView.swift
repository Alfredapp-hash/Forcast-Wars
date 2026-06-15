import SwiftUI

struct SettingsView: View {
    let daemonClient: DaemonClient

    @AppStorage("arkhe.voiceSource") private var voiceSource = "apple"
    @AppStorage("arkhe.defaultBudgetUsd") private var defaultBudgetUsd = 5.0
    @AppStorage("arkhe.maxMissionBudgetUsd") private var maxMissionBudgetUsd = 25.0
    @AppStorage("arkhe.paidCloudEnabled") private var paidCloudEnabled = false
    @AppStorage("arkhe.autoApproveHint") private var autoApproveHint = false
    @State private var settingsStatus = "Not synced"
    @State private var youtubeApiKeyInput = ""
    @State private var youtubeRefreshTokenInput = ""
    @State private var youtubeTrendQuery = "AI agents automation"
    @State private var youtubeApiKeyConfigured = false
    @State private var youtubeApiKeyMasked: String?
    @State private var youtubeRefreshTokenConfigured = false
    @State private var youtubeRefreshTokenMasked: String?
    @State private var youtubeLastPollAt: String?
    @State private var youtubeLastPollOk: Bool?
    @State private var xBearerTokenInput = ""
    @State private var xTrendQuery = "AI agents OR local automation lang:en -is:retweet"
    @State private var xBearerTokenConfigured = false
    @State private var xBearerTokenMasked: String?
    @State private var xLastPollAt: String?
    @State private var xLastPollOk: Bool?
    @State private var attentionConfigStatus = "Not loaded"
    @State private var documentaryEnabled = false
    @State private var documentaryPublishingMode = "shadow"
    @State private var documentaryQualityThreshold = 72
    @State private var documentaryPipelineBudgetUsd = 8.0
    @State private var documentaryLastRunAt: String?
    @State private var documentaryLastStatus = "idle"
    @State private var documentarySustainabilityScore = 0
    @State private var documentarySustainabilitySummary = "Not loaded"
    @State private var documentaryConfigStatus = "Not loaded"

    var body: some View {
        Form {
            Section("Voice") {
                Picker("Speech provider", selection: $voiceSource) {
                    Text("Apple Speech").tag("apple")
                }
                Text("Voice commands use Apple Speech on macOS and are sent to the Director with source \"voice\". Local Whisper support is planned for a future release.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section("About Arkhe AgentOS") {
                Text("DNA for agents. Synapses for relationships. A native macOS brain that sees your organization think — and the Attention Cortex that manufactures attention while you sleep.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
                Text("Private alpha — see docs/LANDING_COPY.md for tier details.")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }

            Section("Economics") {
                LabeledContent("Tier (alpha)", value: paidCloudEnabled ? "Pro posture" : "Local (default)")
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
                Text("Local tier: Ollama + Apple FM, local vault, manual missions — cloud off. Pro (planned): cloud escalation within these caps, Ark Vault sync, Attention publish adapters. Enterprise (planned): air-gapped, SSO, audit automation.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
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

            Section("Self-Documentary") {
                Toggle("Enable autonomous pipeline", isOn: $documentaryEnabled)
                Picker("Publishing mode", selection: $documentaryPublishingMode) {
                    Text("Shadow (no publish)").tag("shadow")
                    Text("Supervised (approval)").tag("supervised")
                    Text("Autonomous").tag("autonomous")
                }
                Stepper(value: $documentaryQualityThreshold, in: 50...95, step: 1) {
                    Text("Quality threshold: \(documentaryQualityThreshold)")
                }
                Stepper(value: $documentaryPipelineBudgetUsd, in: 1...50, step: 1) {
                    Text("Per-run budget: $\(Int(documentaryPipelineBudgetUsd))")
                }
                LabeledContent("Last pipeline run", value: documentaryLastRunLabel)
                LabeledContent("Sustainability score", value: "\(documentarySustainabilityScore)/100")
                Text(documentarySustainabilitySummary)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Button("Save Documentary Settings") {
                    daemonClient.updateDocumentaryConfig(
                        enabled: documentaryEnabled,
                        publishingMode: documentaryPublishingMode,
                        qualityThreshold: documentaryQualityThreshold,
                        pipelineBudgetUsd: documentaryPipelineBudgetUsd
                    ) { config, status in
                        applyDocumentaryConfig(config, status)
                        documentaryConfigStatus = "Saved to ~/.arkhe/documentary-config.json"
                    }
                }
                Button("Run Pipeline Now (stub)") {
                    daemonClient.triggerDocumentaryRun(force: !documentaryEnabled)
                }
                Text("Self-Documentary: OS documenting its own development. Shadow mode emits events without publish. Config: ~/.arkhe/documentary-config.json — example in apps/local-daemon/config/.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(documentaryConfigStatus)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Section("Attention Cortex / YouTube") {
                SecureField(
                    youtubeApiKeyConfigured ? "API key (leave blank to keep \(youtubeApiKeyMasked ?? "configured"))" : "YouTube Data API key",
                    text: $youtubeApiKeyInput
                )
                SecureField(
                    youtubeRefreshTokenConfigured ? "OAuth refresh token (leave blank to keep \(youtubeRefreshTokenMasked ?? "configured"))" : "YouTube OAuth refresh token",
                    text: $youtubeRefreshTokenInput
                )
                TextField("Trend search query", text: $youtubeTrendQuery)

                HStack {
                    Circle()
                        .fill(youtubeStatusColor)
                        .frame(width: 8, height: 8)
                    Text(youtubeStatusLabel)
                        .font(.caption)
                }

                Button("Save YouTube Settings") {
                    let keyToSend = youtubeApiKeyInput.trimmingCharacters(in: .whitespacesAndNewlines)
                    let refreshToSend = youtubeRefreshTokenInput.trimmingCharacters(in: .whitespacesAndNewlines)
                    daemonClient.updateAttentionConfig(
                        youtubeApiKey: keyToSend.isEmpty ? nil : keyToSend,
                        youtubeTrendQuery: youtubeTrendQuery,
                        youtubeRefreshToken: refreshToSend.isEmpty ? nil : refreshToSend
                    ) { config in
                        applyAttentionConfig(config)
                        youtubeApiKeyInput = ""
                        youtubeRefreshTokenInput = ""
                        attentionConfigStatus = "Saved to ~/.arkhe/attention-config.json"
                    }
                }

                Link("Get a YouTube Data API v3 key (Google Cloud Console)", destination: URL(string: "https://console.cloud.google.com/apis/library/youtube.googleapis.com")!)

                Text("API key powers trend polling. OAuth refresh token + YOUTUBE_CLIENT_ID/SECRET in .env power publish scaffold. Secrets persist in ~/.arkhe/attention-config.json — never in the app bundle.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section("Attention Cortex / X") {
                SecureField(
                    xBearerTokenConfigured ? "Bearer token (leave blank to keep \(xBearerTokenMasked ?? "configured"))" : "X API v2 bearer token",
                    text: $xBearerTokenInput
                )
                TextField("Recent search query", text: $xTrendQuery)

                HStack {
                    Circle()
                        .fill(xStatusColor)
                        .frame(width: 8, height: 8)
                    Text(xStatusLabel)
                        .font(.caption)
                }

                Button("Save X Settings") {
                    let tokenToSend = xBearerTokenInput.trimmingCharacters(in: .whitespacesAndNewlines)
                    daemonClient.updateAttentionConfig(
                        xBearerToken: tokenToSend.isEmpty ? nil : tokenToSend,
                        xTrendQuery: xTrendQuery
                    ) { config in
                        applyAttentionConfig(config)
                        xBearerTokenInput = ""
                        attentionConfigStatus = "Saved to ~/.arkhe/attention-config.json"
                    }
                }

                Link("Get an X API bearer token (Developer Portal)", destination: URL(string: "https://developer.x.com/en/portal/dashboard")!)

                Text("Bearer token is stored in ~/.arkhe/attention-config.json on the daemon host. Settings override X_BEARER_TOKEN in .env when saved.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(attentionConfigStatus)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Section("Support & Feedback") {
                Link("Send Feedback (Email)", destination: SupportConfig.mailtoURL)
                Link("Report an Issue (GitHub)", destination: SupportConfig.feedbackIssuesURL)
                Link("Privacy Policy", destination: SupportConfig.privacyPolicyURL)
                Text("Email defaults to \(SupportConfig.supportEmail). Override with ARKHE_SUPPORT_EMAIL, ARKHE_FEEDBACK_URL, or ARKHE_PRIVACY_URL on the daemon host for dev builds.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
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
            daemonClient.requestAttentionConfig { config in
                applyAttentionConfig(config)
                attentionConfigStatus = "Loaded from daemon"
            }
            daemonClient.requestDocumentaryConfig { config, status in
                applyDocumentaryConfig(config, status)
                documentaryConfigStatus = "Loaded from daemon"
            }
        }
    }

    private func applyDocumentaryConfig(_ config: DocumentaryConfigModel, _ status: DocumentaryStatusModel?) {
        documentaryEnabled = config.enabled
        documentaryPublishingMode = config.publishingMode
        documentaryQualityThreshold = config.qualityThreshold
        documentaryPipelineBudgetUsd = config.pipelineBudgetUsd
        documentaryLastRunAt = config.lastPipelineRunAt
        documentaryLastStatus = config.lastPipelineStatus
        if let sustainability = status?.sustainability {
            documentarySustainabilityScore = sustainability.readinessScore
            documentarySustainabilitySummary = sustainability.summary
        }
    }

    private var documentaryLastRunLabel: String {
        if let at = documentaryLastRunAt {
            return "\(documentaryLastStatus) — \(at.prefix(19))"
        }
        return documentaryLastStatus
    }

    private func applyAttentionConfig(_ config: AttentionConfigModel) {
        youtubeApiKeyConfigured = config.youtubeApiKeyConfigured
        youtubeApiKeyMasked = config.youtubeApiKeyMasked
        youtubeRefreshTokenConfigured = config.youtubeRefreshTokenConfigured
        youtubeRefreshTokenMasked = config.youtubeRefreshTokenMasked
        youtubeTrendQuery = config.youtubeTrendQuery
        youtubeLastPollAt = config.lastPollAt
        youtubeLastPollOk = config.lastPollOk
        xBearerTokenConfigured = config.xBearerTokenConfigured
        xBearerTokenMasked = config.xBearerTokenMasked
        xTrendQuery = config.xTrendQuery
        xLastPollAt = config.xLastPollAt
        xLastPollOk = config.xLastPollOk
    }

    private var youtubeStatusLabel: String {
        if !youtubeApiKeyConfigured {
            return "Not configured — trend polling uses curated fallback"
        }
        if let ok = youtubeLastPollOk {
            let when = youtubeLastPollAt.map { " (\($0.prefix(19)))" } ?? ""
            return ok ? "Configured — last poll succeeded\(when)" : "Configured — last poll failed\(when)"
        }
        return "Configured — no poll yet"
    }

    private var youtubeStatusColor: Color {
        if !youtubeApiKeyConfigured { return .orange }
        if youtubeLastPollOk == true { return .green }
        if youtubeLastPollOk == false { return .red }
        return .yellow
    }

    private var xStatusLabel: String {
        if !xBearerTokenConfigured {
            return "Not configured — trend polling uses curated fallback"
        }
        if let ok = xLastPollOk {
            let when = xLastPollAt.map { " (\($0.prefix(19)))" } ?? ""
            return ok ? "Configured — last poll succeeded\(when)" : "Configured — last poll failed\(when)"
        }
        return "Configured — no poll yet"
    }

    private var xStatusColor: Color {
        if !xBearerTokenConfigured { return .orange }
        if xLastPollOk == true { return .green }
        if xLastPollOk == false { return .red }
        return .yellow
    }
}
