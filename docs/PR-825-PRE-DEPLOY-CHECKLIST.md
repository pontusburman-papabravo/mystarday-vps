# PR #825 — Pre-deploy checklist

Use after merge to `main` and before production traffic. **Do not run `down` on migration `1810000000016` in production.**

## Backup and capacity

- [ ] Verified PostgreSQL backup / PITR window documented (post-restore baseline 2026-08-02)
- [ ] Disk space OK on VPS (`df -h` on DB volume and app host)
- [ ] Record current prod SHA (`/health` or `data/deployed-sha`)
- [ ] `SELECT MAX(name) FROM _migrations` matches expected pre-deploy state

## Migration `1810000000016_iap_event_ordering_audit`

- [ ] `npm run migrate` on staging/disposable DB succeeded once
- [ ] Columns present: `family.iap_last_event_timestamp_ms`, `iap_last_applied_environment`, `iap_last_applied_product_id`; `iap_webhook_log.event_timestamp_ms`, `environment`
- [ ] **Forward-only rollback:** revert app code to previous release; leave new columns nullable (no automatic `down` in prod)
- [ ] `down` is destructive for ordering/audit fields — use only in disposable DB drills

## RevenueCat environment

- [ ] `REVENUECAT_IOS_PUBLIC_SDK_KEY` and `REVENUECAT_ANDROID_PUBLIC_SDK_KEY` set (public SDK keys only)
- [ ] `REVENUECAT_API_KEY` / `REVENUECAT_SECRET_API_KEY` **not** exposed via `/api/iap/config` (smoke: response has `apiKey: null` or `appl_…` / `goog_…`, never `sk_` / `rcsk_`)
- [ ] `REVENUECAT_ALLOWED_PRODUCT_IDS` lists production product IDs
- [ ] `REVENUECAT_ALLOWED_APP_IDS` lists RevenueCat app IDs (**recommended** — empty allowlist currently accepts any `app_id`)
- [ ] `REVENUECAT_ENTITLEMENT_ID` = `basic` (or prod value)
- [ ] `REVENUECAT_SANDBOX_FAMILY_IDS` set for sandbox QA families only (or empty + no sandbox events on live)
- [ ] Webhook auth (`REVENUECAT_WEBHOOK_SECRET` / signing) unchanged and verified

## Credential rotation (if secret was ever in client path)

- [ ] If `REVENUECAT_API_KEY` ever contained `sk_` / `rcsk_`: rotate in RevenueCat dashboard and update server secrets **before** enabling native IAP
- [ ] Revoke old secret in RevenueCat after rotation

## Deploy and health

- [ ] Merge PR #825 (or rebased `cursor/pr825-rebase-on-main-03c7`) to `main`
- [ ] Deploy via normal pipeline; `sleep 3` then `curl -s http://127.0.0.1:3000/health`
- [ ] `systemctl` / logs clean (`journalctl -u <app-service> -n 50`)

## Smoke (no real purchase / no prod webhook payload with PII)

- [ ] Authenticated `GET /api/iap/config?platform=ios` — JSON shape only; **do not log** `apiKey` value
- [ ] Synthetic webhook with wrong `product_id` → HTTP 200, family `subscription_status` unchanged, `iap_webhook_log.skip_reason` set
- [ ] Family image proxy still serves R2/upload URLs (regression)

## Out of scope for automated checklist

- Real App Store / Play sandbox purchase
- Live RevenueCat webhook replay with production payloads
