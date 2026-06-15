import SwiftUI

/// Consistent empty state used across primary screens.
struct EmptyStateView: View {
    let title: String
    let systemImage: String
    let description: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: systemImage)
                .font(.system(size: 36))
                .foregroundStyle(Color.arkheMuted.opacity(0.55))
                .symbolRenderingMode(.hierarchical)

            VStack(spacing: 6) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .buttonStyle(.bordered)
                    .controlSize(.regular)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 28)
        .padding(.horizontal, 20)
        .background(Color.arkheInfo.opacity(0.04))
        .overlay(ArkheSurface.bannerBorder(Color.arkheInfo.opacity(0.35)))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
