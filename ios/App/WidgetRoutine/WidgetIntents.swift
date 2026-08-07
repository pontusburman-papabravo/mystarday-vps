import AppIntents
import WidgetKit

@available(iOS 17.0, *)
struct CompleteNextActivityIntent: AppIntent {
    static var title: LocalizedStringResource = "Klar"
    static var description = IntentDescription("Markera nästa aktivitet som klar.")

    @Parameter(title: "Instance token")
    var instanceToken: String

    @Parameter(title: "Idempotency key")
    var idempotencyKey: String

    init() {
        self.instanceToken = ""
        self.idempotencyKey = UUID().uuidString
    }

    init(instanceToken: String, idempotencyKey: String = UUID().uuidString) {
        self.instanceToken = instanceToken
        self.idempotencyKey = idempotencyKey
    }

    func perform() async throws -> some IntentResult {
        guard !instanceToken.isEmpty else { return .result() }
        guard WidgetBridgeStore.hasBinding() else { return .result() }

        let key = idempotencyKey.isEmpty ? UUID().uuidString : idempotencyKey
        let result: Result<[String: Any], WidgetAPIError> = await withCheckedContinuation { cont in
            WidgetAPIClient.shared.completeAction(instanceToken: instanceToken, idempotencyKey: key) { res in
                cont.resume(returning: res)
            }
        }

        switch result {
        case .failure:
            WidgetCenter.shared.reloadAllTimelines()
            return .result()
        case .success(let json):
            let status = json["status"] as? String ?? ""
            if status == "completed" || status == "already_completed" {
                let stars = (json["reward"] as? [String: Any])?["stars_added"] as? Int ?? 0
                let title = (json["completed"] as? [String: Any])?["title"] as? String ?? ""
                let until = Date().addingTimeInterval(2.2)
                WidgetBridgeStore.setFeedback(until: until, stars: stars, title: title)
            }
            if let next = json["next"] as? [String: Any] {
                _ = WidgetEntryBuilder.mapNext(next)
            }
            WidgetCenter.shared.reloadAllTimelines()
            return .result()
        }
    }
}

@available(iOS 17.0, *)
struct OpenChildTodayIntent: AppIntent {
    static var title: LocalizedStringResource = "Öppna appen"
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        .result()
    }
}
