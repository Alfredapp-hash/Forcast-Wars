import Foundation

final class DaemonClient: @unchecked Sendable {
    var onEvent: ((EventStreamMessage) -> Void)?
    var onConnectionChange: ((Bool) -> Void)?

    private var webSocketTask: URLSessionWebSocketTask?
    private let session = URLSession(configuration: .default)
    private let wsURL = URL(string: "ws://127.0.0.1:9470")!
    private var isConnected = false

    func connect() {
        webSocketTask = session.webSocketTask(with: wsURL)
        webSocketTask?.resume()
        receiveLoop()
        sendJSON(["type": "subscribe", "topics": ["arkhe.events.*"]])
    }

    func sendCommand(utterance: String, source: String) {
        sendJSON([
            "type": "command",
            "payload": [
                "utterance": utterance,
                "source": source,
            ],
        ])
    }

    func sendKillSwitch() {
        sendJSON(["type": "kill_switch"])
    }

    private func sendJSON(_ object: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: object),
              let text = String(data: data, encoding: .utf8) else { return }
        webSocketTask?.send(.string(text)) { error in
            if let error {
                print("[DaemonClient] send error: \(error)")
            }
        }
    }

    private func receiveLoop() {
        webSocketTask?.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let message):
                self.handle(message)
                self.receiveLoop()
            case .failure(let error):
                print("[DaemonClient] receive error: \(error)")
                self.setConnected(false)
                DispatchQueue.global().asyncAfter(deadline: .now() + 2) {
                    self.connect()
                }
            }
        }
    }

    private func handle(_ message: URLSessionWebSocketTask.Message) {
        guard case .string(let text) = message,
              let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else { return }

        switch type {
        case "connected":
            setConnected(true)
        case "event":
            if let eventData = try? JSONSerialization.data(withJSONObject: json["message"] ?? [:]),
               let streamMessage = try? JSONDecoder().decode(EventStreamMessage.self, from: eventData) {
                DispatchQueue.main.async {
                    self.onEvent?(streamMessage)
                }
            }
        default:
            break
        }
    }

    private func setConnected(_ connected: Bool) {
        guard connected != isConnected else { return }
        isConnected = connected
        DispatchQueue.main.async {
            self.onConnectionChange?(connected)
        }
    }
}
