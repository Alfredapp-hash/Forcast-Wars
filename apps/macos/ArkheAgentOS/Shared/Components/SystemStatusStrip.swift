import SwiftUI

struct SystemAlert: Identifiable, Equatable {
    let id: String
    let severity: Severity
    let title: String
    let message: String
    let actionTitle: String?
    let action: (() -> Void)?

    enum Severity {
        case info, warning, error

        var color: Color {
            Color.arkheSeverity(self)
        }

        var icon: String {
            switch self {
            case .info: return "info.circle.fill"
            case .warning: return "exclamationmark.triangle.fill"
            case .error: return "xmark.octagon.fill"
            }
        }
    }

    static func == (lhs: SystemAlert, rhs: SystemAlert) -> Bool {
        lhs.id == rhs.id && lhs.title == rhs.title && lhs.message == rhs.message
    }
}

struct SystemStatusStrip: View {
    let alerts: [SystemAlert]
    var onDismiss: ((String) -> Void)?

    var body: some View {
        if !alerts.isEmpty {
            VStack(spacing: 6) {
                ForEach(alerts) { alert in
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: alert.severity.icon)
                            .foregroundStyle(alert.severity.color)
                            .font(.body)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(alert.title)
                                .font(.subheadline.weight(.semibold))
                            Text(alert.message)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        Spacer(minLength: 8)
                        if let actionTitle = alert.actionTitle, let action = alert.action {
                            Button(actionTitle, action: action)
                                .controlSize(.small)
                        }
                        if let onDismiss {
                            Button {
                                onDismiss(alert.id)
                            } label: {
                                Image(systemName: "xmark")
                                    .font(.caption2)
                            }
                            .buttonStyle(.plain)
                            .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(alert.severity.color.opacity(0.08))
                    .overlay(ArkheSurface.bannerBorder(alert.severity.color))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 8)
        }
    }
}
