import SwiftUI
import UniformTypeIdentifiers

struct ReplayView: View {
    @Environment(AppState.self) private var appState
    let daemonClient: DaemonClient
    let missionId: String?
    let focusEventId: String?

    @State private var events: [ArkheEvent] = []
    @State private var selectedStep = 0
    @State private var isLoading = false
    @State private var screenshotPath: String?
    @State private var educationalMode = false
    @State private var exportMessage: String?

    private var markers: [ReplayMarker] {
        events.enumerated().compactMap { index, event in
            ReplayMarker.from(event: event, stepIndex: index)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            if !events.isEmpty {
                timelineScrubber
                    .padding(.horizontal)
                    .padding(.bottom, 8)
            }
            Divider()

            if missionId == nil {
                ContentUnavailableView(
                    "Select a mission",
                    systemImage: "play.rectangle.on.rectangle",
                    description: Text("Open Replay from the Missions tab or Mission Control.")
                )
            } else if isLoading {
                ProgressView("Loading replay…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if events.isEmpty {
                ContentUnavailableView(
                    "No replay data",
                    systemImage: "doc.text.magnifyingglass",
                    description: Text("Events for this mission were not found in local memory.")
                )
            } else {
                HSplitView {
                    stepList
                        .frame(minWidth: 280, idealWidth: 320)
                    stepDetail
                }
            }
        }
        .onAppear { loadReplay() }
        .onChange(of: missionId) { _, _ in loadReplay() }
        .onChange(of: focusEventId) { _, _ in applyFocusEvent() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Replay")
                    .font(.largeTitle.bold())
                if let missionId {
                    Text(missionId)
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if !events.isEmpty {
                    Toggle("Educational", isOn: $educationalMode)
                        .toggleStyle(.switch)
                        .controlSize(.small)
                    Button("Export JSON") { exportMissionJSON() }
                    Button("Export PDF Summary") { exportPDFSummary() }
                    Button("Export Compliance Package") { exportCompliancePackage() }
                    Button("Forensics") { openForensicsForCurrentStep() }
                    Text("Step \(selectedStep + 1) / \(events.count)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Button("Previous") { selectedStep = max(0, selectedStep - 1) }
                        .disabled(selectedStep == 0)
                    Button("Next") { selectedStep = min(events.count - 1, selectedStep + 1) }
                        .disabled(selectedStep >= events.count - 1)
                }
            }
            if let exportMessage {
                Text(exportMessage)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
    }

    private var timelineScrubber: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                ForEach(markers) { marker in
                    Button {
                        selectedStep = marker.stepIndex
                    } label: {
                        Circle()
                            .fill(marker.color)
                            .frame(width: marker.stepIndex == selectedStep ? 10 : 7, height: marker.stepIndex == selectedStep ? 10 : 7)
                    }
                    .buttonStyle(.plain)
                    .help(marker.label)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Slider(
                value: Binding(
                    get: { Double(selectedStep) },
                    set: { selectedStep = Int($0.rounded()) }
                ),
                in: 0...Double(max(0, events.count - 1)),
                step: 1
            )
        }
    }

    private var stepList: some View {
        List(Array(events.enumerated()), id: \.element.id) { index, event in
            Button {
                selectedStep = index
            } label: {
                HStack(spacing: 8) {
                    if let marker = ReplayMarker.from(event: event, stepIndex: index) {
                        Circle()
                            .fill(marker.color)
                            .frame(width: 6, height: 6)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(event.eventType)
                            .font(.caption.monospaced())
                        Text(eventSummary(event))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
            }
            .buttonStyle(.plain)
            .listRowBackground(index == selectedStep ? Color.accentColor.opacity(0.12) : Color.clear)
        }
    }

    private var stepDetail: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if events.indices.contains(selectedStep) {
                    let event = events[selectedStep]
                    Group {
                        LabeledContent("Time", value: event.ts)
                        LabeledContent("Agent", value: event.displayAgent)
                        LabeledContent("Type", value: event.eventType)
                    }
                    .font(.subheadline)

                    Divider()

                    if educationalMode {
                        GroupBox("Narration") {
                            Text(ForensicsHelper.narrateStep(event))
                                .font(.body)
                        }
                    }

                    Text(eventSummary(event))
                        .font(.body)

                    if let url = event.payload.url {
                        LabeledContent("URL", value: url)
                    }

                    if let budget = event.payload.budgetUsedUsd {
                        LabeledContent("Budget used", value: String(format: "$%.2f", budget))
                    }

                    if let screenshot = screenshotPath, let image = NSImage(contentsOfFile: screenshot) {
                        Divider()
                        Text("Screenshot")
                            .font(.headline)
                        Image(nsImage: image)
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 400)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .onChange(of: selectedStep) { _, _ in updateScreenshot() }
    }

    private func loadReplay() {
        guard let missionId else {
            events = []
            return
        }
        isLoading = true
        exportMessage = nil
        daemonClient.replayMission(missionId: missionId) { id, replayEvents in
            guard id == missionId else { return }
            events = replayEvents.sorted { $0.ts < $1.ts }
            selectedStep = 0
            isLoading = false
            updateScreenshot()
            applyFocusEvent()
        }
    }

    private func applyFocusEvent() {
        guard let focusEventId,
              let idx = events.firstIndex(where: { $0.id == focusEventId }) else { return }
        selectedStep = idx
        updateScreenshot()
    }

    private func updateScreenshot() {
        guard let missionId else { return }
        let path = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".arkhe/artifacts/\(missionId)/page.png")
        screenshotPath = FileManager.default.fileExists(atPath: path.path) ? path.path : nil
    }

    private func openForensicsForCurrentStep() {
        guard events.indices.contains(selectedStep) else { return }
        let focus = events[selectedStep]
        appState.presentForensics(focusEvent: focus, allEvents: events)
    }

    private func exportMissionJSON() {
        let panel = NSSavePanel()
        panel.title = "Export Mission Replay"
        let slug = missionId ?? "mission"
        panel.nameFieldStringValue = "arkhe-replay-\(slug).json"
        panel.allowedContentTypes = [.json]

        guard panel.runModal() == .OK, let url = panel.url else {
            exportMessage = "Export cancelled"
            return
        }

        guard let data = ForensicsHelper.encodeEvents(events) else {
            exportMessage = "Failed to encode replay"
            return
        }

        do {
            try data.write(to: url)
            exportMessage = "Exported \(events.count) events"
        } catch {
            exportMessage = "Export failed: \(error.localizedDescription)"
        }
    }

    private func exportPDFSummary() {
        guard let missionId else {
            exportMessage = "No mission selected"
            return
        }

        let panel = NSSavePanel()
        panel.title = "Export Replay PDF Summary"
        panel.nameFieldStringValue = ReplayPDFExporter.defaultFilename(missionId: missionId)
        panel.allowedContentTypes = [.pdf]

        guard panel.runModal() == .OK, let url = panel.url else {
            exportMessage = "Export cancelled"
            return
        }

        do {
            try ReplayPDFExporter.export(missionId: missionId, events: events, to: url)
            exportMessage = "PDF summary saved — \(events.count) events"
        } catch {
            exportMessage = "PDF export failed: \(error.localizedDescription)"
        }
    }

    private func exportCompliancePackage() {
        guard let missionId else {
            exportMessage = "No mission selected"
            return
        }

        let panel = NSSavePanel()
        panel.title = "Export Compliance Package"
        panel.nameFieldStringValue = CompliancePackageExporter.defaultFilename(missionId: missionId)
        panel.allowedContentTypes = [UTType.zip]

        guard panel.runModal() == .OK, let url = panel.url else {
            exportMessage = "Export cancelled"
            return
        }

        do {
            try CompliancePackageExporter.export(missionId: missionId, events: events, to: url)
            let artifactDir = FileManager.default.homeDirectoryForCurrentUser
                .appendingPathComponent(".arkhe/artifacts/\(missionId)")
            let artifactCount = (try? FileManager.default.contentsOfDirectory(atPath: artifactDir.path).count) ?? 0
            exportMessage = "Compliance ZIP saved — \(events.count) events, \(artifactCount) artifacts"
        } catch {
            exportMessage = "Compliance export failed: \(error.localizedDescription)"
        }
    }

    private func eventSummary(_ event: ArkheEvent) -> String {
        ForensicsHelper.evidenceLine(event)
    }
}

struct ReplayMarker: Identifiable {
    let id: String
    let stepIndex: Int
    let color: Color
    let label: String

    static func from(event: ArkheEvent, stepIndex: Int) -> ReplayMarker? {
        let type = event.eventType
        if type.hasPrefix("approval.") {
            return ReplayMarker(
                id: event.id,
                stepIndex: stepIndex,
                color: .orange,
                label: "Approval: \(type)"
            )
        }
        if type.hasPrefix("model.route"), event.payload.budgetUsedUsd != nil || type.contains("completed") {
            return ReplayMarker(
                id: event.id,
                stepIndex: stepIndex,
                color: .purple,
                label: "Model route / cost"
            )
        }
        if event.payload.budgetUsedUsd != nil {
            return ReplayMarker(
                id: event.id,
                stepIndex: stepIndex,
                color: .yellow,
                label: "Budget update"
            )
        }
        if type.hasPrefix("browser.") {
            return ReplayMarker(
                id: event.id,
                stepIndex: stepIndex,
                color: .blue,
                label: type
            )
        }
        return nil
    }
}
