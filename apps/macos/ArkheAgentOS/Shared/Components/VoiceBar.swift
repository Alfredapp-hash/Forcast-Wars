import SwiftUI

enum VoiceBarState {
    case dormant
    case listening
    case processing
    case speaking
}

struct VoiceBar: View {
    let daemonClient: DaemonClient
    @State private var state: VoiceBarState = .dormant
    @State private var commandText = ""

    var body: some View {
        HStack(spacing: 12) {
            Button {
                toggleListening()
            } label: {
                Image(systemName: state == .listening ? "mic.fill" : "mic")
                    .font(.title3)
                    .foregroundStyle(state == .listening ? .red : .primary)
            }
            .buttonStyle(.plain)

            if state == .dormant {
                Text("Say \"Director, create a mission\" or type below")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else if state == .processing {
                ProgressView()
                    .controlSize(.small)
                Text("Planning mission…")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                TextField("Director command…", text: $commandText)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit { sendCommand() }
            }

            if state != .processing {
                Button("Send") { sendCommand() }
                    .disabled(commandText.trimmingCharacters(in: .whitespaces).isEmpty && state == .dormant)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
        .shadow(radius: 4, y: 2)
        .frame(maxWidth: 560)
    }

    private func toggleListening() {
        if state == .listening {
            state = .dormant
        } else {
            state = .listening
            commandText = ""
        }
    }

    private func sendCommand() {
        let utterance = commandText.trimmingCharacters(in: .whitespaces)
        guard !utterance.isEmpty else { return }

        state = .processing
        daemonClient.sendCommand(utterance: utterance, source: "ui")

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            state = .dormant
            commandText = ""
        }
    }
}
