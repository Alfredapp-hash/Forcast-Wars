import Foundation

/// Maintains a WebSocket connection to the Hermes routing service at ws://127.0.0.1:4000/ws.
/// Receives approval_requested / approval_resolved frames and feeds them to ApprovalsStore.
/// All approval resolution commands are sent back through the daemon DaemonClient (already wired);
/// Hermes is receive-only from the macOS side for now.
final class HermesClient: @unchecked Sendable {
    var onApprovalRequested: ((HermesApprovalPayload) -> Void)?
    var onApprovalResolved: ((String, Bool) -> Void)?

    private let wsURL: URL
    private var webSocketTask: URLSessionWebSocketTask?
    private let session = URLSession(configuration: .default)
    private var reconnectAttempt = 0
    private var stopped = false

    init(url: URL = URL(string: "ws://127.0.0.1:4000/ws")!) {
        self.wsURL = url
    }

    func connect() {
        guard !stopped else { return }
        webSocketTask = session.webSocketTask(with: wsURL)
        webSocketTask?.resume()
        receiveLoop()
        print("[HermesClient] connecting to \(wsURL)")
    }

    func disconnect() {
        stopped = true
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
    }

    func resolveApproval(approvalId: String, granted: Bool) {
        let urlStr = wsURL.absoluteString
            .replacingOccurrences(of: "ws://", with: "http://")
            .replacingOccurrences(of: "wss://", with: "https://")
            .replacingOccurrences(of: "/ws", with: "")
        guard let url = URL(string: "\(urlStr)/approvals/\(approvalId)/resolve") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.timeoutInterval = 5
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["granted": granted])
        URLSession.shared.dataTask(with: req) { _, _, error in
            if let error {
                print("[HermesClient] resolveApproval error: \(error.localizedDescription)")
            }
        }.resume()
    }

    // MARK: - Private

    private func receiveLoop() {
        webSocketTask?.receive { [weak self] result in
            guard let self, !self.stopped else { return }
            switch result {
            case .success(let message):
                self.handle(message)
                self.receiveLoop()
            case .failure(let error):
                print("[HermesClient] receive error: \(error.localizedDescription)")
                self.scheduleReconnect()
            }
        }
    }

    private func handle(_ message: URLSessionWebSocketTask.Message) {
        guard case .string(let text) = message,
              let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }

        let event = json["event"] as? String ?? json["type"] as? String ?? ""
        let payload = json["data"] ?? json["payload"] ?? json

        switch event {
        case "approval_requested":
            guard let dict = payload as? [String: Any],
                  let approval = HermesApprovalPayload(dict: dict) else { return }
            DispatchQueue.main.async { self.onApprovalRequested?(approval) }

        case "approval_resolved":
            guard let dict = payload as? [String: Any],
                  let approvalId = dict["approvalId"] as? String,
                  let granted = dict["granted"] as? Bool else { return }
            DispatchQueue.main.async { self.onApprovalResolved?(approvalId, granted) }

        case "connected":
            self.reconnectAttempt = 0
            print("[HermesClient] connected to Hermes")

        default:
            break
        }
    }

    private func scheduleReconnect() {
        guard !stopped else { return }
        let delay = min(30.0, 1.5 * pow(1.6, Double(min(reconnectAttempt, 8))))
        reconnectAttempt += 1
        DispatchQueue.global().asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.connect()
        }
    }
}

// MARK: - Payload model

struct HermesApprovalPayload: Sendable {
    let approvalId: String
    let riskClass: String
    let action: String
    let summary: String
    let requestedBy: String
    let missionId: String?
    let expiresAt: String?

    init?(dict: [String: Any]) {
        guard let approvalId = dict["approvalId"] as? String else { return nil }
        self.approvalId = approvalId
        self.riskClass = dict["riskClass"] as? String ?? "yellow"
        self.action = dict["action"] as? String ?? "unknown"
        self.summary = dict["summary"] as? String ?? "Approval required"
        self.requestedBy = (dict["requestedBy"] as? String) ?? (dict["requestedByAgentId"] as? String) ?? "agent"
        self.missionId = dict["missionId"] as? String
        self.expiresAt = dict["expiresAt"] as? String
    }
}
