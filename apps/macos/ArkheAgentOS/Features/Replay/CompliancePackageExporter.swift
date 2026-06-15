import Foundation
import UniformTypeIdentifiers

struct ComplianceEvidencePackage: Codable {
    let schemaVersion: String
    let missionId: String
    let exportedAt: String
    let eventCount: Int
    let evidenceChain: [ArkheEvent]
    let eventTypeCounts: [String: Int]
    let approvalSteps: [String]
    let browserSteps: [String]
}

enum CompliancePackageExporter {
    enum ExportError: LocalizedError {
        case missingMissionId
        case encodeFailed
        case stagingFailed(String)
        case zipFailed(String)

        var errorDescription: String? {
            switch self {
            case .missingMissionId: return "Mission ID is required"
            case .encodeFailed: return "Failed to encode mission data"
            case .stagingFailed(let detail): return "Staging failed: \(detail)"
            case .zipFailed(let detail): return "ZIP creation failed: \(detail)"
            }
        }
    }

    static func defaultFilename(missionId: String) -> String {
        let date = String(ISO8601DateFormatter().string(from: Date()).prefix(10))
        return "arkhe-compliance-\(missionId)-\(date).zip"
    }

    static func export(
        missionId: String,
        events: [ArkheEvent],
        to destinationURL: URL
    ) throws {
        let sorted = events.sorted { $0.ts < $1.ts }
        let evidenceChain = ForensicsHelper.buildEvidenceChain(focus: sorted.last, events: sorted)

        let stagingRoot = FileManager.default.temporaryDirectory
            .appendingPathComponent("arkhe-compliance-\(missionId)-\(UUID().uuidString)", isDirectory: true)

        defer { try? FileManager.default.removeItem(at: stagingRoot) }

        do {
            try FileManager.default.createDirectory(at: stagingRoot, withIntermediateDirectories: true)
        } catch {
            throw ExportError.stagingFailed(error.localizedDescription)
        }

        guard let missionData = ForensicsHelper.encodeEvents(sorted) else {
            throw ExportError.encodeFailed
        }
        try missionData.write(to: stagingRoot.appendingPathComponent("mission-events.json"))

        let evidencePackage = buildEvidencePackage(missionId: missionId, events: sorted, evidenceChain: evidenceChain)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let evidenceData = try? encoder.encode(evidencePackage) else {
            throw ExportError.encodeFailed
        }
        try evidenceData.write(to: stagingRoot.appendingPathComponent("forensics-evidence.json"))

        let readme = buildReadme(missionId: missionId, events: sorted, evidenceChain: evidenceChain)
        try readme.write(to: stagingRoot.appendingPathComponent("README.txt"), atomically: true, encoding: .utf8)

        let artifactsSource = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".arkhe/artifacts/\(missionId)", isDirectory: true)
        if FileManager.default.fileExists(atPath: artifactsSource.path) {
            let artifactsDest = stagingRoot.appendingPathComponent("artifacts", isDirectory: true)
            try FileManager.default.createDirectory(at: artifactsDest, withIntermediateDirectories: true)
            try copyArtifacts(from: artifactsSource, to: artifactsDest)
        }

        if FileManager.default.fileExists(atPath: destinationURL.path) {
            try FileManager.default.removeItem(at: destinationURL)
        }

        try createZip(from: stagingRoot, to: destinationURL)
    }

    private static func buildEvidencePackage(
        missionId: String,
        events: [ArkheEvent],
        evidenceChain: [ArkheEvent]
    ) -> ComplianceEvidencePackage {
        var typeCounts: [String: Int] = [:]
        for event in events {
            typeCounts[event.eventType, default: 0] += 1
        }

        let approvals = events
            .filter { $0.eventType.hasPrefix("approval.") }
            .map { ForensicsHelper.evidenceSummary($0, index: 0).replacingOccurrences(of: "0. ", with: "") }

        let browser = events
            .filter { $0.eventType.hasPrefix("browser.") }
            .map { ForensicsHelper.evidenceSummary($0, index: 0).replacingOccurrences(of: "0. ", with: "") }

        return ComplianceEvidencePackage(
            schemaVersion: "1.0",
            missionId: missionId,
            exportedAt: ISO8601DateFormatter().string(from: Date()),
            eventCount: events.count,
            evidenceChain: evidenceChain,
            eventTypeCounts: typeCounts,
            approvalSteps: approvals,
            browserSteps: browser
        )
    }

    private static func buildReadme(
        missionId: String,
        events: [ArkheEvent],
        evidenceChain: [ArkheEvent]
    ) -> String {
        let exportedAt = ISO8601DateFormatter().string(from: Date())
        var lines: [String] = [
            "Arkhe AgentOS — Compliance Package",
            "==================================",
            "",
            "Mission ID:     \(missionId)",
            "Exported:       \(exportedAt)",
            "Total events:   \(events.count)",
            "Evidence chain: \(evidenceChain.count) correlated steps",
            "",
            "Contents",
            "--------",
            "- mission-events.json    Full append-only mission event log",
            "- forensics-evidence.json Correlated evidence chain + type counts",
            "- artifacts/             Browser screenshots, DOM snapshots (if captured)",
            "- README.txt             This summary",
            "",
        ]

        let approvals = events.filter { $0.eventType.hasPrefix("approval.") }
        if !approvals.isEmpty {
            lines.append("Human approval gates (\(approvals.count))")
            lines.append("---------------------------")
            for (index, event) in approvals.enumerated() {
                lines.append("\(index + 1). \(ForensicsHelper.evidenceLine(event))")
            }
            lines.append("")
        }

        let browser = events.filter { $0.eventType.hasPrefix("browser.") }
        if !browser.isEmpty {
            lines.append("Browser evidence (\(browser.count))")
            lines.append("----------------")
            for (index, event) in browser.enumerated() {
                lines.append("\(index + 1). \(ForensicsHelper.evidenceLine(event))")
            }
            lines.append("")
        }

        let artifactsDir = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".arkhe/artifacts/\(missionId)", isDirectory: true)
        if let files = try? FileManager.default.contentsOfDirectory(atPath: artifactsDir.path), !files.isEmpty {
            lines.append("Artifacts copied (\(files.count) files)")
            lines.append("------------------")
            for file in files.sorted() {
                lines.append("- artifacts/\(file)")
            }
            lines.append("")
        } else {
            lines.append("Artifacts: none found at ~/.arkhe/artifacts/\(missionId)/")
            lines.append("")
        }

        lines.append("Generated by Arkhe AgentOS Replay. For audit and compliance review.")
        return lines.joined(separator: "\n")
    }

    private static func copyArtifacts(from source: URL, to destination: URL) throws {
        let items = try FileManager.default.contentsOfDirectory(at: source, includingPropertiesForKeys: nil)
        for item in items {
            let target = destination.appendingPathComponent(item.lastPathComponent)
            if FileManager.default.fileExists(atPath: target.path) {
                try FileManager.default.removeItem(at: target)
            }
            try FileManager.default.copyItem(at: item, to: target)
        }
    }

    private static func createZip(from sourceDirectory: URL, to destination: URL) throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/zip")
        process.arguments = ["-r", "-q", destination.path, "."]
        process.currentDirectoryURL = sourceDirectory

        let stderr = Pipe()
        process.standardError = stderr

        do {
            try process.run()
        } catch {
            throw ExportError.zipFailed(error.localizedDescription)
        }
        process.waitUntilExit()

        guard process.terminationStatus == 0 else {
            let errData = stderr.fileHandleForReading.readDataToEndOfFile()
            let errText = String(data: errData, encoding: .utf8) ?? "unknown zip error"
            throw ExportError.zipFailed(errText.trimmingCharacters(in: .whitespacesAndNewlines))
        }
    }
}
