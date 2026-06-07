import SwiftUI

struct ObservatoryView: View {
    let daemonClient: DaemonClient
    let missionControl: MissionControlViewModel

    @State private var health: HealthStatus?
    @State private var refreshTimer: Timer?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("AI Resource Manager")
                        .font(.largeTitle.bold())
                    Text("Activity Monitor for AI — model, cost, and compute per agent")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                if let health {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 160))], spacing: 10) {
                        ObservatoryTile(label: "Daemon", value: health.status.uppercased())
                        ObservatoryTile(label: "Uptime", value: formatUptime(health.uptimeSeconds))
                        ObservatoryTile(label: "Events", value: "\(health.eventsSeen)")
                        ObservatoryTile(label: "Cost Today", value: String(format: "$%.2f", missionControl.totalCostToday))
                    }
                }

                if missionControl.aiResources.isEmpty {
                    ContentUnavailableView(
                        "No active AI workloads",
                        systemImage: "gauge.with.dots.needle.67percent",
                        description: Text("Launch a mission to see per-agent model routing and resource usage.")
                    )
                    .frame(maxWidth: .infinity, minHeight: 200)
                } else {
                    ForEach(missionControl.aiResources) { resource in
                        AIResourceCard(resource: resource)
                    }
                }

                if !missionControl.dormantExperts.isEmpty {
                    Text("Dormant specialists")
                        .font(.headline)
                        .padding(.top, 8)
                    ForEach(missionControl.dormantExperts) { expert in
                        HStack {
                            Circle().fill(.secondary.opacity(0.4)).frame(width: 8, height: 8)
                            Text(expert.role)
                            Spacer()
                            Text(expert.preferredModel)
                                .font(.caption.monospaced())
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .onAppear {
            refresh()
            refreshTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { _ in
                refresh()
            }
        }
        .onDisappear {
            refreshTimer?.invalidate()
        }
    }

    private func refresh() {
        daemonClient.requestHealth { status in
            health = status
        }
        daemonClient.requestRuntimeSnapshot { snapshot in
            missionControl.updateExperts(from: snapshot)
        }
    }

    private func formatUptime(_ seconds: Int) -> String {
        let h = seconds / 3600
        let m = (seconds % 3600) / 60
        if h > 0 { return String(format: "%dh %dm", h, m) }
        if m > 0 { return String(format: "%dm", m) }
        return "\(seconds)s"
    }
}

struct AIResourceCard: View {
    let resource: AIResourceModel

    private var layerLabel: String {
        switch resource.layer {
        case 1: return "L1 · Apple"
        case 2: return "L2 · Ollama"
        case 3: return "L3 · Specialist"
        case 4: return "L4 · Cloud"
        default: return "L\(resource.layer)"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Circle()
                    .fill(resource.status == "running" ? .green : .secondary)
                    .frame(width: 10, height: 10)
                Text(resource.role)
                    .font(.headline)
                Spacer()
                Text(layerLabel)
                    .font(.caption2.bold())
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.blue.opacity(0.15))
                    .clipShape(Capsule())
            }

            Text("Model: \(resource.model)")
                .font(.subheadline.monospaced())

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                MetricChip(label: "CPU", value: "\(Int(resource.cpuPct))%")
                MetricChip(label: "RAM", value: String(format: "%.1f GB", resource.memMb / 1024))
                MetricChip(label: "Cost", value: resource.costTodayUsd > 0 ? String(format: "$%.2f", resource.costTodayUsd) : "$0")
                MetricChip(label: "Tokens", value: "\(resource.tokensUsed)")
                MetricChip(label: "Latency", value: resource.latencyMs > 0 ? "\(resource.latencyMs)ms" : "—")
                MetricChip(label: "Confidence", value: String(format: "%.0f%%", resource.confidence * 100))
            }
        }
        .padding(14)
        .background(.quaternary.opacity(0.35))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct MetricChip: View {
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.monospaced().weight(.medium))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(.background.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}

struct ObservatoryTile: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.system(.title3, design: .monospaced, weight: .medium))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(.quaternary.opacity(0.35))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
