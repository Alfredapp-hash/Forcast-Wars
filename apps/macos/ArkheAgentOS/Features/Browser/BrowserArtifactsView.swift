import SwiftUI
import WebKit

struct BrowserArtifactsView: View {
    @State private var missions: [ArtifactMission] = []
    @State private var selectedMissionId: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Agent Browser")
                    .font(.largeTitle.bold())
                Spacer()
                Button("Refresh") { loadArtifacts() }
            }
            .padding(.horizontal)

            if missions.isEmpty {
                ContentUnavailableView(
                    "No browser captures",
                    systemImage: "globe",
                    description: Text("Playwright screenshots and DOM snapshots appear in ~/.arkhe/artifacts after browser missions.")
                )
            } else {
                HSplitView {
                    List(missions, selection: $selectedMissionId) { mission in
                        BrowserArtifactRow(mission: mission)
                            .tag(mission.id as String?)
                    }
                    .frame(minWidth: 340, idealWidth: 420)

                    if let selected = selectedMission {
                        BrowserPreview(mission: selected)
                    } else {
                        Text("Select a capture")
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .onAppear { loadArtifacts() }
    }

    private func loadArtifacts() {
        let root = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".arkhe/artifacts")

        guard let entries = try? FileManager.default.contentsOfDirectory(
            at: root,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: [.skipsHiddenFiles]
        ) else {
            missions = []
            return
        }

        missions = entries.compactMap { dir -> ArtifactMission? in
            guard (try? dir.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true else { return nil }
            let screenshotURL = dir.appendingPathComponent("page.png")
            let domURL = dir.appendingPathComponent("dom.json")
            var pageTitle: String?
            var pageURL: URL?
            if let data = try? Data(contentsOf: domURL),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                pageTitle = json["title"] as? String
                if let url = json["url"] as? String {
                    pageURL = URL(string: url)
                }
            }
            let files = (try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? []
            return ArtifactMission(
                missionId: dir.lastPathComponent,
                directory: dir,
                screenshot: FileManager.default.fileExists(atPath: screenshotURL.path)
                    ? NSImage(contentsOf: screenshotURL)
                    : nil,
                pageTitle: pageTitle,
                pageURL: pageURL,
                files: files
            )
        }
        .sorted { $0.missionId > $1.missionId }
        if selectedMissionId == nil {
            selectedMissionId = missions.first?.id
        }
    }

    private var selectedMission: ArtifactMission? {
        missions.first { $0.id == selectedMissionId } ?? missions.first
    }
}

private struct ArtifactMission: Identifiable {
    let missionId: String
    let directory: URL
    let screenshot: NSImage?
    let pageTitle: String?
    let pageURL: URL?
    let files: [String]

    var id: String { missionId }
}

private struct BrowserArtifactRow: View {
    let mission: ArtifactMission

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            if let image = mission.screenshot {
                Image(nsImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 96, height: 64)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            } else {
                RoundedRectangle(cornerRadius: 6)
                    .fill(.quaternary)
                    .frame(width: 96, height: 64)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(mission.pageTitle ?? "Browser capture")
                    .font(.headline)
                    .lineLimit(1)
                Text(mission.pageURL?.absoluteString ?? mission.missionId)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                Text("\(mission.files.count) artifact files")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 4)
    }
}

private struct BrowserPreview: View {
    let mission: ArtifactMission

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading) {
                    Text(mission.pageTitle ?? "Agent Browser")
                        .font(.title2.bold())
                    Text(mission.pageURL?.absoluteString ?? mission.missionId)
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button("Reveal Artifacts") {
                    NSWorkspace.shared.selectFile(mission.directory.path, inFileViewerRootedAtPath: "")
                }
            }
            .padding(.horizontal)

            if let url = mission.pageURL {
                WebPreview(url: url)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .padding(.horizontal)
                    .padding(.bottom)
            } else if let image = mission.screenshot {
                Image(nsImage: image)
                    .resizable()
                    .scaledToFit()
                    .padding()
            }
        }
    }
}

private struct WebPreview: NSViewRepresentable {
    let url: URL

    func makeNSView(context: Context) -> WKWebView {
        WKWebView()
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        if webView.url != url {
            webView.load(URLRequest(url: url))
        }
    }
}
