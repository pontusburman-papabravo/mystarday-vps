import Foundation
import WidgetKit

enum WidgetEntryBuilder {
    private static var activeInstallation: String? {
        WidgetBridgeStore.timelineScope ?? WidgetBridgeStore.installationId(forScope: nil)
    }

    static func buildFromStorageOrFetch(installationId: String? = nil, completion: @escaping (NextRoutineEntry) -> Void) {
        let prior = WidgetBridgeStore.timelineScope
        if let installationId = installationId {
            WidgetBridgeStore.timelineScope = installationId
            WidgetBridgeStore.migrateLegacyBindingIfNeeded(targetInstallationId: installationId)
        }
        defer { WidgetBridgeStore.timelineScope = prior }

        let inst = activeInstallation
        if WidgetBridgeStore.isSwitchInProgress(installationId: inst) {
            completion(switchingEntry(installationId: inst))
            return
        }

        if WidgetBridgeStore.isPendingActionInvalidated(installationId: inst) {
            WidgetBridgeStore.clearPendingActionInvalidated(installationId: inst)
            completion(switchingEntry(installationId: inst))
            WidgetAPIClient.shared.fetchNextAction { _ in
                syncContext(installationId: inst) {
                    WidgetCenter.shared.reloadAllTimelines()
                }
            }
            return
        }

        if let feedback = WidgetBridgeStore.feedbackActive(installationId: inst) {
            completion(feedbackEntry(stars: feedback.stars, title: feedback.title, childName: feedback.childName, installationId: inst))
            return
        }

        if !WidgetBridgeStore.hasBinding(installationId: inst) {
            completion(statusEntry(.reauth, installationId: inst))
            return
        }

        WidgetAPIClient.shared.fetchNextAction { result in
            switch result {
            case .failure(let err):
                completion(mapError(err, installationId: inst))
            case .success(let json):
                syncContext(installationId: inst) {
                    completion(mapNext(json, installationId: inst))
                }
            }
        }
    }

    static func mapNext(_ json: [String: Any], installationId: String? = nil) -> NextRoutineEntry {
        let inst = installationId ?? activeInstallation
        let privacy = WidgetBridgeStore.privacyMode(installationId: inst)
        let flags = entryFlags(installationId: inst)
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
                childLabel: childLabelIfAllowed(installationId: inst),
                feedbackStars: 0,
                feedbackTitle: "",
                feedbackChildName: "",
                allDoneMessage: WidgetL10n.allDoneNeutral,
                canSwitchChildren: flags.canSwitch,
                installationId: inst
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
                childLabel: childLabelIfAllowed(installationId: inst),
                feedbackStars: 0,
                feedbackTitle: "",
                feedbackChildName: "",
                allDoneMessage: msg,
                canSwitchChildren: flags.canSwitch,
                installationId: inst
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
                childLabel: childLabelIfAllowed(installationId: inst),
                feedbackStars: 0,
                feedbackTitle: "",
                feedbackChildName: "",
                allDoneMessage: WidgetL10n.allDoneNeutral,
                canSwitchChildren: flags.canSwitch,
                installationId: inst
            )
        case "ready":
            guard let activity = payload.activity else {
                return statusEntry(.nothingNow, installationId: inst)
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
            let tokenForUi = WidgetBridgeStore.isSwitchInProgress(installationId: inst) ? nil : instanceToken

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
                    childLabel: childLabelIfAllowed(installationId: inst),
                    feedbackStars: 0,
                    feedbackTitle: "",
                    feedbackChildName: "",
                    allDoneMessage: WidgetL10n.allDoneNeutral,
                    canSwitchChildren: flags.canSwitch,
                    installationId: inst
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
                childLabel: childLabelIfAllowed(installationId: inst),
                feedbackStars: 0,
                feedbackTitle: "",
                feedbackChildName: "",
                allDoneMessage: WidgetL10n.allDoneNeutral,
                canSwitchChildren: flags.canSwitch,
                installationId: inst
            )
        default:
            return statusEntry(.reauth, installationId: inst)
        }
    }

    private static func formatDuration(_ seconds: Int?) -> String? {
        guard let s = seconds, s >= 60 else { return nil }
        let mins = max(1, s / 60)
        let preferred = Locale.preferredLanguages.first ?? "sv"
        if preferred.hasPrefix("en") { return "\(mins) min" }
        return "\(mins) min"
    }

    private static func entryFlags(installationId: String?) -> (canSwitch: Bool) {
        (
            WidgetBridgeStore.canSwitchChildren(installationId: installationId)
                && !WidgetBridgeStore.isSwitchInProgress(installationId: installationId)
        )
    }

    private static func childLabelIfAllowed(installationId: String?) -> String? {
        let privacy = WidgetBridgeStore.privacyMode(installationId: installationId)
        if privacy == "private" || privacy == "reduced" { return nil }
        let viewer = WidgetBridgeStore.viewerMode(installationId: installationId)
        if viewer == "child_session" || viewer.isEmpty { return nil }
        return WidgetBridgeStore.widgetChildDisplayLabel(installationId: installationId)
    }

    private static func syncContext(installationId: String?, then: @escaping () -> Void) {
        let viewer = WidgetBridgeStore.viewerMode(installationId: installationId)
        guard viewer != "child_session", !viewer.isEmpty else {
            then()
            return
        }
        let prior = WidgetBridgeStore.timelineScope
        WidgetBridgeStore.timelineScope = installationId
        WidgetAPIClient.shared.fetchContext { result in
            if case .success(let json) = result {
                applyContext(json, installationId: installationId)
            }
            WidgetBridgeStore.timelineScope = prior
            then()
        }
    }

    static func applyContextFromSwitch(_ json: [String: Any], installationId: String? = nil) {
        applyContext(json, installationId: installationId)
    }

    private static func applyContext(_ json: [String: Any], installationId: String?) {
        if let allowed = json["allowed_children"] as? [[String: Any]],
           let data = try? JSONSerialization.data(withJSONObject: allowed),
           let str = String(data: data, encoding: .utf8) {
            WidgetBridgeStore.setAllowedChildrenJson(str, installationId: installationId)
        }
        if let active = json["active_child"] as? [String: Any],
           let name = active["display_name"] as? String {
            let emoji = active["emoji"] as? String ?? ""
            let label = emoji.isEmpty ? name : "\(emoji) \(name)"
            WidgetBridgeStore.setWidgetChildDisplayLabel(label, installationId: installationId)
        }
    }

    static func mapError(_ error: WidgetAPIError, installationId: String? = nil) -> NextRoutineEntry {
        switch error {
        case .offline: return statusEntry(.offline, installationId: installationId)
        case .reauth: return statusEntry(.reauth, installationId: installationId)
        case .revoked: return statusEntry(.revoked, installationId: installationId)
        }
    }

    static func statusEntry(_ phase: WidgetPhase, installationId: String? = nil) -> NextRoutineEntry {
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
            canSwitchChildren: false,
            installationId: installationId
        )
    }

    static func switchingEntry(installationId: String? = nil) -> NextRoutineEntry {
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
            canSwitchChildren: false,
            installationId: installationId
        )
    }

    static func feedbackEntry(
        stars: Int,
        title: String,
        childName: String,
        installationId: String? = nil
    ) -> NextRoutineEntry {
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
            childLabel: childLabelIfAllowed(installationId: installationId),
            feedbackStars: stars,
            feedbackTitle: title,
            feedbackChildName: childName,
            allDoneMessage: WidgetL10n.allDoneNeutral,
            canSwitchChildren: false,
            installationId: installationId
        )
    }
}
