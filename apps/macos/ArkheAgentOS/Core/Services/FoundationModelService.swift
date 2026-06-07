import Foundation

#if canImport(FoundationModels)
import FoundationModels
#endif

enum FoundationModelService {
    static var isAvailable: Bool {
        #if canImport(FoundationModels)
        if #available(macOS 26.0, *) {
            return SystemLanguageModel.default.isAvailable
        }
        #endif
        return false
    }

    static func generate(prompt: String, taskClass: String) async -> String? {
        #if canImport(FoundationModels)
        if #available(macOS 26.0, *) {
            guard SystemLanguageModel.default.isAvailable else { return nil }
            let session = LanguageModelSession(instructions: """
                You are Arkhe AgentOS on-device model. Task class: \(taskClass).
                Respond concisely with actionable output only.
                """)
            do {
                let response = try await session.respond(to: prompt)
                return response.content.trimmingCharacters(in: .whitespacesAndNewlines)
            } catch {
                print("[FoundationModelService] inference error: \(error)")
                return nil
            }
        }
        #endif
        return nil
    }
}
