import SwiftUI

// MARK: - Models

struct OrgNode: Identifiable {
    let id: String
    var label: String
    var kind: OrgNodeKind
    var isActive: Bool
    var taskCount: Int = 0
}

enum OrgNodeKind {
    case hermes, agent, director, tool, forecast
}

struct TaskPacket: Identifiable {
    let id: String
    var fromId: String
    var toId: String
    var progress: Double = 0   // 0 → 1
    var color: Color
}

// MARK: - View

/// Animated living org map showing Hermes at center with agent nodes radiating outward.
/// Task packets animate along edges whenever agent.message / model.route events fire.
struct LivingOrgMap: View {
    let agents: [AgentNodeModel]
    let recentEvents: [ArkheEvent]

    @State private var packets: [TaskPacket] = []
    @State private var pulsePhase: Double = 0
    @State private var animationTimer: Timer? = nil

    private let hermesId = "hermes"

    var body: some View {
        GeometryReader { geo in
            let center = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)
            let nodes = buildNodes()
            let positions = nodePositions(for: nodes, center: center, size: geo.size)

            ZStack {
                // ── Background grid ────────────────────────────────────────
                gridLines(size: geo.size)

                // ── Edges ─────────────────────────────────────────────────
                ForEach(nodes.filter { $0.id != hermesId }) { node in
                    if let from = positions[hermesId], let to = positions[node.id] {
                        EdgeLine(from: from, to: to, active: node.isActive)
                    }
                }

                // ── Task packets (with fading particle trail) ─────────────
                ForEach(packets) { packet in
                    if let from = positions[packet.fromId], let to = positions[packet.toId] {
                        PacketDot(from: from, to: to, progress: packet.progress, color: packet.color)
                    }
                }

                // ── Nodes ─────────────────────────────────────────────────
                ForEach(nodes) { node in
                    if let pos = positions[node.id] {
                        OrgNodeView(
                            node: node,
                            pulsePhase: pulsePhase,
                            isHermes: node.id == hermesId
                        )
                        .position(pos)
                    }
                }
            }
        }
        .onAppear { startAnimation() }
        .onDisappear { animationTimer?.invalidate() }
        .onChange(of: recentEvents.first?.id) { _, _ in spawnPacketsFromEvents() }
    }

    // MARK: - Layout

    private func buildNodes() -> [OrgNode] {
        var nodes: [OrgNode] = [
            OrgNode(id: hermesId, label: "HERMES", kind: .hermes, isActive: true)
        ]

        let seen = Set(agents.map { $0.role })
        var roleNodes: [OrgNode] = []

        for agent in agents.prefix(8) {
            let isActive = agent.status == "running" || agent.status == "spawning"
            let isForecast = agent.role.contains("Athena") || agent.role.contains("Prometheus")
                || agent.role.contains("Judge") || agent.role.contains("Fact")
                || agent.role.contains("Narrator") || agent.role.contains("Oracle")
                || agent.role.contains("Vega") || agent.role.contains("Atlas")
                || agent.role.contains("Blackstone")
            if !roleNodes.contains(where: { $0.id == agent.id }) {
                roleNodes.append(OrgNode(
                    id: agent.id,
                    label: agent.role.uppercased(),
                    kind: agent.role.lowercased().contains("director") ? .director :
                          isForecast ? .forecast : .agent,
                    isActive: isActive,
                    taskCount: agent.currentWorkItemId != nil ? 1 : 0
                ))
            }
        }

        if roleNodes.isEmpty {
            let placeholders = ["FORECAST", "ATHENA", "PROMETHEUS", "JUDGE", "NARRATOR"]
            for (i, name) in placeholders.enumerated() {
                roleNodes.append(OrgNode(id: "placeholder_\(i)", label: name, kind: .agent, isActive: false))
            }
        }

        nodes.append(contentsOf: roleNodes)
        return nodes
    }

    private func nodePositions(for nodes: [OrgNode], center: CGPoint, size: CGSize) -> [String: CGPoint] {
        var positions: [String: CGPoint] = [hermesId: center]
        let outer = nodes.filter { $0.id != hermesId }
        let count = outer.count
        guard count > 0 else { return positions }

        let radius = min(size.width, size.height) * 0.34
        for (i, node) in outer.enumerated() {
            let angle = (2 * Double.pi * Double(i) / Double(count)) - (Double.pi / 2)
            let x = center.x + radius * cos(angle)
            let y = center.y + radius * sin(angle)
            positions[node.id] = CGPoint(x: x, y: y)
        }
        return positions
    }

    // MARK: - Animation

    private func startAnimation() {
        animationTimer?.invalidate()
        animationTimer = Timer.scheduledTimer(withTimeInterval: 0.033, repeats: true) { _ in
            withAnimation(.linear(duration: 0.033)) {
                pulsePhase = (pulsePhase + 0.015).truncatingRemainder(dividingBy: 1)
                advancePackets()
            }
        }
    }

    private func advancePackets() {
        packets = packets.compactMap { packet in
            var p = packet
            p.progress += 0.018
            return p.progress >= 1 ? nil : p
        }
    }

    private func spawnPacketsFromEvents() {
        guard let event = recentEvents.first else { return }
        let nodes = buildNodes()

        let color: Color = {
            if event.eventType.hasPrefix("debate.") || event.eventType == "prediction.created" { return .cyan }
            if event.eventType.hasPrefix("approval.") { return .arkheAmber }
            if event.eventType.hasPrefix("model.") { return .arkheAzure }
            if event.eventType.hasPrefix("agent.message") { return .arkheEmerald }
            return .arkheViolet
        }()

        let fromId: String = {
            if let agentId = event.agentId, nodes.contains(where: { $0.id == agentId }) { return agentId }
            return hermesId
        }()
        let toId: String = {
            if let toAgent = event.payload.toAgentId, nodes.contains(where: { $0.id == toAgent }) { return toAgent }
            if fromId == hermesId, let first = nodes.first(where: { $0.id != hermesId && $0.isActive }) { return first.id }
            return hermesId
        }()

        guard fromId != toId else { return }
        let packet = TaskPacket(id: event.id, fromId: fromId, toId: toId, progress: 0, color: color)
        packets.append(packet)
        if packets.count > 30 { packets.removeFirst() }
    }

    // MARK: - Background grid

    private func gridLines(size: CGSize) -> some View {
        Canvas { ctx, sz in
            let spacing: CGFloat = 40
            var path = Path()
            var x: CGFloat = 0
            while x <= sz.width {
                path.move(to: CGPoint(x: x, y: 0))
                path.addLine(to: CGPoint(x: x, y: sz.height))
                x += spacing
            }
            var y: CGFloat = 0
            while y <= sz.height {
                path.move(to: CGPoint(x: 0, y: y))
                path.addLine(to: CGPoint(x: sz.width, y: y))
                y += spacing
            }
            ctx.stroke(path, with: .color(.primary.opacity(0.04)), lineWidth: 0.5)
        }
    }
}

// MARK: - Edge

private struct EdgeLine: View {
    let from: CGPoint
    let to: CGPoint
    let active: Bool

    var body: some View {
        curvedPath
            .stroke(
                active ? Color.arkheViolet.opacity(0.35) : Color.primary.opacity(0.07),
                style: StrokeStyle(lineWidth: active ? 1.2 : 0.5, dash: active ? [] : [4, 4])
            )
            .shadow(color: active ? Color.arkheViolet.opacity(0.4) : .clear, radius: active ? 3 : 0)
    }

    private var curvedPath: Path {
        Path { path in
            path.move(to: from)
            // Bow the line outward slightly for an organic feel.
            let mid = CGPoint(x: (from.x + to.x) / 2, y: (from.y + to.y) / 2)
            let dx = to.x - from.x
            let dy = to.y - from.y
            let control = CGPoint(x: mid.x - dy * 0.12, y: mid.y + dx * 0.12)
            path.addQuadCurve(to: to, control: control)
        }
    }
}

// MARK: - Packet dot

private struct PacketDot: View {
    let from: CGPoint
    let to: CGPoint
    let progress: Double
    let color: Color

    var body: some View {
        ZStack {
            // Fading particle trail
            ForEach(0..<4, id: \.self) { i in
                let trailProgress = max(0, progress - Double(i) * 0.05)
                Circle()
                    .fill(color.opacity(0.5 - Double(i) * 0.12))
                    .frame(width: 6 - CGFloat(i), height: 6 - CGFloat(i))
                    .position(pointAt(trailProgress))
            }
            // Head
            Circle()
                .fill(color)
                .frame(width: 7, height: 7)
                .arkheGlow(color, radius: 5)
                .position(pointAt(progress))
        }
    }

    private func pointAt(_ t: Double) -> CGPoint {
        CGPoint(
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t
        )
    }
}

// MARK: - Node glow modifier

private struct NodeGlow: ViewModifier {
    let color: Color
    let active: Bool
    let radius: CGFloat

    func body(content: Content) -> some View {
        if active {
            content
                .shadow(color: color.opacity(0.6), radius: radius)
                .shadow(color: color.opacity(0.3), radius: radius * 1.8)
        } else {
            content
        }
    }
}

// MARK: - Node view

private struct OrgNodeView: View {
    let node: OrgNode
    let pulsePhase: Double
    let isHermes: Bool

    private var ringScale: CGFloat {
        let t = (pulsePhase + Double(node.id.hashValue % 100) / 100).truncatingRemainder(dividingBy: 1)
        return node.isActive ? CGFloat(1 + t * 0.5) : 1
    }
    private var ringOpacity: Double {
        let t = (pulsePhase + Double(node.id.hashValue % 100) / 100).truncatingRemainder(dividingBy: 1)
        return node.isActive ? max(0, 0.4 - t * 0.4) : 0
    }

    private var nodeColor: Color {
        switch node.kind {
        case .hermes: return .arkheViolet
        case .director: return .arkheViolet
        case .forecast: return .cyan
        case .agent: return node.isActive ? .arkheEmerald : .secondary
        case .tool: return .arkheAzure
        }
    }

    var body: some View {
        ZStack {
            if node.isActive {
                Circle()
                    .stroke(nodeColor.opacity(ringOpacity), lineWidth: 1.5)
                    .frame(width: isHermes ? 80 : 56, height: isHermes ? 80 : 56)
                    .scaleEffect(ringScale)
            }

            Circle()
                .fill(
                    RadialGradient(
                        colors: [nodeColor.opacity(0.3), nodeColor.opacity(0.08)],
                        center: .center, startRadius: 2, endRadius: isHermes ? 30 : 22
                    )
                )
                .frame(width: isHermes ? 60 : 44, height: isHermes ? 60 : 44)
                .overlay(Circle().stroke(nodeColor.opacity(node.isActive ? 0.7 : 0.2), lineWidth: 1.5))
                .modifier(NodeGlow(color: nodeColor, active: node.isActive, radius: isHermes ? 12 : 7))

            VStack(spacing: 1) {
                Text(node.label)
                    .font(.system(size: isHermes ? 9 : 7.5, weight: .bold))
                    .tracking(1)
                    .foregroundStyle(node.isActive ? nodeColor : .secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                if node.taskCount > 0 {
                    Text("\(node.taskCount)")
                        .font(.system(size: 7, weight: .black, design: .monospaced))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 4)
                        .background(nodeColor)
                        .clipShape(Capsule())
                }
            }
            .frame(width: isHermes ? 56 : 40)
        }
    }
}
