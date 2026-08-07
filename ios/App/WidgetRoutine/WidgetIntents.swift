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

    @Parameter(title: "Installation")
    var installationId: String

    init() {
        self.instanceToken = ""
        self.idempotencyKey = UUID().uuidString
        self.installationId = ""
    }

    init(instanceToken: String, idempotencyKey: String = UUID().uuidString, installationId: String = "") {
        self.instanceToken = instanceToken
        self.idempotencyKey = idempotencyKey
        self.installationId = installationId
    }

    func perform() async throws -> some IntentResult {
        guard !instanceToken.isEmpty else { return .result() }
        let inst = installationId.isEmpty ? nil : installationId
        WidgetBridgeStore.timelineScope = inst
        defer { WidgetBridgeStore.timelineScope = nil }
        guard WidgetBridgeStore.hasBinding(installationId: inst) else { return .result() }
        guard !WidgetBridgeStore.isSwitchInProgress(installationId: inst) else { return .result() }
        guard !WidgetBridgeStore.isPendingActionInvalidated(installationId: inst) else {
            WidgetCenter.shared.reloadAllTimelines()
            return .result()
        }

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
                let until = Date().addingTimeInterval(1.2)
                var childName = ""
                let viewer = WidgetBridgeStore.viewerMode(installationId: inst)
                if viewer != "child_session", !viewer.isEmpty {
                    childName = activeChildDisplayName(installationId: inst) ?? ""
                }
                if stars > 0 || status == "completed" {
                    WidgetBridgeStore.setFeedback(
                        until: until,
                        stars: stars,
                        title: title,
                        childNameForParent: childName,
                        installationId: inst
                    )
                }
            }
            if let next = json["next"] as? [String: Any] {
                _ = WidgetEntryBuilder.mapNext(next, installationId: inst)
            }
            WidgetCenter.shared.reloadAllTimelines()
            return .result()
        }
    }
}

@available(iOS 17.0, *)
struct SwitchChildIntent: AppIntent {
    static var title: LocalizedStringResource = "Byt barn"

    @Parameter(title: "Direction")
    var direction: String

    @Parameter(title: "Installation")
    var installationId: String

    init() {
        self.direction = "next"
        self.installationId = ""
    }

    init(direction: String, installationId: String = "") {
        self.direction = direction
        self.installationId = installationId
    }

    func perform() async throws -> some IntentResult {
        let inst = installationId.isEmpty ? nil : installationId
        WidgetBridgeStore.timelineScope = inst
        defer { WidgetBridgeStore.timelineScope = nil }
        guard WidgetBridgeStore.canSwitchChildren(installationId: inst) else { return .result() }
        guard let targetId = resolveTargetChildId(direction: direction, installationId: inst) else { return .result() }

        WidgetBridgeStore.setSwitchInProgress(true, installationId: inst)
        WidgetBridgeStore.invalidatePendingAction(installationId: inst)
        WidgetCenter.shared.reloadAllTimelines()

        let result: Result<[String: Any], WidgetAPIError> = await withCheckedContinuation { cont in
            WidgetAPIClient.shared.switchChild(targetChildId: targetId) { res in
                cont.resume(returning: res)
            }
        }

        defer {
            WidgetBridgeStore.setSwitchInProgress(false, installationId: inst)
            WidgetCenter.shared.reloadAllTimelines()
        }

        switch result {
        case .failure:
            return .result()
        case .success(let json):
            if let token = json["binding_token"] as? String,
               let childId = json["child_id"] as? String {
                try? WidgetBridgeStore.updateBindingFromSwitch(
                    token: token,
                    activeChildId: childId,
                    installationId: inst
                )
            }
            if let ctx = json["context"] as? [String: Any] {
                WidgetEntryBuilder.applyContextFromSwitch(ctx, installationId: inst)
            }
            if let next = json["next"] as? [String: Any] {
                _ = WidgetEntryBuilder.mapNext(next, installationId: inst)
            }
            return .result()
        }
    }

    private func resolveTargetChildId(direction: String, installationId: String?) -> String? {
        guard let json = WidgetBridgeStore.allowedChildrenJson(installationId: installationId),
              let data = json.data(using: .utf8),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
              arr.count > 1 else { return nil }
        let activeId = WidgetBridgeStore.activeChildId(installationId: installationId)
        var idx = 0
        for (i, c) in arr.enumerated() {
            if let id = c["id"] as? String, id == activeId {
                idx = i
                break
            }
        }
        if direction == "next" {
            idx = (idx + 1) % arr.count
        } else {
            idx = (idx - 1 + arr.count) % arr.count
        }
        return arr[idx]["id"] as? String
    }
}

private func activeChildDisplayName(installationId: String?) -> String? {
    guard let json = WidgetBridgeStore.allowedChildrenJson(installationId: installationId),
          let data = json.data(using: .utf8),
          let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
          let activeId = WidgetBridgeStore.activeChildId(installationId: installationId) else { return nil }
    for c in arr {
        if let id = c["id"] as? String, id == activeId {
            return c["display_name"] as? String
        }
    }
    return nil
}

@available(iOS 17.0, *)
struct OpenChildTodayIntent: AppIntent {
    static var title: LocalizedStringResource = "Öppna appen"
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        .result()
    }
}
