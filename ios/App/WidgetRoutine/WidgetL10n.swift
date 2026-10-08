import Foundation

/// Widget copy comes from Localizable.strings in the widget bundle.
/// A new public locale is a new .lproj, not a branch in this file.
enum WidgetL10n {
    private static func text(_ key: String) -> String {
        NSLocalizedString(key, tableName: nil, bundle: .main, value: key, comment: "")
    }

    static var routineHeader: String { text("widget_routine_header") }
    static var loading: String { text("widget_loading") }
    static var actionDone: String { text("widget_action_done") }
    static var actionOpenTimer: String { text("widget_action_open_timer") }
    static var actionShowSteps: String { text("widget_action_show_steps") }
    static var actionOpenApp: String { text("widget_action_open_app") }
    static var allDoneNeutral: String { text("widget_all_done_neutral") }
    static var allDoneMorning: String { text("widget_all_done_morning") }
    static var nothingNow: String { text("widget_nothing_now") }
    static var offline: String { text("widget_offline") }
    static var reauth: String { text("widget_reauth") }
    static var revoked: String { text("widget_revoked") }
    static var switching: String { text("widget_switching") }
    static var switchChildPrev: String { text("widget_switch_child_prev") }
    static var switchChildNext: String { text("widget_switch_child_next") }
    static var feedbackDone: String { text("widget_feedback_done") }
    static var genericNextStep: String { text("widget_generic_next_step") }

    static func progress(_ completed: Int, _ total: Int) -> String {
        "\(completed)/\(total)"
    }

    static func starsAdded(_ n: Int) -> String { "⭐ +\(n)" }

    static func feedbackDoneFor(_ name: String) -> String {
        String(format: text("widget_feedback_done_for"), name)
    }
}
