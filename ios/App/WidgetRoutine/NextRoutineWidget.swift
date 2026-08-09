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
            feedbackChildName: "",
            allDoneMessage: WidgetL10n.allDoneNeutral,
            canSwitchChildren: false,
            installationId: nil
        )
    }
}

@available(iOS 17.0, *)
struct NextRoutineIntentProvider: AppIntentTimelineProvider {
    typealias Entry = NextRoutineEntry
    typealias Intent = NextRoutineWidgetConfigIntent

    func placeholder(in context: Context) -> NextRoutineEntry {
        .loading()
    }

    func snapshot(for configuration: NextRoutineWidgetConfigIntent, in context: Context) async -> NextRoutineEntry {
        if context.isPreview {
            return NextRoutineProvider().previewEntryForIntent(configuration)
        }
        return await loadEntry(configuration: configuration)
    }

    func timeline(for configuration: NextRoutineWidgetConfigIntent, in context: Context) async -> Timeline<NextRoutineEntry> {
        let entry = await loadEntry(configuration: configuration)
        let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: .now) ?? .now
        return Timeline(entries: [entry], policy: .after(refresh))
    }

    private func loadEntry(configuration: NextRoutineWidgetConfigIntent) async -> NextRoutineEntry {
        let instanceId = configuration.widgetInstanceId.isEmpty
            ? UUID().uuidString
            : configuration.widgetInstanceId
        await WidgetConfigureHelper.applyConfiguration(configuration, widgetInstanceId: instanceId)
        let baseInst = WidgetBridgeStore.installationId(forScope: nil) ?? UUID().uuidString
        let installationId = "\(baseInst):wi:\(instanceId)"
        return await withCheckedContinuation { cont in
            WidgetEntryBuilder.buildFromStorageOrFetch(installationId: installationId) { entry in
                cont.resume(returning: entry)
            }
        }
    }
}

@available(iOS 17.0, *)
private extension NextRoutineProvider {
    func previewEntryForIntent(_ configuration: NextRoutineWidgetConfigIntent) -> NextRoutineEntry {
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
            childLabel: configuration.selectedChild?.displayName ?? "Astrid",
            feedbackStars: 0,
            feedbackTitle: "",
            feedbackChildName: "",
            allDoneMessage: WidgetL10n.allDoneNeutral,
            canSwitchChildren: configuration.widgetMode == .family,
            installationId: nil
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
            if family == .systemMedium {
                if entry.canSwitchChildren {
                    childSwitcherRow
                } else if let child = entry.childLabel {
                    Text("‹ \(child) ›")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .accessibilityLabel(child)
                }
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

    @ViewBuilder
    private var childSwitcherRow: some View {
        if #available(iOS 17.0, *) {
            HStack(spacing: 4) {
                Button(intent: SwitchChildIntent(direction: "prev", installationId: entry.installationId ?? "")) {
                    Text("‹")
                        .font(.title3.weight(.semibold))
                        .frame(minWidth: 44, minHeight: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(WidgetL10n.switchChildPrev)
                Text(activeChildName)
                    .font(.subheadline.weight(.bold))
                    .lineLimit(1)
                    .accessibilityLabel(activeChildName)
                Button(intent: SwitchChildIntent(direction: "next", installationId: entry.installationId ?? "")) {
                    Text("›")
                        .font(.title3.weight(.semibold))
                        .frame(minWidth: 44, minHeight: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(WidgetL10n.switchChildNext)
            }
        }
    }

    private var activeChildName: String {
        if !entry.feedbackChildName.isEmpty {
            return entry.feedbackChildName
        }
        if let label = entry.childLabel {
            let parts = label.split(separator: " ", maxSplits: 1)
            if parts.count == 2 { return String(parts[1]) }
            return label
        }
        return ""
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
                if !entry.feedbackChildName.isEmpty, WidgetBridgeStore.viewerMode() != "child_session" {
                    Text(WidgetL10n.feedbackDoneFor(entry.feedbackChildName))
                        .font(.headline)
                        .foregroundStyle(.green)
                } else {
                    Text(WidgetL10n.feedbackDone)
                        .font(.headline)
                        .foregroundStyle(.green)
                }
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
        if entry.phase == .switchingChild || WidgetBridgeStore.isSwitchInProgress(installationId: entry.installationId) {
            EmptyView()
        } else if #available(iOS 17.0, *), let token = entry.instanceToken, !token.isEmpty, token != "preview" {
            Button(intent: CompleteNextActivityIntent(
                instanceToken: token,
                installationId: entry.installationId ?? ""
            )) {
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
        if #available(iOS 17.0, *) {
            return AppIntentConfiguration(
                kind: kind,
                intent: NextRoutineWidgetConfigIntent.self,
                provider: NextRoutineIntentProvider()
            ) { entry in
                NextRoutineWidgetEntryView(entry: entry)
            }
            .configurationDisplayName(WidgetL10n.routineHeader)
            .description(WidgetL10n.genericNextStep)
            .supportedFamilies([.systemSmall, .systemMedium])
        } else {
            return StaticConfiguration(kind: kind, provider: NextRoutineProvider()) { entry in
                NextRoutineWidgetEntryView(entry: entry)
            }
            .configurationDisplayName(WidgetL10n.routineHeader)
            .description(WidgetL10n.genericNextStep)
            .supportedFamilies([.systemSmall, .systemMedium])
        }
    }
}
