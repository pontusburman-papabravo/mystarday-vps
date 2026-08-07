import WidgetKit
import SwiftUI

struct NextRoutineProvider: TimelineProvider {
    func placeholder(in context: Context) -> NextRoutineEntry {
        .loading()
    }

    func getSnapshot(in context: Context, completion: @escaping (NextRoutineEntry) -> Void) {
        if context.isPreview {
            completion(previewEntry())
            return
        }
        WidgetEntryBuilder.buildFromStorageOrFetch(completion: completion)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NextRoutineEntry>) -> Void) {
        WidgetEntryBuilder.buildFromStorageOrFetch { entry in
            let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: .now) ?? .now
            completion(Timeline(entries: [entry], policy: .after(refresh)))
        }
    }

    private func previewEntry() -> NextRoutineEntry {
        NextRoutineEntry(
            date: .now,
            phase: .readyDirect,
            routineTitle: "Morgon",
            activityTitle: "Borsta tänderna",
            pictogramEmoji: "🪥",
            progressCompleted: 2,
            progressTotal: 5,
            openAppReason: nil,
            timerDurationLabel: nil,
            instanceToken: "preview",
            childLabel: "🦊 Astrid",
            feedbackStars: 0,
            feedbackTitle: "",
            allDoneMessage: WidgetL10n.allDoneNeutral
        )
    }
}

struct NextRoutineWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    var entry: NextRoutineEntry

    var body: some View {
        Group {
            switch family {
            case .systemMedium:
                mediumBody
            default:
                smallBody
            }
        }
        .modifier(WidgetBackgroundModifier())
        .widgetURL(WidgetAPIConfig.childTodayURL())
    }

    private var headerLine: some View {
        HStack {
            if let child = entry.childLabel, family == .systemMedium {
                Text("‹ \(child) ›")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .accessibilityLabel(child)
            }
            Spacer(minLength: 4)
            if entry.progressTotal > 0 {
                Text(progressText)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .accessibilityLabel(progressText)
            }
        }
    }

    private var progressText: String {
        if entry.phase == .allDone, entry.progressTotal > 0 {
            return WidgetL10n.progress(entry.progressCompleted, entry.progressTotal)
        }
        if entry.progressTotal > 0 {
            return "\(entry.routineTitle) · \(entry.progressCompleted)/\(entry.progressTotal)"
        }
        return entry.routineTitle
    }

    private var smallBody: some View {
        VStack(alignment: .leading, spacing: 6) {
            if entry.phase != .privateOpenApp {
                Text(entry.routineTitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            contentCore(compact: true)
            actionArea(compact: true)
        }
        .padding(12)
        .modifier(WidgetBackgroundModifier())
    }

    private var mediumBody: some View {
        VStack(alignment: .leading, spacing: 8) {
            headerLine
            if entry.phase != .privateOpenApp {
                Text(entry.routineTitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            contentCore(compact: false)
            actionArea(compact: false)
        }
        .padding(14)
        .modifier(WidgetBackgroundModifier())
    }

    @ViewBuilder
    private func contentCore(compact: Bool) -> some View {
        switch entry.phase {
        case .feedback:
            VStack(alignment: .leading, spacing: 4) {
                Text(WidgetL10n.feedbackDone)
                    .font(.headline)
                    .foregroundStyle(.green)
                if entry.feedbackStars > 0 {
                    Text(WidgetL10n.starsAdded(entry.feedbackStars))
                        .font(.subheadline)
                }
            }
            .accessibilityElement(children: .combine)
        case .allDone:
            HStack(spacing: 8) {
                Text("⭐")
                    .font(.title2)
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.allDoneMessage)
                        .font(.headline)
                        .lineLimit(2)
                    if entry.progressTotal > 0 {
                        Text(WidgetL10n.progress(entry.progressCompleted, entry.progressTotal))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        case .privateOpenApp:
            Text(WidgetL10n.actionOpenApp)
                .font(.headline)
                .lineLimit(3)
        case .loading, .switchingChild, .offline, .reauth, .revoked, .nothingNow:
            Text(entry.activityTitle)
                .font(.headline)
                .lineLimit(3)
        default:
            HStack(alignment: .top, spacing: 8) {
                Text(entry.pictogramEmoji)
                    .font(.system(size: compact ? 28 : 32))
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    if entry.phase == .readyOpenApp, entry.openAppReason == "timer" {
                        Text("⏳")
                            .font(.caption)
                    }
                    Text(entry.activityTitle)
                        .font(.headline)
                        .lineLimit(compact ? 2 : 3)
                    if let dur = entry.timerDurationLabel {
                        Text(dur)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func actionArea(compact: Bool) -> some View {
        switch entry.phase {
        case .readyDirect:
            completeButton
        case .readyOpenApp:
            openAppButton(timer: entry.openAppReason == "timer")
        case .privateOpenApp:
            openAppLink(label: WidgetL10n.actionOpenApp)
        default:
            EmptyView()
        }
    }

    @ViewBuilder
    private var completeButton: some View {
        if #available(iOS 17.0, *), let token = entry.instanceToken, !token.isEmpty, token != "preview" {
            Button(intent: CompleteNextActivityIntent(instanceToken: token)) {
                Text(WidgetL10n.actionDone)
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
            }
            .buttonStyle(.borderedProminent)
            .accessibilityLabel(WidgetL10n.actionDone)
        } else {
            openAppLink(label: WidgetL10n.actionOpenApp)
        }
    }

    @ViewBuilder
    private func openAppButton(timer: Bool) -> some View {
        let label = timer ? WidgetL10n.actionOpenTimer : WidgetL10n.actionShowSteps
        if #available(iOS 17.0, *) {
            Button(intent: OpenChildTodayIntent()) {
                Text(label)
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
            }
            .buttonStyle(.bordered)
            .accessibilityLabel(label)
        } else {
            openAppLink(label: label)
        }
    }

    @ViewBuilder
    private func openAppLink(label: String) -> some View {
        if let url = WidgetAPIConfig.childTodayURL() {
            Link(label, destination: url)
                .font(.body.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .accessibilityLabel(label)
        }
    }
}

struct NextRoutineWidget: Widget {
    let kind: String = "NextRoutineWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NextRoutineProvider()) { entry in
            NextRoutineWidgetEntryView(entry: entry)
        }
        .configurationDisplayName(WidgetL10n.routineHeader)
        .description(WidgetL10n.genericNextStep)
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
