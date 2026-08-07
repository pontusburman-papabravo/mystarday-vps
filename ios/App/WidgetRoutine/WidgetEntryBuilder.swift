import Foundation
import WidgetKit

enum WidgetEntryBuilder {
    static func buildFromStorageOrFetch(completion: @escaping (NextRoutineEntry) -> Void) {
        if WidgetBridgeStore.isSwitchInProgress() {
            completion(switchingEntry())
            return
        }

        if WidgetBridgeStore.isPendingActionInvalidated() {
            WidgetBridgeStore.clearPendingActionInvalidated()
            completion(switchingEntry())
            WidgetAPIClient.shared.fetchNextAction { _ in
                syncContext {
                    WidgetCenter.shared.reloadAllTimelines()
                }
            }
            return
        }

        if let feedback = WidgetBridgeStore.feedbackActive() {
            completion(feedbackEntry(stars: feedback.stars, title: feedback.title, childName: feedback.childName))
            return
        }

        if !WidgetBridgeStore.hasBinding() {
            completion(statusEntry(.reauth))
            return
        }

        WidgetAPIClient.shared.fetchNextAction { result in
            switch result {
            case .failure(let err):
                completion(mapError(err))
            case .success(let json):
                syncContext {
                    completion(mapNext(json))
                }
            }
        }
    }

    static func mapNext(_ json: [String: Any]) -> NextRoutineEntry {
        let privacy = WidgetBridgeStore.privacyMode()
        let flags = entryFlags()
        if privacy == "private" {
            return NextRoutineEntry(
                date: .now,
                phase: .privateOpenApp,
                routineTitle: WidgetL10n.routineHeader,
                activityTitle: WidgetL10n.actionOpenApp,
                pictogramEmoji: "🔒",
                progressCompleted: 0,
                progressTotal: 0,
                openAppReason: nil,
                timerDurationLabel: nil,
                instanceToken: nil,
                childLabel: childLabelIfAllowed(),
                feedbackStars: 0,
                feedbackTitle: "",
                feedbackChildName: "",
                allDoneMessage: WidgetL10n.allDoneNeutral,
                canSwitchChildren: flags.canSwitch
            )
        }

        let payload = WidgetNextPayload(json: json)
        let progress = payload.progress
        switch payload.status {
        case "all_done":
            let routine = (payload.activity?["routine_title"] as? String) ?? ""
            let msg = routine.lowercased().contains("morgon")
                ? WidgetL10n.allDoneMorning
                : WidgetL10n.allDoneNeutral
            return NextRoutineEntry(
                date: .now,
                phase: .allDone,
                routineTitle: routine.isEmpty ? WidgetL10n.routineHeader : routine,
                activityTitle: msg,
                pictogramEmoji: "⭐",
                progressCompleted: progress.completed,
                progressTotal: progress.total,
                openAppReason: nil,
                timerDurationLabel: nil,
                instanceToken: nil,
                childLabel: childLabelIfAllowed(),
                feedbackStars: 0,
                feedbackTitle: "",
                feedbackChildName: "",
                allDoneMessage: msg,
                canSwitchChildren: flags.canSwitch
            )
        case "nothing_now":
            return NextRoutineEntry(
                date: .now,
                phase: .nothingNow,
                routineTitle: WidgetL10n.routineHeader,
                activityTitle: WidgetL10n.nothingNow,
                pictogramEmoji: "⭐",
                progressCompleted: progress.completed,
                progressTotal: progress.total,
                openAppReason: nil,
                timerDurationLabel: nil,
                instanceToken: nil,
                childLabel: childLabelIfAllowed(),
                feedbackStars: 0,
                feedbackTitle: "",
                feedbackChildName: "",
                allDoneMessage: WidgetL10n.allDoneNeutral,
                canSwitchChildren: flags.canSwitch
            )
        case "ready":
            guard let activity = payload.activity else {
                return statusEntry(.nothingNow)
            }
            let title = activity["title"] as? String ?? WidgetL10n.genericNextStep
            let routine = activity["routine_title"] as? String ?? WidgetL10n.routineHeader
            let capability = activity["capability"] as? String ?? "direct_complete"
            let openReason = activity["open_app_reason"] as? String
            let imageKey = activity["image_key"] as? String
            let instanceToken = activity["instance_token"] as? String
            let emoji = WidgetPictogramMap.emoji(for: imageKey)
            let displayTitle = privacy == "reduced" ? WidgetL10n.genericNextStep : title
            let durationLabel = formatDuration(activity["duration_seconds"] as? Int)
            let tokenForUi = WidgetBridgeStore.isSwitchInProgress() ? nil : instanceToken

            if capability == "open_app" {
                return NextRoutineEntry(
                    date: .now,
                    phase: .readyOpenApp,
                    routineTitle: routine,
                    activityTitle: displayTitle,
                    pictogramEmoji: emoji,
                    progressCompleted: progress.completed,
                    progressTotal: progress.total,
                    openAppReason: openReason,
                    timerDurationLabel: durationLabel,
                    instanceToken: tokenForUi,
                    childLabel: childLabelIfAllowed(),
                    feedbackStars: 0,
                    feedbackTitle: "",
                    feedbackChildName: "",
                    allDoneMessage: WidgetL10n.allDoneNeutral,
                    canSwitchChildren: flags.canSwitch
                )
            }
            return NextRoutineEntry(
                date: .now,
                phase: .readyDirect,
                routineTitle: routine,
                activityTitle: displayTitle,
                pictogramEmoji: emoji,
                progressCompleted: progress.completed,
                progressTotal: progress.total,
                openAppReason: nil,
                timerDurationLabel: nil,
                instanceToken: tokenForUi,
                childLabel: childLabelIfAllowed(),
                feedbackStars: 0,
                feedbackTitle: "",
                feedbackChildName: "",
                allDoneMessage: WidgetL10n.allDoneNeutral,
                canSwitchChildren: flags.canSwitch
            )
        default:
            return statusEntry(.reauth)
        }
    }

    private static func formatDuration(_ seconds: Int?) -> String? {
        guard let s = seconds, s >= 60 else { return nil }
        let mins = max(1, s / 60)
        let preferred = Locale.preferredLanguages.first ?? "sv"
        if preferred.hasPrefix("en") { return "\(mins) min" }
        return "\(mins) min"
    }

    private static func entryFlags() -> (canSwitch: Bool) {
        (WidgetBridgeStore.canSwitchChildren() && !WidgetBridgeStore.isSwitchInProgress())
    }

    private static func childLabelIfAllowed() -> String? {
        let privacy = WidgetBridgeStore.privacyMode()
        if privacy == "private" || privacy == "reduced" { return nil }
        let viewer = WidgetBridgeStore.viewerMode()
        if viewer == "child_session" || viewer.isEmpty { return nil }
        return WidgetBridgeStore.widgetChildDisplayLabel()
    }

    private static func syncContext(then: @escaping () -> Void) {
        let viewer = WidgetBridgeStore.viewerMode()
        guard viewer != "child_session", !viewer.isEmpty else {
            then()
            return
        }
        WidgetAPIClient.shared.fetchContext { result in
            if case .success(let json) = result {
                applyContext(json)
            }
            then()
        }
    }

    static func applyContextFromSwitch(_ json: [String: Any]) {
        applyContext(json)
    }

    private static func applyContext(_ json: [String: Any]) {
        if let allowed = json["allowed_children"] as? [[String: Any]],
           let data = try? JSONSerialization.data(withJSONObject: allowed),
           let str = String(data: data, encoding: .utf8) {
            WidgetBridgeStore.setAllowedChildrenJson(str)
        }
        if let active = json["active_child"] as? [String: Any],
           let name = active["display_name"] as? String {
            let emoji = active["emoji"] as? String ?? ""
            let label = emoji.isEmpty ? name : "\(emoji) \(name)"
            WidgetBridgeStore.setWidgetChildDisplayLabel(label)
        }
    }

    static func mapError(_ error: WidgetAPIError) -> NextRoutineEntry {
        switch error {
        case .offline: return statusEntry(.offline)
        case .reauth: return statusEntry(.reauth)
        case .revoked: return statusEntry(.revoked)
        }
    }

    static func statusEntry(_ phase: WidgetPhase) -> NextRoutineEntry {
        let title: String
        switch phase {
        case .offline: title = WidgetL10n.offline
        case .reauth: title = WidgetL10n.reauth
        case .revoked: title = WidgetL10n.revoked
        case .nothingNow: title = WidgetL10n.nothingNow
        default: title = WidgetL10n.loading
        }
        return NextRoutineEntry(
            date: .now,
            phase: phase,
            routineTitle: WidgetL10n.routineHeader,
            activityTitle: title,
            pictogramEmoji: "⭐",
            progressCompleted: 0,
            progressTotal: 0,
            openAppReason: nil,
            timerDurationLabel: nil,
            instanceToken: nil,
            childLabel: nil,
            feedbackStars: 0,
            feedbackTitle: "",
            feedbackChildName: "",
            allDoneMessage: WidgetL10n.allDoneNeutral,
            canSwitchChildren: false
        )
    }

    static func switchingEntry() -> NextRoutineEntry {
        NextRoutineEntry(
            date: .now,
            phase: .switchingChild,
            routineTitle: WidgetL10n.routineHeader,
            activityTitle: WidgetL10n.switching,
            pictogramEmoji: "⭐",
            progressCompleted: 0,
            progressTotal: 0,
            openAppReason: nil,
            timerDurationLabel: nil,
            instanceToken: nil,
            childLabel: nil,
            feedbackStars: 0,
            feedbackTitle: "",
            feedbackChildName: "",
            allDoneMessage: WidgetL10n.allDoneNeutral,
            canSwitchChildren: false
        )
    }

    static func feedbackEntry(stars: Int, title: String, childName: String) -> NextRoutineEntry {
        NextRoutineEntry(
            date: .now,
            phase: .feedback,
            routineTitle: WidgetL10n.routineHeader,
            activityTitle: title.isEmpty ? WidgetL10n.feedbackDone : title,
            pictogramEmoji: "✓",
            progressCompleted: 0,
            progressTotal: 0,
            openAppReason: nil,
            timerDurationLabel: nil,
            instanceToken: nil,
            childLabel: childLabelIfAllowed(),
            feedbackStars: stars,
            feedbackTitle: title,
            feedbackChildName: childName,
            allDoneMessage: WidgetL10n.allDoneNeutral,
            canSwitchChildren: false
        )
    }
}
