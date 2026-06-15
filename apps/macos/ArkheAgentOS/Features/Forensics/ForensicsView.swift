import SwiftUI
import UniformTypeIdentifiers

struct ForensicsView: View {
    @Environment(AppState.self) private var appState
    let context: ForensicsContext

    @State private var exportMessage: String?
    @State private var selectedEvidenceId: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    questionSection
                    evidenceSection
                    if let focus = context.focusEvent {
                        payloadSection(focus)
                    }
                    if let exportMessage {
                        Text(exportMessage)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
            }
        }
        .frame(minWidth: 520, minHeight: 480)
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(context.title)
                    .font(.title2.bold())
                if let missionId = context.missionId {
                    Text(missionId)
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            if let missionId = context.missionId {
                Button("View in Replay") {
                    appState.openReplay(missionId: missionId, focusEventId: context.focusEvent?.id)
                    appState.dismissForensics()
                }
            }
            Button("Export Evidence") { exportEvidence() }
                .buttonStyle(.borderedProminent)
            Button("Done") { appState.dismissForensics() }
        }
        .padding()
    }

    private var questionSection: some View {
        GroupBox("Question") {
            Text(context.question)
                .font(.body)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var evidenceSection: some View {
        GroupBox("Evidence chain (\(context.evidenceChain.count) steps)") {
            VStack(alignment: .leading, spacing: 8) {
                ForEach(Array(context.evidenceChain.enumerated()), id: \.element.id) { index, event in
                    Button {
                        selectedEvidenceId = event.id
                    } label: {
                        HStack(alignment: .top, spacing: 8) {
                            marker(for: event)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(ForensicsHelper.evidenceSummary(event, index: index + 1))
                                    .font(.subheadline)
                                    .multilineTextAlignment(.leading)
                                Text(String(event.ts.prefix(19)))
                                    .font(.caption2.monospaced())
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            if context.focusEvent?.id == event.id {
                                Text("FOCUS")
                                    .font(.caption2.bold())
                                    .foregroundStyle(.orange)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                    .padding(8)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(selectedEvidenceId == event.id ? Color.accentColor.opacity(0.1) : Color.clear)
                    )

                    if selectedEvidenceId == event.id {
                        Text(ForensicsHelper.narrateStep(event))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(.leading, 28)
                    }
                }
            }
        }
    }

    private func payloadSection(_ event: ArkheEvent) -> some View {
        GroupBox("Focus event payload") {
            ScrollView(.horizontal, showsIndicators: false) {
                Text(ForensicsHelper.encodeEventJSON(event))
                    .font(.system(.caption, design: .monospaced))
                    .textSelection(.enabled)
            }
        }
    }

    @ViewBuilder
    private func marker(for event: ArkheEvent) -> some View {
        let color: Color = {
            if event.eventType.hasPrefix("approval.") { return .orange }
            if event.eventType.hasPrefix("browser.") { return .blue }
            if event.eventType.hasPrefix("model.") { return .purple }
            if event.eventType == "agent.message" { return .green }
            return .secondary
        }()
        Circle()
            .fill(color)
            .frame(width: 10, height: 10)
            .padding(.top, 4)
    }

    private func exportEvidence() {
        let panel = NSSavePanel()
        panel.title = "Export Evidence Package"
        let slug = context.missionId ?? "forensics"
        panel.nameFieldStringValue = "arkhe-evidence-\(slug)-\(ISO8601DateFormatter().string(from: Date()).prefix(10)).json"
        panel.allowedContentTypes = [.json]

        guard panel.runModal() == .OK, let url = panel.url else {
            exportMessage = "Export cancelled"
            return
        }

        guard let data = ForensicsHelper.encodeEvents(context.evidenceChain) else {
            exportMessage = "Failed to encode evidence"
            return
        }

        do {
            try data.write(to: url)
            exportMessage = "Exported \(context.evidenceChain.count) events to \(url.lastPathComponent)"
        } catch {
            exportMessage = "Export failed: \(error.localizedDescription)"
        }
    }
}
