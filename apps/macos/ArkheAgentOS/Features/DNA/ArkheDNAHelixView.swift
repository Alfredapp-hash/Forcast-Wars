import SwiftUI

/// Pseudo-3D double helix — rotatable, genes on the strand, write-in spawn animation.
struct ArkheDNAHelixView: View {
    let experts: [ResidentExpertRecord]
    let synapses: [AgentSynapseRecord]
    @Binding var selectedExpertId: String?
    var showLiveMesh: Bool
    var writeInScales: [String: CGFloat]

    @Binding var rotationY: Double
    @Binding var rotationX: Double

    @State private var pulsePhase: Double = 0

    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 30)) { timeline in
            let phase = timeline.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 2)
            Canvas { context, size in
                drawHelix(
                    context: &context,
                    size: size,
                    pulsePhase: phase,
                    experts: experts,
                    synapses: synapses,
                    showLiveMesh: showLiveMesh,
                    selectedExpertId: selectedExpertId,
                    writeInScales: writeInScales,
                    rotationY: rotationY,
                    rotationX: rotationX
                )
            }
        }
        .background(
            RadialGradient(
                colors: [Color(white: 0.16), Color(white: 0.06)],
                center: .center,
                startRadius: 20,
                endRadius: 400
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay {
            GeometryReader { geo in
                Color.clear
                    .contentShape(Rectangle())
                    .gesture(
                        DragGesture(minimumDistance: 2)
                            .onChanged { value in
                                rotationY += value.translation.width * 0.008
                                rotationX = max(0.15, min(1.2, rotationX + value.translation.height * 0.004))
                            }
                    )
                    .onTapGesture { location in
                        if let id = hitTest(point: location, size: geo.size) {
                            selectedExpertId = id
                        }
                    }
            }
        }
        .overlay(alignment: .bottomLeading) {
            Text("Drag to rotate · tap gene to inspect")
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.35))
                .padding(8)
        }
    }

    private func hitTest(point: CGPoint, size: CGSize) -> String? {
        let layout = HelixLayout.build(
            experts: experts,
            synapses: synapses,
            size: size,
            rotationY: rotationY,
            rotationX: rotationX,
            writeInScales: writeInScales
        )
        var best: (id: String, dist: CGFloat)?
        for (id, hit) in layout.geneHits {
            let d = hypot(point.x - hit.x, point.y - hit.y)
            if d <= hit.radius, best == nil || d < best!.dist {
                best = (id, d)
            }
        }
        return best?.id
    }

    private func drawHelix(
        context: inout GraphicsContext,
        size: CGSize,
        pulsePhase: Double,
        experts: [ResidentExpertRecord],
        synapses: [AgentSynapseRecord],
        showLiveMesh: Bool,
        selectedExpertId: String?,
        writeInScales: [String: CGFloat],
        rotationY: Double,
        rotationX: Double
    ) {
        let layout = HelixLayout.build(
            experts: experts,
            synapses: synapses,
            size: size,
            rotationY: rotationY,
            rotationX: rotationX,
            writeInScales: writeInScales
        )

        // Double backbone strands
        for strand in layout.backboneA + layout.backboneB {
            guard strand.count > 1 else { continue }
            var path = Path()
            path.move(to: strand[0])
            for p in strand.dropFirst() { path.addLine(to: p) }
            context.stroke(path, with: .color(.white.opacity(0.22)), lineWidth: 2.5)
            context.stroke(path, with: .color(.white.opacity(0.06)), lineWidth: 6)
        }

        // Base pair rungs
        for rung in layout.rungs {
            var path = Path()
            path.move(to: rung.a)
            path.addLine(to: rung.b)
            context.stroke(path, with: .color(.white.opacity(0.08)), lineWidth: 1)
        }

        if showLiveMesh {
            for synapse in layout.topSynapses {
                guard let a = layout.geneHits[synapse.sourceAgentId],
                      let b = layout.geneHits[synapse.targetAgentId] else { continue }
                var path = Path()
                path.move(to: CGPoint(x: a.x, y: a.y))
                path.addQuadCurve(
                    to: CGPoint(x: b.x, y: b.y),
                    control: CGPoint(x: (a.x + b.x) / 2, y: min(a.y, b.y) - 30)
                )
                let w = max(0.2, min(1.0, synapse.weight))
                let color: Color = synapse.trusted ? .yellow : .cyan
                context.stroke(path, with: .color(color.opacity(0.35 + w * 0.5)), lineWidth: 1 + w * 2)
            }
        }

        for gene in layout.genes {
            let expert = gene.expert
            let family = DNAChromosomeFamily.from(cortex: expert.cortex)
            let isActive = expert.status == "active" || expert.status == "busy"
            let isSelected = selectedExpertId == expert.id
            let scale = writeInScales[expert.id] ?? 1.0
            let radius = gene.baseRadius * scale
            let color = family.color(for: expert.status)

            if isActive {
                let pulse = 0.15 + 0.1 * sin(pulsePhase * .pi)
                context.fill(
                    Circle().path(in: CGRect(x: gene.x - radius - 6, y: gene.y - radius - 6, width: (radius + 6) * 2, height: (radius + 6) * 2)),
                    with: .color(color.opacity(pulse))
                )
            }

            context.fill(
                Circle().path(in: CGRect(x: gene.x - radius, y: gene.y - radius, width: radius * 2, height: radius * 2)),
                with: .color(color.opacity(isActive ? 1 : 0.45))
            )

            if isSelected {
                context.stroke(
                    Circle().path(in: CGRect(x: gene.x - radius - 3, y: gene.y - radius - 3, width: (radius + 3) * 2, height: (radius + 3) * 2)),
                    with: .color(.white),
                    lineWidth: 2
                )
            }

            let depthAlpha = 0.5 + gene.depth * 0.5
            context.draw(
                Text(expert.role)
                    .font(.system(size: max(7, 9 * scale), weight: isActive ? .semibold : .regular))
                    .foregroundColor(.white.opacity(depthAlpha)),
                at: CGPoint(x: gene.x, y: gene.y + radius + 8),
                anchor: .top
            )
        }
    }
}

// MARK: - Helix layout math

private struct HelixLayout {
    struct GeneHit {
        let expert: ResidentExpertRecord
        let x: CGFloat
        let y: CGFloat
        let baseRadius: CGFloat
        let depth: CGFloat
    }

    struct GeneScreenHit {
        let x: CGFloat
        let y: CGFloat
        let radius: CGFloat
    }

    let backboneA: [[CGPoint]]
    let backboneB: [[CGPoint]]
    let rungs: [(a: CGPoint, b: CGPoint)]
    let genes: [GeneHit]
    let geneHits: [String: GeneScreenHit]
    let topSynapses: [AgentSynapseRecord]

    static func build(
        experts: [ResidentExpertRecord],
        synapses: [AgentSynapseRecord],
        size: CGSize,
        rotationY: Double,
        rotationX: Double,
        writeInScales: [String: CGFloat]
    ) -> HelixLayout {
        let center = CGPoint(x: size.width / 2, y: size.height / 2)
        let helixHeight = size.height * 0.75
        let radius: CGFloat = min(size.width, size.height) * 0.22
        let turns: Double = 2.5
        let steps = 80

        var backboneA: [CGPoint] = []
        var backboneB: [CGPoint] = []
        var rungs: [(CGPoint, CGPoint)] = []

        for step in 0...steps {
            let t = Double(step) / Double(steps)
            let angle = t * turns * 2 * .pi + rotationY
            let y3 = (t - 0.5) * helixHeight

            let xA = radius * cos(angle)
            let zA = radius * sin(angle)
            let xB = radius * cos(angle + .pi)
            let zB = radius * sin(angle + .pi)

            let pA = project(x: xA, y: y3, z: zA, center: center, rotationX: rotationX)
            let pB = project(x: xB, y: y3, z: zB, center: center, rotationX: rotationX)
            backboneA.append(pA)
            backboneB.append(pB)

            if step % 4 == 0 {
                rungs.append((pA, pB))
            }
        }

        let sorted = experts.sorted { $0.role < $1.role }
        var genes: [GeneHit] = []
        var geneHits: [String: GeneScreenHit] = [:]

        for (index, expert) in sorted.enumerated() {
            let t = sorted.count > 1 ? Double(index) / Double(sorted.count - 1) : 0.5
            let familyOffset = Double(DNAChromosomeFamily.from(cortex: expert.cortex).ordinal) * 0.04
            let angle = (t + familyOffset) * turns * 2 * .pi + rotationY + (index % 2 == 0 ? 0 : .pi)
            let y3 = (t - 0.5) * helixHeight
            let x3 = radius * cos(angle) * 1.08
            let z3 = radius * sin(angle) * 1.08
            let projected = project(x: x3, y: y3, z: z3, center: center, rotationX: rotationX)
            let depth = (sin(angle) + 1) / 2
            let baseRadius: CGFloat = 7 + CGFloat(depth) * 4
            let scale = writeInScales[expert.id] ?? 1
            let hitRadius = baseRadius * scale + 4

            let hit = GeneHit(expert: expert, x: projected.x, y: projected.y, baseRadius: baseRadius, depth: depth)
            genes.append(hit)
            geneHits[expert.id] = GeneScreenHit(x: projected.x, y: projected.y, radius: hitRadius)
        }

        let topSynapses = Array(synapses.sorted { $0.weight > $1.weight }.prefix(10))
        return HelixLayout(
            backboneA: [backboneA],
            backboneB: [backboneB],
            rungs: rungs,
            genes: genes.sorted { $0.depth < $1.depth },
            geneHits: geneHits,
            topSynapses: topSynapses
        )
    }

    private static func project(x: CGFloat, y: CGFloat, z: CGFloat, center: CGPoint, rotationX: Double) -> CGPoint {
        let cosX = cos(rotationX)
        let sinX = sin(rotationX)
        let screenX = center.x + x
        let screenY = center.y + y * cosX + z * sinX * 0.55
        return CGPoint(x: screenX, y: screenY)
    }
}

private extension DNAChromosomeFamily {
    var ordinal: Int {
        switch self {
        case .executive: return 0
        case .personal: return 1
        case .development: return 2
        case .business: return 3
        case .research: return 4
        case .memory: return 5
        case .system: return 6
        case .attention: return 7
        case .genesis: return 8
        }
    }
}
