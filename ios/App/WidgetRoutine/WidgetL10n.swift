import Foundation

enum WidgetL10n {
    private static var isEnglish: Bool {
        let preferred = Locale.preferredLanguages.first ?? "sv"
        return preferred.hasPrefix("en")
    }

    static var routineHeader: String { isEnglish ? "Next activity" : "Nästa aktivitet" }
    static var loading: String { isEnglish ? "Loading…" : "Laddar…" }
    static var actionDone: String { isEnglish ? "Done" : "Klar" }
    static var actionOpenTimer: String { isEnglish ? "Open timer" : "Öppna timglas" }
    static var actionShowSteps: String { isEnglish ? "Show steps" : "Visa steg" }
    static var actionOpenApp: String { isEnglish ? "Open the app" : "Öppna appen" }
    static var allDoneNeutral: String { isEnglish ? "All done for now ✓" : "Allt klart just nu ✓" }
    static var allDoneMorning: String { isEnglish ? "Morning is done" : "Morgonen är klar" }
    static var nothingNow: String { isEnglish ? "Nothing right now" : "Inget just nu" }
    static var offline: String { isEnglish ? "No connection" : "Ingen nätverksanslutning" }
    static var reauth: String { isEnglish ? "Sign in in the app" : "Logga in i appen" }
    static var revoked: String { isEnglish ? "Device access revoked" : "Enheten har återkallats" }
    static var switching: String { isEnglish ? "Switching child…" : "Byter barn…" }
    static var feedbackDone: String { isEnglish ? "✓ Done!" : "✓ Klart!" }
    static var genericNextStep: String { isEnglish ? "Next step" : "Nästa steg" }

    static func progress(_ completed: Int, _ total: Int) -> String {
        if isEnglish { return "\(completed)/\(total)" }
        return "\(completed)/\(total)"
    }

    static func starsAdded(_ n: Int) -> String { "⭐ +\(n)" }
}
