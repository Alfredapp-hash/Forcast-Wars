import Foundation

enum DaemonLaunchOutcome: Sendable, Equatable {
    case alreadyRunning
    case started(pid: Int32, usedBundledNode: Bool)
    case entryNotFound
    case startFailed(String)
    case startedButUnreachable(pid: Int32)

    var userMessage: String {
        switch self {
        case .alreadyRunning:
            return "Daemon is running at ws://127.0.0.1:9470"
        case .started(let pid, let bundled):
            let nodeSource = bundled ? "bundled Node" : "system Node"
            return "Started local daemon (pid \(pid)) via \(nodeSource)"
        case .entryNotFound:
            return "Could not locate the daemon entrypoint. Run `pnpm bundle:daemon` and rebuild the app, or set ARKHE_REPO_ROOT for dev."
        case .startFailed(let reason):
            return "Failed to start daemon: \(reason)"
        case .startedButUnreachable(let pid):
            return "Daemon process started (pid \(pid)) but ws://127.0.0.1:9470 is not responding yet. Retry in a few seconds."
        }
    }

    var isHealthy: Bool {
        switch self {
        case .alreadyRunning, .started: return true
        default: return false
        }
    }
}

final class DaemonLauncher: @unchecked Sendable {
    private var process: Process?
    private let wsURL = URL(string: "ws://127.0.0.1:9470")!
    private(set) var lastOutcome: DaemonLaunchOutcome?

    @discardableResult
    func ensureRunning() -> DaemonLaunchOutcome {
        if isDaemonReachable() {
            let outcome: DaemonLaunchOutcome = .alreadyRunning
            lastOutcome = outcome
            return outcome
        }

        guard let entry = resolveDaemonEntry() else {
            let outcome: DaemonLaunchOutcome = .entryNotFound
            lastOutcome = outcome
            print("[DaemonLauncher] \(outcome.userMessage)")
            return outcome
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: entry.nodePath)
        process.arguments = [entry.scriptPath]
        process.currentDirectoryURL = entry.workingDirectory
        process.environment = buildEnvironment(base: entry.workingDirectory)

        do {
            try process.run()
            self.process = process
            print("[DaemonLauncher] Started daemon pid \(process.processIdentifier) (bundledNode=\(entry.usedBundledNode))")
        } catch {
            let outcome: DaemonLaunchOutcome = .startFailed(error.localizedDescription)
            lastOutcome = outcome
            print("[DaemonLauncher] \(outcome.userMessage)")
            return outcome
        }

        if waitForDaemonReachable(timeoutSeconds: 5) {
            let outcome: DaemonLaunchOutcome = .started(
                pid: process.processIdentifier,
                usedBundledNode: entry.usedBundledNode
            )
            lastOutcome = outcome
            return outcome
        }

        let outcome: DaemonLaunchOutcome = .startedButUnreachable(pid: process.processIdentifier)
        lastOutcome = outcome
        print("[DaemonLauncher] \(outcome.userMessage)")
        return outcome
    }

    func stop() {
        process?.terminate()
        process = nil
    }

    private func buildEnvironment(base: URL) -> [String: String] {
        var env = ProcessInfo.processInfo.environment
        env["ARKHE_WS_PORT"] = "9470"
        env["ARKHE_DATA_DIR"] = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".arkhe").path

        let homeEnv = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".arkhe/daemon.env")
        mergeEnvFile(homeEnv.path, into: &env)

        let bundledEnv = base.appendingPathComponent("daemon.env.example")
        if FileManager.default.fileExists(atPath: bundledEnv.path) {
            mergeEnvFile(bundledEnv.path, into: &env)
        }

        return env
    }

    private func mergeEnvFile(_ path: String, into env: inout [String: String]) {
        guard let contents = try? String(contentsOfFile: path, encoding: .utf8) else { return }
        for line in contents.split(separator: "\n") {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.isEmpty || trimmed.hasPrefix("#") { continue }
            let parts = trimmed.split(separator: "=", maxSplits: 1)
            guard parts.count == 2 else { continue }
            env[String(parts[0])] = String(parts[1])
        }
    }

    private func waitForDaemonReachable(timeoutSeconds: Double) -> Bool {
        let deadline = Date().addingTimeInterval(timeoutSeconds)
        while Date() < deadline {
            if isDaemonReachable() { return true }
            Thread.sleep(forTimeInterval: 0.35)
        }
        return isDaemonReachable()
    }

    private func isDaemonReachable() -> Bool {
        let semaphore = DispatchSemaphore(value: 0)
        var reachable = false
        let task = URLSession.shared.webSocketTask(with: wsURL)
        task.resume()
        task.send(.string("{\"type\":\"health\"}")) { _ in }
        task.receive { result in
            if case .success = result { reachable = true }
            semaphore.signal()
        }
        _ = semaphore.wait(timeout: .now() + 0.8)
        task.cancel(with: .goingAway, reason: nil)
        return reachable
    }

    private func resolveDaemonEntry() -> (nodePath: String, scriptPath: String, workingDirectory: URL, usedBundledNode: Bool)? {
        if let bundledScript = Bundle.main.url(forResource: "index", withExtension: "js", subdirectory: "Daemon/dist"),
           let bundledRoot = Bundle.main.resourceURL?.appendingPathComponent("Daemon") {
            if let bundledNode = Bundle.main.url(forResource: "node", withExtension: nil, subdirectory: "Daemon/bin"),
               FileManager.default.fileExists(atPath: bundledNode.path) {
                return (bundledNode.path, bundledScript.path, bundledRoot, true)
            }
            if let nodePath = resolveSystemNode() {
                return (nodePath, bundledScript.path, bundledRoot, false)
            }
        }

        if let devRoot = ProcessInfo.processInfo.environment["ARKHE_REPO_ROOT"] {
            let script = URL(fileURLWithPath: devRoot).appendingPathComponent("apps/local-daemon/dist/index.js")
            if FileManager.default.fileExists(atPath: script.path),
               let nodePath = resolveSystemNode() {
                return (nodePath, script.path, URL(fileURLWithPath: devRoot), false)
            }
        }

        let fallbackRoot = "/Users/purduelaw/Desktop/Projects/ArkheApps/Arkhe-AgentOS"
        let script = URL(fileURLWithPath: fallbackRoot).appendingPathComponent("apps/local-daemon/dist/index.js")
        if FileManager.default.fileExists(atPath: script.path),
           let nodePath = resolveSystemNode() {
            return (nodePath, script.path, URL(fileURLWithPath: fallbackRoot), false)
        }

        return nil
    }

    private func resolveSystemNode() -> String? {
        let candidates = [
            ProcessInfo.processInfo.environment["NODE_PATH"],
            "/opt/homebrew/bin/node",
            "/usr/local/bin/node",
            "/usr/bin/node",
        ].compactMap { $0 }
        return candidates.first { FileManager.default.fileExists(atPath: $0) }
    }
}
