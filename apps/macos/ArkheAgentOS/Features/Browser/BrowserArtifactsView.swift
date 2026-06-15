import SwiftUI
import WebKit

// MARK: - Data Models

private enum BrowserArtifactType: String, Hashable {
    case screenshot = "screenshot"
    case dom        = "dom"
    case text       = "text"
    case form       = "form"
    case buttonMap  = "button-map"
    case agentNote  = "agent-note"

    var icon: String {
        switch self {
        case .screenshot: return "camera.fill"
        case .dom:        return "chevron.left.forwardslash.chevron.right"
        case .text:       return "doc.text.fill"
        case .form:       return "rectangle.and.pencil.and.ellipsis"
        case .buttonMap:  return "square.grid.3x3.fill"
        case .agentNote:  return "brain"
        }
    }
    var accent: Color {
        switch self {
        case .screenshot: return .cyan
        case .dom:        return .purple
        case .text:       return .blue
        case .form:       return .orange
        case .buttonMap:  return .yellow
        case .agentNote:  return .green
        }
    }
}

private struct BrowserArtifactItem: Identifiable, Hashable {
    let id: String
    let type: BrowserArtifactType
    let label: String
    let createdAt: Date
}

private struct BrowserSession: Identifiable, Hashable {
    let id: String
    let title: String
    let url: String
    let domain: String
    let screenshotImage: NSImage?
    let artifacts: [BrowserArtifactItem]
    let createdAt: Date
    var visitCount: Int

    static func == (lhs: BrowserSession, rhs: BrowserSession) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }

    static let samples: [BrowserSession] = {
        let rows: [(String, String, String)] = [
            ("google.com",        "Google",                            "https://www.google.com"),
            ("github.com",        "ArkheApps / Arkhe-AgentOS",         "https://github.com/ArkheApps"),
            ("openai.com",        "OpenAI Platform",                   "https://platform.openai.com"),
            ("openai.com",        "API Reference — Chat",              "https://platform.openai.com/docs"),
            ("stripe.com",        "Stripe Dashboard",                  "https://dashboard.stripe.com"),
            ("vercel.com",        "Vercel — Dashboard",                "https://vercel.com/dashboard"),
        ]
        return rows.enumerated().map { i, row in
            let (domain, title, url) = row
            return BrowserSession(
                id: "sample-\(i)",
                title: title,
                url: url,
                domain: domain,
                screenshotImage: nil,
                artifacts: [
                    BrowserArtifactItem(id: "\(i)-ss",   type: .screenshot, label: "page.png",     createdAt: Date()),
                    BrowserArtifactItem(id: "\(i)-dom",  type: .dom,        label: "dom.json",      createdAt: Date()),
                    BrowserArtifactItem(id: "\(i)-txt",  type: .text,       label: "content.txt",   createdAt: Date()),
                ],
                createdAt: Date().addingTimeInterval(-Double(i) * 3600),
                visitCount: Int.random(in: 1...12)
            )
        }
    }()
}

private struct DomainGroup: Identifiable {
    let domain: String
    let sessions: [BrowserSession]
    var id: String { domain }
    var latest: BrowserSession { sessions[0] }
}

private struct CookieConsent: Identifiable, Hashable {
    let id: String
    let domain: String
    var choice: Choice
    let createdAt: Date
    enum Choice: String { case accept, reject, custom }
}

// MARK: - Browser View Model

private final class BrowserViewModel: ObservableObject {
    weak var webView: WKWebView?

    func navigate(to url: URL)  { webView?.load(URLRequest(url: url)) }
    func goBack()               { webView?.goBack() }
    func goForward()            { webView?.goForward() }
    func reload()               { webView?.reload() }
    func capturePage()          { /* placeholder: post to daemon */ }

    func acceptCookies() {
        webView?.evaluateJavaScript("if(window._arkheCookieAccept){window._arkheCookieAccept()}")
    }
    func rejectCookies() {
        webView?.evaluateJavaScript("if(window._arkheCookieReject){window._arkheCookieReject()}")
    }
}

// MARK: - Main View

struct BrowserArtifactsView: View {
    @State private var sessions: [BrowserSession]      = []
    @State private var groups:   [DomainGroup]         = []
    @State private var selectedSessionId: String?      = nil
    @State private var expandedDomains: Set<String>    = []
    @State private var cookieConsents: [String: CookieConsent] = [:]
    @State private var showNewTabSheet = false
    @State private var newTabURL = ""

    private var selectedSession: BrowserSession? {
        sessions.first { $0.id == selectedSessionId }
    }

    var body: some View {
        HSplitView {
            sessionSidebar
                .frame(minWidth: 280, idealWidth: 340, maxWidth: 420)

            Group {
                if let session = selectedSession {
                    BrowserPreviewPane(
                        session: session,
                        cookieConsent: cookieConsents[session.domain],
                        onCookieChoice: { domain, choice in
                            cookieConsents[domain] = CookieConsent(
                                id: domain, domain: domain, choice: choice, createdAt: Date()
                            )
                        }
                    )
                } else {
                    BrowserEmptyState(onNewTab: { showNewTabSheet = true })
                }
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .onAppear { loadSessions() }
        .sheet(isPresented: $showNewTabSheet) { newTabSheet }
    }

    private var newTabSheet: some View {
        VStack(spacing: 20) {
            HStack {
                Image(systemName: "globe").foregroundStyle(.cyan)
                Text("Open URL").font(.headline)
                Spacer()
                Button("Cancel") { showNewTabSheet = false }.buttonStyle(.plain)
            }
            HStack {
                Image(systemName: "lock.fill").font(.caption).foregroundStyle(.secondary)
                TextField("https://", text: $newTabURL)
                    .textFieldStyle(.roundedBorder)
                    .font(.system(size: 13, design: .monospaced))
                    .onSubmit { openNewTab() }
            }
            HStack {
                Spacer()
                Button("Open") { openNewTab() }
                    .buttonStyle(.borderedProminent)
                    .tint(.cyan)
                    .disabled(newTabURL.isEmpty)
            }
        }
        .padding(24)
        .frame(width: 460)
    }

    private func openNewTab() {
        var raw = newTabURL.trimmingCharacters(in: .whitespaces)
        if !raw.hasPrefix("http") { raw = "https://" + raw }
        guard let url = URL(string: raw), let host = url.host else { return }
        let session = BrowserSession(
            id: UUID().uuidString, title: host, url: raw, domain: host,
            screenshotImage: nil, artifacts: [], createdAt: Date(), visitCount: 1
        )
        sessions.insert(session, at: 0)
        groups = Dictionary(grouping: sessions, by: \.domain)
            .map { DomainGroup(domain: $0.key, sessions: $0.value) }
            .sorted { $0.sessions.count > $1.sessions.count }
        selectedSessionId = session.id
        newTabURL = ""
        showNewTabSheet = false
    }

    // MARK: Sidebar

    private var sessionSidebar: some View {
        VStack(spacing: 0) {
            sidebarHeader
            Divider()
            ScrollView {
                LazyVStack(spacing: 1) {
                    ForEach(groups) { group in
                        DomainGroupRow(
                            group: group,
                            isExpanded: expandedDomains.contains(group.domain),
                            selectedId: selectedSessionId,
                            onToggle: { toggle(domain: group.domain) },
                            onSelect: { selectedSessionId = $0 }
                        )
                    }
                }
                .padding(.vertical, 6)
            }
        }
        .background(.ultraThinMaterial)
    }

    private var sidebarHeader: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "globe")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.cyan)
                Text("Browser Sessions")
                    .font(.system(size: 12, weight: .semibold))
                Spacer()
                Text("\(sessions.count)")
                    .font(.system(size: 10, weight: .bold).monospacedDigit())
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.white.opacity(0.06))
                    .clipShape(Capsule())
                Button(action: loadSessions) {
                    Image(systemName: "arrow.clockwise").font(.caption)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 14)
            .padding(.top, 10)
            .padding(.bottom, 8)

            // New Tab button
            Button(action: { showNewTabSheet = true }) {
                HStack(spacing: 6) {
                    Image(systemName: "plus")
                        .font(.system(size: 10, weight: .bold))
                    Text("New Tab")
                        .font(.system(size: 11, weight: .semibold))
                    Spacer()
                    Text("⌘T")
                        .font(.system(size: 9))
                        .foregroundStyle(.tertiary)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(Color.cyan.opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 0)
                        .stroke(Color.cyan.opacity(0.15), lineWidth: 0.5)
                )
                .foregroundStyle(.cyan)
            }
            .buttonStyle(.plain)
            .keyboardShortcut("t", modifiers: .command)
        }
    }

    // MARK: Data loading

    private func toggle(domain: String) {
        if expandedDomains.contains(domain) { expandedDomains.remove(domain) }
        else { expandedDomains.insert(domain) }
    }

    private func loadSessions() {
        let root = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".arkhe/artifacts")
        var loaded: [BrowserSession] = []

        if let entries = try? FileManager.default.contentsOfDirectory(
            at: root,
            includingPropertiesForKeys: [.isDirectoryKey, .creationDateKey],
            options: [.skipsHiddenFiles]
        ) {
            for dir in entries.sorted(by: { $0.lastPathComponent > $1.lastPathComponent }) {
                guard (try? dir.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true else { continue }
                let ssURL  = dir.appendingPathComponent("page.png")
                let domURL = dir.appendingPathComponent("dom.json")
                var title: String?
                var urlStr: String?
                var domain = dir.lastPathComponent

                if let data = try? Data(contentsOf: domURL),
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    title  = json["title"] as? String
                    urlStr = json["url"] as? String
                    if let u = urlStr.flatMap(URL.init), let h = u.host { domain = h }
                }
                let files    = (try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? []
                let created  = (try? dir.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? Date()
                let artifacts: [BrowserArtifactItem] = files.compactMap { file in
                    let ext = (file as NSString).pathExtension.lowercased()
                    let artType: BrowserArtifactType
                    if file == "page.png" { artType = .screenshot }
                    else if ext == "json" { artType = .dom }
                    else if ext == "txt"  { artType = .text }
                    else { return nil }
                    return BrowserArtifactItem(id: "\(dir.lastPathComponent)/\(file)", type: artType, label: file, createdAt: created)
                }
                loaded.append(BrowserSession(
                    id: dir.lastPathComponent, title: title ?? "Capture",
                    url: urlStr ?? "", domain: domain,
                    screenshotImage: NSImage(contentsOf: ssURL),
                    artifacts: artifacts, createdAt: created, visitCount: 1
                ))
            }
        }
        if loaded.isEmpty { loaded = BrowserSession.samples }
        sessions = loaded
        groups   = Dictionary(grouping: loaded, by: \.domain)
            .map { DomainGroup(domain: $0.key, sessions: $0.value.sorted { $0.createdAt > $1.createdAt }) }
            .sorted { $0.sessions.count > $1.sessions.count }
        if selectedSessionId == nil { selectedSessionId = loaded.first?.id }
    }
}

// MARK: - Domain Group Row

private struct DomainGroupRow: View {
    let group: DomainGroup
    let isExpanded: Bool
    let selectedId: String?
    let onToggle: () -> Void
    let onSelect: (String) -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Domain header button
            Button(action: onToggle) {
                HStack(spacing: 10) {
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(.secondary)
                        .frame(width: 12)

                    Image(systemName: "globe")
                        .font(.system(size: 11))
                        .foregroundStyle(.cyan)
                        .frame(width: 18, height: 18)
                        .background(Color.cyan.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 4))

                    VStack(alignment: .leading, spacing: 1) {
                        Text(group.domain)
                            .font(.system(size: 12, weight: .semibold))
                            .lineLimit(1)
                        Text(group.latest.title)
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    Spacer()

                    Text("\(group.sessions.count)")
                        .font(.system(size: 9, weight: .black).monospacedDigit())
                        .foregroundStyle(.cyan)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(Color.cyan.opacity(0.12))
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(Color.cyan.opacity(0.25), lineWidth: 0.5))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.white.opacity(0.02))
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            // Expanded child sessions
            if isExpanded {
                VStack(spacing: 0) {
                    ForEach(group.sessions) { session in
                        SessionRowView(
                            session: session,
                            isSelected: selectedId == session.id,
                            onSelect: { onSelect(session.id) }
                        )
                    }
                }
                .padding(.leading, 28)
            }
        }
    }
}

// MARK: - Session Row

private struct SessionRowView: View {
    let session: BrowserSession
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 10) {
                if let img = session.screenshotImage {
                    Image(nsImage: img)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 48, height: 32)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.white.opacity(0.08)))
                } else {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white.opacity(0.04))
                        .frame(width: 48, height: 32)
                        .overlay(Image(systemName: "photo").font(.caption2).foregroundStyle(.tertiary))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(session.title)
                        .font(.system(size: 11, weight: .medium))
                        .lineLimit(1)
                    HStack(spacing: 4) {
                        // Artifact type icons
                        ForEach(session.artifacts.prefix(4)) { art in
                            Image(systemName: art.type.icon)
                                .font(.system(size: 8))
                                .foregroundStyle(art.type.accent)
                        }
                        Spacer()
                        Text(session.createdAt.formatted(.relative(presentation: .named)))
                            .font(.system(size: 9))
                            .foregroundStyle(.tertiary)
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(isSelected ? Color.cyan.opacity(0.12) : Color.clear)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Browser Preview Pane

private struct BrowserPreviewPane: View {
    let session: BrowserSession
    let cookieConsent: CookieConsent?
    let onCookieChoice: (String, CookieConsent.Choice) -> Void

    @StateObject private var vm = BrowserViewModel()
    @State private var urlString: String = ""
    @State private var showCookieBar: Bool = false
    @State private var showAgentPanel: Bool = false
    @State private var agentMode: Bool = false
    @State private var isConnected = true
    @State private var agentLog: [AgentLogEntry] = []

    private var sessionURL: URL? { URL(string: session.url) }

    var body: some View {
        VStack(spacing: 0) {
            BrowserToolbar(
                urlString: $urlString,
                isConnected: isConnected,
                agentMode: $agentMode,
                onNavigate: {
                    var raw = urlString.trimmingCharacters(in: .whitespaces)
                    if !raw.hasPrefix("http") { raw = "https://" + raw }
                    urlString = raw
                    if let url = URL(string: raw) { vm.navigate(to: url) }
                },
                onBack:    { vm.goBack()    },
                onForward: { vm.goForward() },
                onReload:  { vm.reload()    },
                onCapture: { vm.capturePage() },
                onCookieToggle: { showCookieBar.toggle() },
                onOpenExternal: {
                    if let url = URL(string: urlString) { NSWorkspace.shared.open(url) }
                },
                onAskAgent: { showAgentPanel.toggle() }
            )

            Divider()

            // Cookie consent bar (manual toggle or auto-shown)
            if showCookieBar {
                CookieConsentBar(
                    domain: session.domain,
                    onAccept: {
                        vm.acceptCookies()
                        onCookieChoice(session.domain, .accept)
                        showCookieBar = false
                    },
                    onReject: {
                        vm.rejectCookies()
                        onCookieChoice(session.domain, .reject)
                        showCookieBar = false
                    },
                    onCustomize: { onCookieChoice(session.domain, .custom) },
                    onDismiss:   { showCookieBar = false }
                )
                Divider()
            }

            // Agent mode banner
            if agentMode {
                AgentModeBanner(log: agentLog, onStop: { agentMode = false })
                Divider()
            }

            ZStack(alignment: .bottomTrailing) {
                if let url = sessionURL {
                    SmartWebView(url: url, viewModel: vm)
                } else if let img = session.screenshotImage {
                    Image(nsImage: img).resizable().scaledToFit()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    BrowserEmptyState(onNewTab: {})
                }

                if showAgentPanel {
                    AgentActionPanel(
                        session: session,
                        onDispatch: { action in dispatchAgent(action: action) },
                        onDismiss: { showAgentPanel = false }
                    )
                    .padding(16)
                }
            }
        }
        .onAppear {
            urlString = session.url
        }
        .onChange(of: session.id) { _ in
            urlString = session.url
            showCookieBar = false
            agentMode = false
            agentLog = []
            if let url = URL(string: session.url) { vm.navigate(to: url) }
        }
    }

    private func dispatchAgent(action: String) {
        agentMode = true
        showAgentPanel = false
        let entry = AgentLogEntry(ts: Date(), action: action, status: .running)
        agentLog.append(entry)
        // Simulate agent completing after delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            if let idx = agentLog.firstIndex(where: { $0.id == entry.id }) {
                agentLog[idx] = AgentLogEntry(ts: entry.ts, action: action, status: .done)
            }
        }
    }
}

// MARK: - Browser Toolbar

private struct BrowserToolbar: View {
    @Binding var urlString: String
    let isConnected: Bool
    @Binding var agentMode: Bool
    let onNavigate:      () -> Void
    let onBack:          () -> Void
    let onForward:       () -> Void
    let onReload:        () -> Void
    let onCapture:       () -> Void
    let onCookieToggle:  () -> Void
    let onOpenExternal:  () -> Void
    let onAskAgent:      () -> Void

    var body: some View {
        HStack(spacing: 8) {
            Button(action: onBack)    { Image(systemName: "chevron.left")  }
            Button(action: onForward) { Image(systemName: "chevron.right") }
            Button(action: onReload)  { Image(systemName: "arrow.clockwise") }

            Divider().frame(height: 16)

            // URL bar
            HStack(spacing: 6) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 9))
                    .foregroundStyle(.green.opacity(0.7))
                TextField("Search or enter address", text: $urlString)
                    .textFieldStyle(.plain)
                    .font(.system(size: 11))
                    .onSubmit(onNavigate)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 7))
            .overlay(RoundedRectangle(cornerRadius: 7).stroke(Color.white.opacity(0.1)))
            .frame(maxWidth: .infinity)

            Divider().frame(height: 16)

            Button(action: onCapture) {
                Label("Capture", systemImage: "camera.fill")
                    .font(.system(size: 10, weight: .medium))
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            .tint(.cyan)

            // Cookie banner toggle
            Button(action: onCookieToggle) {
                Image(systemName: "hand.raised.fill")
                    .font(.system(size: 11))
            }
            .help("Handle cookie consent")

            // Agent dispatch button
            Button(action: onAskAgent) {
                HStack(spacing: 4) {
                    Image(systemName: agentMode ? "stop.fill" : "brain")
                        .font(.system(size: 10))
                    Text(agentMode ? "Agent Active" : "Dispatch Agent")
                        .font(.system(size: 10, weight: .semibold))
                }
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            .tint(agentMode ? .orange : .purple)

            Button(action: onOpenExternal) {
                Image(systemName: "arrow.up.right.square")
            }

            Divider().frame(height: 16)

            HStack(spacing: 4) {
                Circle()
                    .fill(isConnected ? Color.green : Color.red)
                    .frame(width: 5, height: 5)
                    .shadow(color: isConnected ? .green : .red, radius: 3)
                Text("Daemon")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .buttonStyle(.plain)
        .foregroundStyle(.secondary)
    }
}

// MARK: - Cookie Consent Bar

private struct CookieConsentBar: View {
    let domain: String
    let onAccept: () -> Void
    let onReject: () -> Void
    let onCustomize: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "hand.raised.fill")
                .foregroundStyle(.orange)
                .font(.system(size: 12))

            Text("**\(domain)** may show a cookie consent banner.")
                .font(.system(size: 11))
                .lineLimit(1)

            Spacer()

            Button("Accept", action: onAccept)
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
                .tint(.cyan)

            Button("Reject", action: onReject)
                .buttonStyle(.bordered)
                .controlSize(.small)

            Button("Customize", action: onCustomize)
                .buttonStyle(.plain)
                .font(.system(size: 10))
                .foregroundStyle(.secondary)

            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 9, weight: .semibold))
            }
            .buttonStyle(.plain)
            .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(Color.orange.opacity(0.06))
    }
}

// MARK: - Agent Action Panel

private struct AgentLogEntry: Identifiable {
    let id = UUID()
    let ts: Date
    let action: String
    var status: Status
    enum Status { case running, done, failed }
}

private struct AgentModeBanner: View {
    let log: [AgentLogEntry]
    let onStop: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "brain")
                .foregroundStyle(.purple)
                .font(.system(size: 12))
            VStack(alignment: .leading, spacing: 2) {
                Text("Agent Playground — Active")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.purple)
                if let last = log.last {
                    HStack(spacing: 4) {
                        if last.status == .running {
                            ProgressView().scaleEffect(0.5).frame(width: 10, height: 10)
                        } else {
                            Image(systemName: "checkmark.circle.fill").font(.system(size: 8)).foregroundStyle(.green)
                        }
                        Text(last.action)
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            Spacer()
            Text("\(log.count) task\(log.count == 1 ? "" : "s")")
                .font(.system(size: 9).monospacedDigit())
                .foregroundStyle(.secondary)
            Button("Stop Agent", action: onStop)
                .buttonStyle(.bordered)
                .controlSize(.small)
                .tint(.red)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.purple.opacity(0.07))
    }
}

private struct AgentActionPanel: View {
    let session: BrowserSession
    let onDispatch: (String) -> Void
    let onDismiss: () -> Void

    private struct AgentAction: Identifiable {
        let id = UUID()
        let label: String
        let icon: String
        let color: Color
    }

    private let actions: [AgentAction] = [
        AgentAction(label: "Summarize this page",    icon: "text.bubble.fill",         color: .cyan),
        AgentAction(label: "Extract all CTAs",       icon: "cursorarrow.rays",          color: .purple),
        AgentAction(label: "Find pricing info",      icon: "dollarsign.circle.fill",    color: .green),
        AgentAction(label: "Check SEO signals",      icon: "magnifyingglass",           color: .orange),
        AgentAction(label: "Screenshot + annotate",  icon: "camera.fill",              color: .blue),
        AgentAction(label: "Record replay session",  icon: "record.circle.fill",        color: .red),
        AgentAction(label: "Fill & submit form",     icon: "rectangle.and.pencil.and.ellipsis", color: .yellow),
        AgentAction(label: "Extract all links",      icon: "link",                      color: .teal),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Label("Agent Playground", systemImage: "brain")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.purple)
                Spacer()
                Button(action: onDismiss) {
                    Image(systemName: "xmark").font(.system(size: 9, weight: .bold))
                }
                .buttonStyle(.plain).foregroundStyle(.secondary)
            }
            Text(session.domain)
                .font(.system(size: 9, design: .monospaced))
                .foregroundStyle(.tertiary)
            Divider()
            ForEach(actions) { action in
                Button(action: { onDispatch(action.label) }) {
                    HStack(spacing: 8) {
                        Image(systemName: action.icon)
                            .font(.system(size: 11))
                            .foregroundStyle(action.color)
                            .frame(width: 18)
                        Text(action.label)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.primary)
                        Spacer()
                        Image(systemName: "play.fill")
                            .font(.system(size: 8))
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.vertical, 4)
                    .padding(.horizontal, 6)
                    .background(Color.white.opacity(0.03))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(14)
        .frame(width: 240)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.08)))
        .shadow(color: .black.opacity(0.45), radius: 20, y: 8)
    }
}

// MARK: - Smart WebView (cookie-aware)

private struct SmartWebView: NSViewRepresentable {
    let url: URL
    let viewModel: BrowserViewModel

    private static let cookieJS = """
    (function(){
        var sel=[
            '#onetrust-banner-sdk','#cookiebanner','.cookie-banner','.cookie-consent',
            '.cookie-notice','[class*="cookie-bar"]','[class*="cookieConsent"]',
            '.cc-window','[id*="CookieConsent"]','[aria-label*="ookie"]'
        ];
        function accept(){
            var a=['#onetrust-accept-btn-handler','[id*="accept-all"]',
                   '[class*="accept"]','.cc-btn.cc-allow','button[title*="Accept"]'];
            for(var i=0;i<a.length;i++){
                var b=document.querySelector(a[i]);if(b){b.click();return;}
            }
        }
        function reject(){
            var r=['#onetrust-reject-all-handler','[id*="reject-all"]',
                   '[class*="reject"]','.cc-btn.cc-deny'];
            for(var i=0;i<r.length;i++){
                var b=document.querySelector(r[i]);if(b){b.click();return;}
            }
        }
        window._arkheCookieAccept=accept;
        window._arkheCookieReject=reject;
    })();
    """

    func makeNSView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        let uc  = WKUserContentController()
        uc.addUserScript(WKUserScript(source: Self.cookieJS, injectionTime: .atDocumentEnd, forMainFrameOnly: false))
        cfg.userContentController = uc

        let wv = WKWebView(frame: .zero, configuration: cfg)
        viewModel.webView = wv
        wv.load(URLRequest(url: url))
        return wv
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        viewModel.webView = webView
        if webView.url?.absoluteString != url.absoluteString {
            webView.load(URLRequest(url: url))
        }
    }
}

// MARK: - Empty State

private struct BrowserEmptyState: View {
    var onNewTab: () -> Void
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "globe")
                .font(.system(size: 44))
                .foregroundStyle(.cyan.opacity(0.35))
            Text("Agent Browser")
                .font(.title2.bold())
                .foregroundStyle(.secondary)
            Text("Open any URL or pick a session to start browsing.")
                .font(.caption)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
            Button(action: onNewTab) {
                Label("New Tab", systemImage: "plus")
                    .font(.system(size: 12, weight: .semibold))
            }
            .buttonStyle(.borderedProminent)
            .tint(.cyan)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(nsColor: .windowBackgroundColor))
    }
}
