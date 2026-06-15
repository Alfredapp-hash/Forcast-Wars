import SwiftUI

/// Visual for the Arkhe Neural Mesh / DNA (Premium Phase 1).
/// Chromosomes = resident experts (Core glow brighter, Business/Personal/Development tinted).
/// Strands = weighted synapses.
/// - Thickness driven by weight
/// - Gold for trusted (high weight + successes)
/// - Extra glow / pulse ring for currently active experts or those participating in top recent synapses
/// Tap a strand to open forensics for that agent pair.
struct NeuralMeshCanvas: View {
    let experts: [ResidentExpertRecord]
    let synapses: [AgentSynapseRecord]
    var onSynapseSelected: ((AgentSynapseRecord) -> Void)?

    @State private var hoveredSynapseId: String?

    private var activeExpertIDs: Set<String> {
        Set(experts.filter { $0.status == "active" || $0.status == "busy" }.map { $0.id })
    }

    private var recentlyActiveFromSynapses: Set<String> {
        let top = synapses.sorted { $0.weight > $1.weight }.prefix(8)
        var set = Set<String>()
        for s in top {
            set.insert(s.sourceAgentId)
            set.insert(s.targetAgentId)
        }
        return set
    }

    var body: some View {
        Canvas { context, size in
            guard !experts.isEmpty else { return }

            let layout = Self.computeLayout(experts: experts, synapses: synapses, size: size)
            let active = activeExpertIDs.union(recentlyActiveFromSynapses)

            for synapse in layout.topSynapses {
                guard let from = layout.positions[synapse.sourceAgentId],
                      let to = layout.positions[synapse.targetAgentId] else { continue }

                let weight = max(0.1, min(1.0, synapse.weight))
                let baseThickness = 1 + weight * 3.2
                let isTrusted = synapse.trusted
                let isActiveStrand = active.contains(synapse.sourceAgentId) || active.contains(synapse.targetAgentId)
                let isHovered = hoveredSynapseId == synapse.id

                let thickness = (isActiveStrand || isHovered) ? baseThickness + 1.2 : baseThickness
                let color: Color = isTrusted ? .yellow :
                    ((isActiveStrand || isHovered) ? .blue : (weight > 0.7 ? .blue.opacity(0.9) : .gray.opacity(0.55)))

                var path = Path()
                path.move(to: from)
                path.addLine(to: to)
                context.stroke(path, with: .color(color), lineWidth: thickness)

                if isTrusted || (weight > 0.85 && isActiveStrand) || isHovered {
                    context.stroke(path, with: .color(.yellow.opacity(isHovered ? 0.35 : 0.25)), lineWidth: thickness + 4)
                }
            }

            for expert in experts.prefix(14) {
                guard let pos = layout.positions[expert.id] else { continue }
                let isActive = active.contains(expert.id)
                let isCore = (expert.cortex ?? "").lowercased() == "core"

                let nodeSize: CGFloat = isActive ? 12 : 8
                let fill: Color = isActive ? .green : (isCore ? .purple.opacity(0.85) : .secondary.opacity(0.6))

                if isActive || isCore {
                    let ring: CGFloat = isActive ? 22 : 17
                    context.fill(
                        Circle().path(in: CGRect(x: pos.x - ring/2, y: pos.y - ring/2, width: ring, height: ring)),
                        with: .color((isActive ? Color.green : Color.purple).opacity(isActive ? 0.18 : 0.12))
                    )
                }

                context.fill(
                    Circle().path(in: CGRect(x: pos.x - nodeSize, y: pos.y - nodeSize, width: nodeSize * 2, height: nodeSize * 2)),
                    with: .color(fill)
                )

                let label = Text(expert.role).font(.system(size: 7, weight: isActive ? .semibold : .regular))
                context.draw(label, at: CGPoint(x: pos.x, y: pos.y + nodeSize + 8), anchor: .top)
            }
        }
        .background(.black.opacity(0.03))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay {
            GeometryReader { geo in
                Color.clear
                    .contentShape(Rectangle())
                    .onContinuousHover { phase in
                        switch phase {
                        case .active(let location):
                            let synapse = Self.synapseAt(
                                point: location,
                                experts: experts,
                                synapses: synapses,
                                size: geo.size
                            )
                            hoveredSynapseId = synapse?.id
                        case .ended:
                            hoveredSynapseId = nil
                        }
                    }
                    .onTapGesture { location in
                        guard let synapse = Self.synapseAt(
                            point: location,
                            experts: experts,
                            synapses: synapses,
                            size: geo.size
                        ) else { return }
                        onSynapseSelected?(synapse)
                    }
            }
        }
        .overlay(alignment: .bottomTrailing) {
            if onSynapseSelected != nil, !synapses.isEmpty {
                Text("Tap strand → forensics")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .padding(6)
            }
        }
    }

    private struct MeshLayout {
        let positions: [String: CGPoint]
        let topSynapses: [AgentSynapseRecord]
    }

    private static func computeLayout(
        experts: [ResidentExpertRecord],
        synapses: [AgentSynapseRecord],
        size: CGSize
    ) -> MeshLayout {
        let padding: CGFloat = 20
        let usableWidth = size.width - padding * 2
        let usableHeight = size.height - padding * 2
        let radius = min(usableWidth, usableHeight) / 2 - 10
        let center = CGPoint(x: size.width / 2, y: size.height / 2)

        var positions: [String: CGPoint] = [:]
        let count = min(experts.count, 14)
        for (index, expert) in experts.prefix(14).enumerated() {
            let angle = (2 * .pi / Double(max(count, 1))) * Double(index)
            let x = center.x + cos(angle) * radius
            let y = center.y + sin(angle) * radius
            positions[expert.id] = CGPoint(x: x, y: y)
        }

        let topSynapses = Array(synapses.sorted { $0.weight > $1.weight }.prefix(14))
        return MeshLayout(positions: positions, topSynapses: topSynapses)
    }

    private static func synapseAt(
        point: CGPoint,
        experts: [ResidentExpertRecord],
        synapses: [AgentSynapseRecord],
        size: CGSize
    ) -> AgentSynapseRecord? {
        guard size.width > 0, size.height > 0 else { return nil }
        let layout = computeLayout(experts: experts, synapses: synapses, size: size)
        let hitTolerance: CGFloat = 14

        var closest: (synapse: AgentSynapseRecord, distance: CGFloat)?
        for synapse in layout.topSynapses {
            guard let from = layout.positions[synapse.sourceAgentId],
                  let to = layout.positions[synapse.targetAgentId] else { continue }
            let distance = distanceFromPoint(point, toSegmentFrom: from, to: to)
            if distance <= hitTolerance {
                if closest == nil || distance < closest!.distance {
                    closest = (synapse, distance)
                }
            }
        }
        return closest?.synapse
    }

    private static func distanceFromPoint(_ point: CGPoint, toSegmentFrom a: CGPoint, to b: CGPoint) -> CGFloat {
        let dx = b.x - a.x
        let dy = b.y - a.y
        let lengthSquared = dx * dx + dy * dy
        guard lengthSquared > 0 else {
            return hypot(point.x - a.x, point.y - a.y)
        }
        var t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared
        t = max(0, min(1, t))
        let projection = CGPoint(x: a.x + t * dx, y: a.y + t * dy)
        return hypot(point.x - projection.x, point.y - projection.y)
    }
}
