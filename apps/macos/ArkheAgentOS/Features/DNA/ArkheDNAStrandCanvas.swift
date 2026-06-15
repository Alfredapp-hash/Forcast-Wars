import SwiftUI

/// Central DNA strand — chromosomes as horizontal bands, genes as segments on the metallic spine.
struct ArkheDNAStrandCanvas: View {
    let experts: [ResidentExpertRecord]
    let synapses: [AgentSynapseRecord]
    @Binding var selectedExpertId: String?
    var showLiveMesh: Bool
    var onSynapseSelected: ((AgentSynapseRecord) -> Void)?

    @State private var pulsePhase: Double = 0

    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 30)) { timeline in
            let phase = timeline.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 2)
            Canvas { context, size in
                drawStrand(context: &context, size: size, pulsePhase: phase, experts: experts, synapses: synapses, showLiveMesh: showLiveMesh, selectedExpertId: selectedExpertId)
            }
        }
        .background(
            LinearGradient(
                colors: [Color(white: 0.08), Color(white: 0.14)],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay {
            GeometryReader { geo in
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture { location in
                        if let id = geneAt(point: location, size: geo.size, experts: experts) {
                            selectedExpertId = id
                        }
                    }
            }
        }
    }

    private func drawStrand(
        context: inout GraphicsContext,
        size: CGSize,
        pulsePhase: Double,
        experts: [ResidentExpertRecord],
        synapses: [AgentSynapseRecord],
        showLiveMesh: Bool,
        selectedExpertId: String?
    ) {
        let layout = Self.layout(experts: experts, synapses: synapses, size: size)
        let spineX = size.width * 0.42

        // Metallic spine
        var spine = Path()
        spine.move(to: CGPoint(x: spineX, y: 12))
        spine.addLine(to: CGPoint(x: spineX, y: size.height - 12))
        context.stroke(spine, with: .color(.white.opacity(0.25)), lineWidth: 3)
        context.stroke(spine, with: .color(.white.opacity(0.08)), lineWidth: 8)

        // Live mesh synapses (overlay layer — separate from identity strand)
        if showLiveMesh {
            for synapse in layout.topSynapses {
                guard let from = layout.geneFrames[synapse.sourceAgentId]?.center,
                      let to = layout.geneFrames[synapse.targetAgentId]?.center else { continue }
                let weight = max(0.15, min(1.0, synapse.weight))
                var path = Path()
                path.move(to: from)
                path.addQuadCurve(to: to, control: CGPoint(x: (from.x + to.x) / 2 + 40, y: (from.y + to.y) / 2))
                let color: Color = synapse.trusted ? .yellow : .cyan.opacity(0.7)
                context.stroke(path, with: .color(color.opacity(0.5 + weight * 0.4)), lineWidth: 1 + weight * 2.5)
            }
        }

        for family in DNAChromosomeFamily.allCases {
            guard let band = layout.bands[family], !band.genes.isEmpty else { continue }

            // Chromosome region label
            let labelRect = CGRect(x: 8, y: band.y - 2, width: spineX - 20, height: band.height)
            context.draw(
                Text(family.rawValue.uppercased())
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(.white.opacity(0.45)),
                in: labelRect
            )

            for gene in band.genes {
                let frame = gene.frame
                let isSelected = selectedExpertId == gene.expert.id
                let isActive = gene.expert.status == "active" || gene.expert.status == "busy"
                let familyColor = family.color(for: gene.expert.status)

                if isActive {
                    let pulse = 0.12 + 0.08 * sin(pulsePhase * .pi)
                    context.fill(
                        RoundedRectangle(cornerRadius: 6)
                            .path(in: frame.insetBy(dx: -4, dy: -4)),
                        with: .color(familyColor.opacity(pulse))
                    )
                }

                context.fill(
                    RoundedRectangle(cornerRadius: 5).path(in: frame),
                    with: .color(familyColor.opacity(isActive ? 0.95 : 0.5))
                )

                if isSelected {
                    context.stroke(
                        RoundedRectangle(cornerRadius: 5).path(in: frame.insetBy(dx: -2, dy: -2)),
                        with: .color(.white),
                        lineWidth: 2
                    )
                }

                context.draw(
                    Text(gene.expert.role)
                        .font(.system(size: 8, weight: isActive ? .semibold : .regular))
                        .foregroundColor(.white.opacity(isActive ? 1 : 0.7)),
                    in: frame.insetBy(dx: 4, dy: 2)
                )
            }
        }
    }

    private func geneAt(point: CGPoint, size: CGSize, experts: [ResidentExpertRecord]) -> String? {
        let layout = Self.layout(experts: experts, synapses: synapses, size: size)
        return layout.geneFrames.first(where: { $0.value.contains(point) })?.key
    }

    private struct GeneLayout {
        let expert: ResidentExpertRecord
        let frame: CGRect
        var center: CGPoint { CGPoint(x: frame.midX, y: frame.midY) }
    }

    private struct BandLayout {
        let y: CGFloat
        let height: CGFloat
        let genes: [GeneLayout]
    }

    private struct StrandLayout {
        let bands: [DNAChromosomeFamily: BandLayout]
        let geneFrames: [String: CGRect]
        let topSynapses: [AgentSynapseRecord]
    }

    private static func layout(experts: [ResidentExpertRecord], synapses: [AgentSynapseRecord], size: CGSize) -> StrandLayout {
        let grouped = Dictionary(grouping: experts) { DNAChromosomeFamily.from(cortex: $0.cortex) }
        let families = DNAChromosomeFamily.allCases.filter { !(grouped[$0]?.isEmpty ?? true) }
        let bandHeight: CGFloat = max(44, (size.height - 24) / CGFloat(max(families.count, 1)))

        var bands: [DNAChromosomeFamily: BandLayout] = [:]
        var geneFrames: [String: CGRect] = [:]
        let spineX = size.width * 0.42
        let geneWidth: CGFloat = min(140, size.width * 0.38)

        for (index, family) in families.enumerated() {
            let y = 12 + CGFloat(index) * bandHeight
            let genes = (grouped[family] ?? []).sorted { $0.role < $1.role }
            var geneLayouts: [GeneLayout] = []

            for (gi, expert) in genes.enumerated() {
                let offsetY = y + 14 + CGFloat(gi % 2) * 18
                let offsetX = spineX + 8 + CGFloat(gi / 2) * (geneWidth + 6)
                let frame = CGRect(x: offsetX, y: offsetY, width: geneWidth, height: 22)
                geneLayouts.append(GeneLayout(expert: expert, frame: frame))
                geneFrames[expert.id] = frame
            }

            bands[family] = BandLayout(y: y, height: bandHeight, genes: geneLayouts)
        }

        let topSynapses = Array(synapses.sorted { $0.weight > $1.weight }.prefix(12))
        return StrandLayout(bands: bands, geneFrames: geneFrames, topSynapses: topSynapses)
    }
}

extension CGRect {
    var center: CGPoint { CGPoint(x: midX, y: midY) }
}
