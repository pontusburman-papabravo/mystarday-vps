# Android App Widget (R4.5d)

Generate `android/` via `npm run cap:sync:android`, then add:

- `RoutineWidgetProvider` — `RemoteViews` with title + **Klar** `PendingIntent` (immutable, explicit component).
- `WidgetCompleteReceiver` — calls `POST /api/widget/complete-action` with binding from EncryptedSharedPreferences.
- Configuration activity for child selection when multiple children allowed.

See `docs/r45-widget-native.md` for API contract.
