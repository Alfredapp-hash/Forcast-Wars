import SwiftUI
import UniformTypeIdentifiers

struct MemoryView: View {
    let daemonClient: DaemonClient

    @State private var query = ""
    @State private var results: [ArkheEvent] = []
    @State private var vaultResults: [VaultMemoryRecord] = []
    @State private var isSearching = false
    @State private var exportMessage: String?
    @State private var searchMode: MemorySearchMode = .local

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Memory")
                .font(.largeTitle.bold())
                .padding(.horizontal)

            HStack {
                Picker("", selection: $searchMode) {
                    Text("Local Events").tag(MemorySearchMode.local)
                    Text("Ark Vault").tag(MemorySearchMode.vault)
                }
                .pickerStyle(.segmented)
                .frame(width: 220)

                TextField(searchMode == .local ? "Search events…" : "Search Ark Vault…", text: $query)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit { search() }
                Button("Search") { search() }
                    .disabled(query.trimmingCharacters(in: .whitespaces).isEmpty)
                Button("Export Audit") { exportAudit() }
                    .buttonStyle(.bordered)
            }
            .padding(.horizontal)

            if let exportMessage {
                Text(exportMessage)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
            }

            if isSearching {
                ProgressView("Searching…")
                    .padding()
            } else if searchMode == .local && results.isEmpty {
                ContentUnavailableView(
                    "Search local memory",
                    systemImage: "brain",
                    description: Text("Events are stored in ~/.arkhe/events.json")
                )
            } else if searchMode == .vault && vaultResults.isEmpty {
                ContentUnavailableView(
                    "Search Ark Vault",
                    systemImage: "sparkle.magnifyingglass",
                    description: Text("Semantic memory is stored in Ark-playground Supabase.")
                )
            } else if searchMode == .local {
                List(results) { event in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(event.eventType)
                                .font(.caption.monospaced())
                            Spacer()
                            Text(String(event.ts.prefix(19)))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Text(memorySummary(event))
                            .font(.subheadline)
                            .lineLimit(2)
                        if let missionId = event.missionId {
                            Text(missionId)
                                .font(.caption2.monospaced())
                                .foregroundStyle(.tertiary)
                        }
                    }
                    .padding(.vertical, 2)
                }
            } else {
                List(vaultResults) { memory in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(memory.memoryType)
                                .font(.caption.monospaced())
                            Spacer()
                            Text(String(memory.createdAt.prefix(19)))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Text(memory.content)
                            .font(.subheadline)
                            .lineLimit(3)
                        HStack {
                            Text(memory.agentId)
                            if let missionId = memory.missionId {
                                Text(missionId)
                            }
                        }
                        .font(.caption2.monospaced())
                        .foregroundStyle(.tertiary)
                    }
                    .padding(.vertical, 2)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func search() {
        let q = query.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return }
        isSearching = true
        if searchMode == .local {
            daemonClient.searchMemory(query: q) { events in
                results = events.reversed()
                isSearching = false
            }
        } else {
            daemonClient.searchVault(query: q) { memories in
                vaultResults = memories
                isSearching = false
            }
        }
    }

    private func exportAudit() {
        exportMessage = "Exporting…"
        daemonClient.exportAudit { events in
            saveAudit(events)
        }
    }

    private func saveAudit(_ events: [ArkheEvent]) {
        let panel = NSSavePanel()
        panel.title = "Export Audit Package"
        panel.nameFieldStringValue = "arkhe-audit-\(ISO8601DateFormatter().string(from: Date()).prefix(10)).json"
        panel.allowedContentTypes = [.json]

        guard panel.runModal() == .OK, let url = panel.url else {
            exportMessage = "Export cancelled"
            return
        }

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? encoder.encode(events) else {
            exportMessage = "Failed to encode audit"
            return
        }

        do {
            try data.write(to: url)
            exportMessage = "Exported \(events.count) events to \(url.lastPathComponent)"
        } catch {
            exportMessage = "Export failed: \(error.localizedDescription)"
        }
    }

    private func memorySummary(_ event: ArkheEvent) -> String {
        let p = event.payload
        if let msg = p.message { return msg }
        if let title = p.title { return title }
        if let summary = p.summary { return summary }
        if let transcript = p.transcript { return transcript }
        if let url = p.url { return url }
        return event.displayAgent
    }
}

enum MemorySearchMode {
    case local
    case vault
}
