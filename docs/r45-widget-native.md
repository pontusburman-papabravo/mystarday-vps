# R4.5 — Native widget (server + native)

## Server contract (merged in R4.5a)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/widget/bindings` | Child JWT, parent JWT (+ `child_id`), or `trusted_device` cookie |
| GET | `/api/widget/next-action` | `Authorization: Bearer <binding_token>` |
| POST | `/api/widget/complete-action` | Same + `instance_token` + `idempotency_key` |

**Flags:** `native_widget_enabled`, `widget_completion_enabled` (family override supported).

**Completion source:** `widget_ios` / `widget_android`.

**Offline:** Model A — no network → no success (HTTP errors / `offline_unavailable`).

**Rollback:** disable `widget_completion_enabled` first, then `native_widget_enabled`.

## Native (follow-up PRs)

- Capacitor bridge: refresh widget timelines after in-app completion.
- iOS WidgetKit + App Intent; Android App Widget + secure action.
- Parent settings surface for child binding + privacy.
