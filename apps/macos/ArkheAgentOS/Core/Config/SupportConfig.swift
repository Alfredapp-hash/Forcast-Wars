import Foundation

enum SupportConfig {
    static let supportEmail: String = {
        if let env = ProcessInfo.processInfo.environment["ARKHE_SUPPORT_EMAIL"],
           !env.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return env
        }
        return "support@arkhe.com"
    }()

    static let feedbackIssuesURL: URL = {
        if let env = ProcessInfo.processInfo.environment["ARKHE_FEEDBACK_URL"],
           let url = URL(string: env.trimmingCharacters(in: .whitespacesAndNewlines)),
           !env.isEmpty {
            return url
        }
        return URL(string: "https://github.com/arkhe/agentos/issues/new")!
    }()

    static var mailtoURL: URL {
        var components = URLComponents()
        components.scheme = "mailto"
        components.path = supportEmail
        components.queryItems = [
            URLQueryItem(name: "subject", value: "Arkhe AgentOS Feedback"),
        ]
        return components.url ?? URL(string: "mailto:\(supportEmail)")!
    }

    static let privacyPolicyURL: URL = {
        if let env = ProcessInfo.processInfo.environment["ARKHE_PRIVACY_URL"],
           let url = URL(string: env.trimmingCharacters(in: .whitespacesAndNewlines)),
           !env.isEmpty {
            return url
        }
        return URL(string: "https://arkhe.com/privacy")!
    }()
}
