import SwiftUI

/// Interactive hierarchy Canvas for Mission Control (Premium Phase 1 / living Neural Mesh).
/// Nodes = active mission + resident agents.
/// Edges = parent/child relationships (basic) + boosted by recent inter-agent comms / synapses.
/// Recent activity causes thicker/brighter edges and a soft activity ring on nodes (the "pulse" of the mesh).
struct AgentGraphCanvas: View {
    let agents: [AgentNodeModel]
    let comms: [CommsEntry]
    var focusedMissionId: String? = nil

    private var recentlyActive: Set<String> {
        var set = Set<String>()
        for c in comms.prefix(20) {
            set.insert(c.from)
            set.insert(c.to)
        }
        return set
    }

    var body: some View {
        Canvas { context, size in
            guard !agents.isEmpty else { return }

            let padding: CGFloat = 16
            let cols = max(1, Int(sqrt(Double(agents.count))))
            let cellW = (size.width - padding * 2) / CGFloat(cols)
            let cellH: CGFloat = 52

            var positions: [String: CGPoint] = [:]
            for (i, agent) in agents.prefix(24).enumerated() {
                let col = i % cols
                let row = i / cols
                let x = padding + CGFloat(col) * cellW + cellW / 2
                let y = padding + CGFloat(row) * cellH + 18
                positions[agent.id] = CGPoint(x: x, y: y)
            }

            let active = recentlyActive

            // Draw edges — boost thickness/color when either endpoint has recent comms activity
            for agent in agents {
                guard let toPos = positions[agent.id] else { continue }
                if let parent = agent.parentId, let fromPos = positions[parent] {
                    let isActiveEdge = active.contains(agent.id) || active.contains(parent)
                    let thickness: CGFloat = isActiveEdge ? 2.8 : 1.4
                    let alpha: Double = isActiveEdge ? 0.85 : 0.35
                    var path = Path()
                    path.move(to: fromPos)
                    path.addLine(to: toPos)
                    context.stroke(path, with: .color(.blue.opacity(alpha)), lineWidth: thickness)
                }
            }

            // Draw nodes
            for agent in agents {
                guard let pos = positions[agent.id] else { continue }
                let isActiveNode = active.contains(agent.id) || agent.status == "running"

                let color: Color = {
                    switch agent.status {
                    case "running": return .green
                    case "spawning", "idle": return .blue
                    case "waiting_approval": return .orange
                    default: return .red
                    }
                }()

                // Activity "pulse" ring for recently communicating or running agents
                if isActiveNode {
                    let ringSize: CGFloat = 18
                    context.fill(
                        Circle().path(in: CGRect(x: pos.x - ringSize/2, y: pos.y - ringSize/2, width: ringSize, height: ringSize)),
                        with: .color(color.opacity(0.18))
                    )
                }

                let nodeSize: CGFloat = isActiveNode ? 9 : 6.5
                context.fill(
                    Circle().path(in: CGRect(x: pos.x - nodeSize, y: pos.y - nodeSize, width: nodeSize * 2, height: nodeSize * 2)),
                    with: .color(color)
                )

                let label = Text(agent.role).font(.system(size: 8, weight: .medium))
                context.draw(label, at: CGPoint(x: pos.x, y: pos.y + nodeSize + 9), anchor: .top)
            }
        }
        .background(.black.opacity(0.02))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}