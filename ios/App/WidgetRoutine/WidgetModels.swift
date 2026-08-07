import Foundation

enum WidgetPhase: String {
    case loading
    case readyDirect
    case readyOpenApp
    case allDone
    case nothingNow
    case offline
    case reauth
    case revoked
    case switchingChild
    case feedback
    case privateOpenApp
}

struct NextRoutineEntry: TimelineEntry {
    let date: Date
    let phase: WidgetPhase
    let routineTitle: String
    let activityTitle: String
    let pictogramEmoji: String
    let progressCompleted: Int
    let progressTotal: Int
    let openAppReason: String?
    let timerDurationLabel: String?
    let instanceToken: String?
    let childLabel: String?
    let feedbackStars: Int
    let feedbackTitle: String
    let feedbackChildName: String
    let allDoneMessage: String
    let canSwitchChildren: Bool

    static func loading() -> NextRoutineEntry {
        NextRoutineEntry(
            date: .now,
            phase: .loading,
            routineTitle: WidgetL10n.routineHeader,
            activityTitle: WidgetL10n.loading,
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
}

struct WidgetNextPayload {
    let json: [String: Any]

    var status: String { json["status"] as? String ?? "" }

    var activity: [String: Any]? { json["activity"] as? [String: Any] }

    var progress: (completed: Int, total: Int) {
        guard let p = json["progress"] as? [String: Any]
            ?? activity?["progress"] as? [String: Any] else { return (0, 0) }
        return (p["completed"] as? Int ?? 0, p["total"] as? Int ?? 0)
    }
}
