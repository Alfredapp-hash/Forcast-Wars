import SwiftUI

struct ReplayView: View {
    let daemonClient: DaemonClient
    let missionId: String?

    @State private var events: [ArkheEvent] = []
    @State private var selectedStep = 0
    @State private var isLoading = false
    @State private var screenshotPath: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
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
    }

    private var header: some View {
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
                Text("Step \(selectedStep + 1) / \(events.count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Button("Previous") { selectedStep = max(0, selectedStep - 1) }
                    .disabled(selectedStep == 0)
                Button("Next") { selectedStep = min(events.count - 1, selectedStep + 1) }
                    .disabled(selectedStep >= events.count - 1)
            }
        }
        .padding()
    }

    private var stepList: some View {
        List(Array(events.enumerated()), id: \.element.id) { index, event in
            Button {
                selectedStep = index
            } label: {
                VStack(alignment: .leading, spacing: 2) {
                    Text(event.eventType)
                        .font(.caption.monospaced())
                    Text(eventSummary(event))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
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

                    Text(eventSummary(event))
                        .font(.body)

                    if let url = event.payload.url {
                        LabeledContent("URL", value: url)
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
        daemonClient.replayMission(missionId: missionId) { id, replayEvents in
            guard id == missionId else { return }
            events = replayEvents.sorted { $0.ts < $1.ts }
            selectedStep = 0
            isLoading = false
            updateScreenshot()
        }
    }

    private func updateScreenshot() {
        guard let missionId else { return }
        let path = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".arkhe/artifacts/\(missionId)/page.png")
        screenshotPath = FileManager.default.fileExists(atPath: path.path) ? path.path : nil
    }

    private func eventSummary(_ event: ArkheEvent) -> String {
        let p = event.payload
        if let msg = p.message { return msg }
        if let title = p.title { return title }
        if let summary = p.summary { return summary }
        if let url = p.url { return url }
        if let tool = p.toolName { return tool }
        if let reason = p.reason { return reason }
        return event.eventType
    }
}
