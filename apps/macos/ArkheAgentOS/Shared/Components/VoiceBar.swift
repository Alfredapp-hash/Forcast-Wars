import SwiftUI

struct VoiceBar: View {
    let daemonClient: DaemonClient
    @StateObject private var speech = SpeechRecognizer()
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

            if state == .listening {
                Text(speech.transcript.isEmpty ? "Listening…" : speech.transcript)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            } else if state == .dormant {
                Text("Hold mic for voice, or type a Director command")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else if state == .processing {
                ProgressView()
                    .controlSize(.small)
                Text("Planning mission…")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            TextField("Director command…", text: $commandText)
                .textFieldStyle(.roundedBorder)
                .onSubmit { sendCommand(source: "ui") }

            if state != .processing {
                Button("Send") { sendCommand(source: "ui") }
                    .disabled(commandText.trimmingCharacters(in: .whitespaces).isEmpty && state == .dormant)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
        .shadow(radius: 4, y: 2)
        .frame(maxWidth: 680)
        .onAppear {
            speech.requestAuthorization()
        }
    }

    private func toggleListening() {
        if state == .listening {
            speech.stopListening()
            state = .processing
            let utterance = speech.transcript.trimmingCharacters(in: .whitespacesAndNewlines)
            if !utterance.isEmpty {
                sendCommand(source: "voice", utterance: utterance)
            } else {
                state = .dormant
            }
        } else {
            state = .listening
            commandText = ""
            try? speech.startListening()
        }
    }

    private func sendCommand(source: String, utterance: String? = nil) {
        let text = (utterance ?? commandText).trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }

        state = .processing
        daemonClient.sendCommand(utterance: text, source: source)

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            state = .dormant
            commandText = ""
        }
    }
}

enum VoiceBarState {
    case dormant
    case listening
    case processing
}
