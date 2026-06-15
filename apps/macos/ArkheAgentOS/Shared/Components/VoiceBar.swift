import SwiftUI

/// Bottom command bar — primary text input on every tab (voice optional).
struct VoiceBar: View {
    @Environment(AppState.self) private var appState
    let daemonClient: DaemonClient
    @FocusState private var commandFocused: Bool
    @StateObject private var speech = SpeechRecognizer()
    @State private var state: VoiceBarState = .dormant
    @State private var commandText = ""

    var body: some View {
        HStack(spacing: 12) {
            Text("Director")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .frame(width: 52, alignment: .leading)

            TextField("Type a command — e.g. audit my website at arkhe.com", text: $commandText)
                .textFieldStyle(.roundedBorder)
                .focused($commandFocused)
                .onSubmit { sendCommand(source: "ui") }

            Button("Send") { sendCommand(source: "ui") }
                .keyboardShortcut(.return, modifiers: .command)
                .disabled(!canSend)

            Button {
                toggleListening()
            } label: {
                Image(systemName: state == .listening ? "mic.fill" : "mic")
            }
            .buttonStyle(.bordered)
            .help(state == .listening ? "Stop listening" : "Voice input")
            .disabled(state == .processing)

            if state == .listening {
                Text(speech.transcript.isEmpty ? "Listening…" : speech.transcript)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .frame(maxWidth: 140, alignment: .leading)
            } else if state == .processing {
                ProgressView().controlSize(.small)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.bar)
        .overlay(alignment: .top) { Divider() }
        .onAppear { speech.requestAuthorization() }
        .onChange(of: appState.commandBarFocusToken) { _, _ in
            commandFocused = true
        }
    }

    private var canSend: Bool {
        state != .processing && !commandText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
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
