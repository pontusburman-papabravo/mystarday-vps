# iOS WidgetRoutine extension

1. In Xcode: **File → New → Target → Widget Extension** named `WidgetRoutine`.
2. Replace generated Swift with files in this folder (`NextRoutineWidget.swift`).
3. Add **App Group** shared with main app; store `binding_token` via Keychain (bridge from Capacitor).
4. Implement `WidgetAPIClient` + `CompleteNextActivityIntent` (App Intent) calling server contract documented in `docs/r45-widget-native.md`.
5. Enable flags `native_widget_enabled` + `widget_completion_enabled` for test family.

Native build required for App Store; server contract works without extension installed.
