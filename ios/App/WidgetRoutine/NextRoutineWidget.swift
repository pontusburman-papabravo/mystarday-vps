/**
 * R4.5 — WidgetKit extension (add target in Xcode).
 * Fetches GET /api/widget/next-action and completes via POST /api/widget/complete-action.
 * Binding token stored in App Group Keychain by main app / Capacitor bridge.
 */
import WidgetKit
import SwiftUI

struct NextRoutineEntry: TimelineEntry {
    let date: Date
    let status: String
    let title: String
    let routineTitle: String
    let canComplete: Bool
}

struct NextRoutineProvider: TimelineProvider {
    func placeholder(in context: Context) -> NextRoutineEntry {
        NextRoutineEntry(date: .now, status: "ready", title: "…", routineTitle: "Morgon", canComplete: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (NextRoutineEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NextRoutineEntry>) -> Void) {
        WidgetAPIClient.shared.fetchNext { entry in
            let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: .now) ?? .now
            completion(Timeline(entries: [entry], policy: .after(refresh)))
        }
    }
}

struct NextRoutineWidgetView: View {
    var entry: NextRoutineProvider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(entry.routineTitle)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(entry.title)
                .font(.headline)
                .lineLimit(2)
            if entry.canComplete {
                Button(intent: CompleteNextActivityIntent()) {
                    Text("Klar")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
    }
}

@main
struct NextRoutineWidgetBundle: WidgetBundle {
    var body: some Widget {
        WidgetKit.Widget(configuration: StaticConfiguration(kind: "NextRoutineWidget", provider: NextRoutineProvider()) { entry in
            NextRoutineWidgetView(entry: entry)
        })
        .configurationDisplayName("Nästa aktivitet")
        .description("Markera nästa rutinsteg utan att öppna hela appen.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
