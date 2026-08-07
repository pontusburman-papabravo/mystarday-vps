import AppIntents
import WidgetKit

// MARK: - Widget configuration (iOS 17+, R4.5 closure)

@available(iOS 17.0, *)
enum WidgetModeOption: String, AppEnum {
    case personal
    case family

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Widgettyp")
    static var caseDisplayRepresentations: [WidgetModeOption: DisplayRepresentation] = [
        .personal: "Personlig",
        .family: "Familj",
    ]
}

@available(iOS 17.0, *)
struct WidgetChildEntity: AppEntity, Identifiable {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Barn")
    static var defaultQuery = WidgetChildEntityQuery()

    var id: String
    var displayName: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(displayName)")
    }
}

@available(iOS 17.0, *)
struct WidgetChildEntityQuery: EntityQuery {
    func entities(for identifiers: [WidgetChildEntity.ID]) async throws -> [WidgetChildEntity] {
        let all = try await suggestedEntities()
        return all.filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [WidgetChildEntity] {
        guard let json = WidgetBridgeStore.allowedChildrenJson(installationId: nil)
            ?? WidgetBridgeStore.allowedChildrenJson(installationId: "default"),
              let data = json.data(using: .utf8),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            if let active = WidgetBridgeStore.activeChildId(installationId: nil),
               let label = WidgetBridgeStore.widgetChildDisplayLabel(installationId: nil) {
                return [WidgetChildEntity(id: active, displayName: label)]
            }
            return []
        }
        return arr.compactMap { row in
            guard let id = row["id"] as? String else { return nil }
            let name = row["display_name"] as? String ?? "Barn"
            let emoji = row["emoji"] as? String ?? ""
            let label = emoji.isEmpty ? name : "\(emoji) \(name)"
            return WidgetChildEntity(id: id, displayName: label)
        }
    }
}

@available(iOS 17.0, *)
struct NextRoutineWidgetConfigIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Rutinwidget"
    static var description = IntentDescription("Välj personlig eller familjewidget.")

    @Parameter(title: "Typ")
    var widgetMode: WidgetModeOption

    @Parameter(title: "Barn")
    var selectedChild: WidgetChildEntity?

    @Parameter(title: "Widget instance", default: "")
    var widgetInstanceId: String

    init() {
        widgetMode = .personal
        widgetInstanceId = UUID().uuidString
    }

    init(widgetMode: WidgetModeOption, selectedChild: WidgetChildEntity?, widgetInstanceId: String) {
        self.widgetMode = widgetMode
        self.selectedChild = selectedChild
        self.widgetInstanceId = widgetInstanceId
    }
}

@available(iOS 17.0, *)
enum WidgetConfigureHelper {
    static func applyConfiguration(_ intent: NextRoutineWidgetConfigIntent, widgetInstanceId: String) async {
        let baseInst = WidgetBridgeStore.installationId(forScope: nil)
            ?? WidgetBridgeStore.installationId(forScope: "default")
            ?? UUID().uuidString
        let installationId = "\(baseInst):wi:\(widgetInstanceId)"
        WidgetBridgeStore.setWidgetInstanceId(widgetInstanceId, installationId: installationId)
        WidgetBridgeStore.setWidgetMode(intent.widgetMode.rawValue, installationId: installationId)

        let childId = intent.selectedChild?.id
        if intent.widgetMode == .personal, let childId = childId {
            WidgetBridgeStore.setLockedChildId(childId, installationId: installationId)
        } else {
            WidgetBridgeStore.setLockedChildId(nil, installationId: installationId)
        }

        WidgetBridgeStore.migrateLegacyBindingIfNeeded(targetInstallationId: installationId)

        if WidgetBridgeStore.hasBinding(installationId: installationId) {
            if let locked = WidgetBridgeStore.lockedChildId(installationId: installationId),
               locked != WidgetBridgeStore.activeChildId(installationId: installationId) {
                await rebindIfNeeded(installationId: installationId, childId: locked)
            }
            return
        }

        let targetChild = childId ?? WidgetBridgeStore.activeChildId(installationId: installationId)
        guard let targetChild = targetChild else { return }
        await rebindIfNeeded(installationId: installationId, childId: targetChild)
    }

    private static func rebindIfNeeded(installationId: String, childId: String) async {
        let rebind: Result<[String: Any], WidgetAPIError> = await withCheckedContinuation { cont in
            WidgetBridgeStore.timelineScope = installationId
            WidgetAPIClient.shared.rebindInstallation(
                installationId: installationId,
                childId: childId
            ) { res in
                cont.resume(returning: res)
            }
        }

        if case .success(let json) = rebind,
           let token = json["binding_token"] as? String,
           let boundChild = json["child_id"] as? String {
            try? WidgetBridgeStore.saveBinding(
                token: token,
                activeChildId: boundChild,
                viewerMode: WidgetBridgeStore.viewerMode(installationId: installationId),
                privacyMode: WidgetBridgeStore.privacyMode(installationId: installationId),
                installationId: installationId
            )
            if let ctx = json["context"] as? [String: Any] {
                WidgetEntryBuilder.applyContextFromSwitch(ctx, installationId: installationId)
            }
        }
        WidgetBridgeStore.timelineScope = nil
    }
}
