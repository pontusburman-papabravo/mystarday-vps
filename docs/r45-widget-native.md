# R4.5 — Native widget (server + native)

## Server contract (R4.5a + R4.5b)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/widget/bindings` | Child JWT, parent JWT (+ `child_id`), or `trusted_device` cookie |
| GET | `/api/widget/context` | `Authorization: Bearer <binding_token>` |
| POST | `/api/widget/switch-child` | Same (`child_session` forbidden) |
| GET | `/api/widget/next-action` | `Authorization: Bearer <binding_token>` |
| POST | `/api/widget/complete-action` | Same + `instance_token` + `idempotency_key` |

**Canonical next-action:** `resolveCanonicalChildNextActivity` — same Idag rules (First Star, NOW/NEXT/LATER, sort order).

**Parent completion:** `completed_by=parent`, `completion_source=widget_ios|widget_android`.

**Flags:** `native_widget_enabled`, `widget_completion_enabled` (family override supported).

**Completion source:** `widget_ios` / `widget_android`.

**Offline:** Model A — no network → no success (HTTP errors / `offline_unavailable`).

**Rollback:** disable `widget_completion_enabled` first, then `native_widget_enabled`.

## Native bridge (R4.5c)

Capacitor plugin `capacitor-widget-bridge` (`WidgetBridge`):

- `configureBinding` — bearer token → Keychain / EncryptedSharedPreferences
- `refreshAll` / `clearBindings` / `notifyChildChanged` / `getStatus`

Web: `public/js/widget-bridge-{client,provision,bootstrap}.js` (no-op off native).

App Group: `group.stjarndag.widget` (iOS entitlements patch).

## Native (follow-up PRs)

- Capacitor bridge: refresh widget timelines after in-app completion.
- iOS WidgetKit extension in `ios/App/WidgetRoutine` (R4.5d).
- **Android App Widget** in `capacitor-widget-bridge` (R4.5e).
- Parent settings surface for child binding + privacy.
