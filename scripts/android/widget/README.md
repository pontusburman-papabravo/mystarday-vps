# Android App Widget (R4.5e)

Persistent implementation lives in `plugins/capacitor-widget-bridge/android/` (survives `npm run cap:sync:android`).

- `RoutineWidgetProvider` — `RemoteViews` + `WidgetRefreshHelper` (GET `/api/widget/next-action`).
- `WidgetCompleteReceiver` — `POST /api/widget/complete-action` with Keystore-backed bearer + idempotency key.
- `WidgetOpenAppReceiver` — deep link to `/child/today` for timer/substeps (no unsigned completion URLs).
- `scripts/patch-android-widget.mjs` — injects `widget_api_base_url` from Capacitor server URL.

See `docs/r45-widget-native.md` for API contract.
