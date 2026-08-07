# iOS WidgetRoutine extension (R4.5d)

Wired via `scripts/patch-ios-widget-extension.mjs` and related verify scripts.

- **WidgetRoutine** appex — small + medium families, `CompleteNextActivityIntent` (iOS 17+), Link fallback on iOS 14–16.
- **WidgetAPIClient** — `GET /api/widget/next-action`, `POST /api/widget/complete-action`, `GET /api/widget/context`.
- **WidgetBridgeStore** (shared plugin) — App Group + Keychain bearer; API base URL copied from WebView on `configureBinding`.
- **Entitlements** — `WidgetRoutine/WidgetRoutine.entitlements` + main `App.entitlements` patched for `group.stjarndag.widget`.

Enable `native_widget_enabled` + `widget_completion_enabled` for test families. See `docs/r45-widget-native.md`.
