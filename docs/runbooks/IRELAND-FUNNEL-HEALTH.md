# Ireland funnel health — ops monitor

Read-only, machine-readable funnel snapshot for scheduled external checks.
Does **not** replace admin analytics. Does **not** expose raw events, session IDs, or PII.

## Endpoint

```
GET /api/ops/ireland-funnel-health
```

Live path (host from deploy-ops / `APP_URL`):

```
/api/ops/ireland-funnel-health
```

## Auth

Env on the server (never commit the value):

```
IRELAND_FUNNEL_MONITOR_TOKEN
```

Send the raw token as a Bearer header. No admin cookie or session is used.

```bash
curl \
  -H "Authorization: Bearer $IRELAND_FUNNEL_MONITOR_TOKEN" \
  "$APP_URL/api/ops/ireland-funnel-health"
```

Missing or wrong token → `401`. Token unset/too short on the server → `503`.

## What is counted

Only `analytics_events` rows where:

- `metadata->>'market' = 'IE'`
- `event_type` is `landing_view` or `store_cta_clicked`

Sessions = `COUNT(DISTINCT family_id)`. For anonymous `/en` traffic the client `session_id` nonce is stored as `family_id`. Session values are never returned.

CTR = `store_click_sessions / landing_sessions * 100`. If `landing_sessions = 0` → `store_ctr_pct` is `null` (not `0`).

## Periods (half-open `[from, to)`)

| Key | Window |
|-----|--------|
| `current_24h` | now − 24h → now |
| `previous_24h` | now − 48h → now − 24h |
| `current_7d` | now − 7d → now |
| `previous_7d` | now − 14d → now − 7d |

`current_24h` and `previous_24h` do not overlap. `current_7d` and `previous_7d` do not overlap.
The last 24 hours are included in both `current_24h` and `current_7d` (different lengths).

## Response shape

```json
{
  "ok": true,
  "generated_at": "2026-09-27T06:00:00.000Z",
  "market": "IE",
  "current_24h": {
    "from": "2026-09-26T06:00:00.000Z",
    "to": "2026-09-27T06:00:00.000Z",
    "landing_events": 0,
    "landing_sessions": 0,
    "store_click_events": 0,
    "store_click_sessions": 0,
    "store_ctr_pct": null,
    "platforms": { "ios": 0, "android": 0, "unknown": 0 },
    "sources": [
      {
        "utm_source": "facebook",
        "utm_medium": "paid_social",
        "utm_campaign": "ireland-launch",
        "landing_sessions": 0,
        "store_click_sessions": 0,
        "store_ctr_pct": null
      }
    ]
  },
  "previous_24h": {},
  "current_7d": {},
  "previous_7d": {},
  "signals": {
    "has_traffic": false,
    "has_store_clicks": false,
    "measurement_alive": false
  }
}
```

Missing UTM values are returned as `(direct)` and are not written back to the database.
Sources are top 20 per period by `landing_sessions` descending.

`signals` are descriptive only — no alert thresholds:

- `has_traffic`: `landing_sessions > 0` on `current_24h`
- `has_store_clicks`: `store_click_sessions > 0` on `current_24h`
- `measurement_alive`: at least one of the two event types exists in `current_24h`

## Rate limit

20 requests / minute / IP (`irelandFunnelMonitorLimiter`).

## Server setup

1. Generate a strong random secret (do not reuse other tokens).
2. Set `IRELAND_FUNNEL_MONITOR_TOKEN=<secret>` on the VPS.
3. Deploy / restart the app systemd unit (see deploy-ops).
4. Confirm: `curl` with the Bearer header returns `{"ok":true,...}`.
