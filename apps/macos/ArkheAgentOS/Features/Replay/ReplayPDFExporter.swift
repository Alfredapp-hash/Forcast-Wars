import AppKit
import PDFKit

enum ReplayPDFExporter {
    enum ExportError: LocalizedError {
        case missingMissionId
        case renderFailed

        var errorDescription: String? {
            switch self {
            case .missingMissionId: return "Mission ID is required"
            case .renderFailed: return "Failed to render PDF summary"
            }
        }
    }

    static func defaultFilename(missionId: String) -> String {
        let date = String(ISO8601DateFormatter().string(from: Date()).prefix(10))
        return "arkhe-replay-\(missionId)-\(date).pdf"
    }

    static func export(missionId: String, events: [ArkheEvent], to destinationURL: URL) throws {
        let sorted = events.sorted { $0.ts < $1.ts }
        let evidenceChain = ForensicsHelper.buildEvidenceChain(focus: sorted.last, events: sorted)
        let body = buildBody(missionId: missionId, events: sorted, evidenceChain: evidenceChain)

        let pageWidth: CGFloat = 612
        let pageHeight: CGFloat = 792
        let margin: CGFloat = 54
        let textWidth = pageWidth - margin * 2

        let font = NSFont.systemFont(ofSize: 11)
        let boldFont = NSFont.boldSystemFont(ofSize: 11)
        let titleFont = NSFont.boldSystemFont(ofSize: 18)

        let paragraph = NSMutableParagraphStyle()
        paragraph.lineBreakMode = .byWordWrapping
        paragraph.paragraphSpacing = 6

        let titleAttr: [NSAttributedString.Key: Any] = [
            .font: titleFont,
            .paragraphStyle: paragraph,
        ]
        let bodyAttr: [NSAttributedString.Key: Any] = [
            .font: font,
            .paragraphStyle: paragraph,
        ]
        let boldAttr: [NSAttributedString.Key: Any] = [
            .font: boldFont,
            .paragraphStyle: paragraph,
        ]

        let attributed = NSMutableAttributedString()
        let lines = body.components(separatedBy: "\n")
        for (index, line) in lines.enumerated() {
            let isHeading = index == 0 || line.hasSuffix("========") || line.hasSuffix("--------") || line.hasSuffix("----")
            let attrs = (index == 0) ? titleAttr : (isHeading && !line.isEmpty ? boldAttr : bodyAttr)
            if index > 0 { attributed.append(NSAttributedString(string: "\n", attributes: bodyAttr)) }
            attributed.append(NSAttributedString(string: line, attributes: attrs))
        }

        let textStorage = NSTextStorage(attributedString: attributed)
        let layoutManager = NSLayoutManager()
        let textContainer = NSTextContainer(size: NSSize(width: textWidth, height: .greatestFiniteMagnitude))
        textContainer.lineFragmentPadding = 0
        layoutManager.addTextContainer(textContainer)
        textStorage.addLayoutManager(layoutManager)

        layoutManager.ensureLayout(for: textContainer)
        let textHeight = layoutManager.usedRect(for: textContainer).height
        let pages = max(1, Int(ceil((textHeight + margin * 2) / pageHeight)))

        let pdfData = NSMutableData()
        var mediaBox = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)
        guard let consumer = CGDataConsumer(data: pdfData as CFMutableData),
              let context = CGContext(consumer: consumer, mediaBox: &mediaBox, nil) else {
            throw ExportError.renderFailed
        }

        var glyphIndex = 0
        let glyphCount = layoutManager.numberOfGlyphs

        for pageIndex in 0..<pages {
            context.beginPDFPage(nil)
            NSGraphicsContext.saveGraphicsState()
            let graphics = NSGraphicsContext(cgContext: context, flipped: false)
            NSGraphicsContext.current = graphics

            let yOffset = CGFloat(pageIndex) * pageHeight
            let containerOrigin = NSPoint(x: margin, y: margin + yOffset)
            let range = layoutManager.glyphRange(
                forBoundingRect: CGRect(x: 0, y: yOffset, width: textWidth, height: pageHeight - margin * 2),
                in: textContainer
            )

            if range.length == 0 && pageIndex > 0 { break }

            layoutManager.drawGlyphs(forGlyphRange: range, at: containerOrigin)
            NSGraphicsContext.restoreGraphicsState()
            context.endPDFPage()

            glyphIndex = range.upperBound
            if glyphIndex >= glyphCount { break }
        }

        context.closePDF()

        if pdfData.length == 0 {
            throw ExportError.renderFailed
        }

        if FileManager.default.fileExists(atPath: destinationURL.path) {
            try FileManager.default.removeItem(at: destinationURL)
        }
        try pdfData.write(to: destinationURL)
    }

    private static func buildBody(
        missionId: String,
        events: [ArkheEvent],
        evidenceChain: [ArkheEvent]
    ) -> String {
        let exportedAt = ISO8601DateFormatter().string(from: Date())
        var lines: [String] = [
            "Arkhe AgentOS — Mission Replay Summary",
            "======================================",
            "",
            "Mission ID:     \(missionId)",
            "Exported:       \(exportedAt)",
            "Total events:   \(events.count)",
            "Evidence chain: \(evidenceChain.count) correlated steps",
            "",
            "Executive summary",
            "-----------------",
        ]

        let approvals = events.filter { $0.eventType.hasPrefix("approval.") }
        let browser = events.filter { $0.eventType.hasPrefix("browser.") }
        let completed = events.contains { $0.eventType == "mission.completed" }

        lines.append(completed ? "Mission completed successfully." : "Mission may still be in progress or ended without completion event.")
        if !approvals.isEmpty {
            lines.append("Human approval gates: \(approvals.count)")
        }
        if !browser.isEmpty {
            lines.append("Browser evidence steps: \(browser.count)")
        }
        lines.append("")

        lines.append("Key timeline (up to 24 steps)")
        lines.append("----------------------------")
        let timeline = events.prefix(24)
        for (index, event) in timeline.enumerated() {
            lines.append("\(index + 1). [\(event.ts.prefix(19))] \(ForensicsHelper.evidenceSummary(event, index: index + 1))")
        }
        if events.count > 24 {
            lines.append("… \(events.count - 24) additional events (see JSON or Compliance ZIP export)")
        }
        lines.append("")

        if !evidenceChain.isEmpty {
            lines.append("Evidence chain highlights")
            lines.append("-------------------------")
            for (index, event) in evidenceChain.suffix(8).enumerated() {
                lines.append("\(index + 1). \(ForensicsHelper.evidenceLine(event))")
            }
            lines.append("")
        }

        lines.append("Generated by Arkhe AgentOS Replay. For audit review — pair with Compliance ZIP for full artifacts.")
        return lines.joined(separator: "\n")
    }
}
