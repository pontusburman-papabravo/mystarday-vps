# Ireland launch — operations runbook

**Status:** **IE OPEN (iOS-first)** — Steps A–F executed 2026-09-17 after founder **GO IE**.  
**Authority:** [`docs/ie-paid-launch-kravspec.md`](../ie-paid-launch-kravspec.md) · ADR-023 · [`docs/ie-fi-release-gates.md`](../ie-fi-release-gates.md)

---

## Current launch gate status (2026-09-17 post-GO IE)

| Gate | Status | Notes |
|------|--------|-------|
| **Apple 1.4.5 review (ASC)** | **PASS** | Approved 2026-09-16 06:47 PDT. Submission `fe4969ce-dfaf-4b39-b9bc-5c581769187c`. |
| **Google Play review** | **PENDING** | iOS-first launch: `/en` shows “Android coming soon”; Play links hidden when IE open. |
| **Founder open approval** | **GIVEN** | `founder_open_approved_ie=true`, `paid_rollout_approved_ie=true` in evidence JSON (GO IE 2026-09-17). |
| **Legal (extern counsel)** | **CONSCIOUS RISK** | Track 1 internal sign-off (2026-08-20). External `/en/eea/*` review remains founder-owned. |
| ASC / Play / RC / device RC | PASS (founder-verified) | See `config/ie-fi-release-evidence.json`. |
| **Committed evidence JSON** | **SYNCED** | `IE_READY_TO_OPEN=YES`, `IE_PAID_ROLLOUT_READY=YES`. |
| **Prod runtime** | **OPEN** | `market_ie_open=true`, `public_billing_usable=true`, `launch_state.IE=open_paid`. Billing infra on (`BILLING_UI_DISABLED` removed). |

### Launch execution log (2026-09-17)

| Step | Time (UTC) | Result |
|------|------------|--------|
| A Global billing infra | 12:21 | `payment_enabled=true`, `iap_paid_rollout_ready=true`, `BILLING_UI_DISABLED` removed |
| B IE payment start | 12:21 | `market_ie_payment_start_at=2026-09-17T12:21:16.701Z` |
| C QA purchase (signup closed) | 12:22 | Sandbox family `6ea5c94f-…` — iOS/Android purchase allowed |
| D Founder approval | 12:22 | Evidence JSON + `npm run ie-fi:release-gates` → `IE_READY_TO_OPEN: YES` |
| E Open acquisition | 12:23 | `market_ie_open=true` → `signup_allowed.IE=true` |
| F Smoke signup | 14:22 CET | `ie-launch-smoke-*@example.com` → family `2f3960ce-…`, tier `trial`, 14-day trial, no `intro_year` |

**Rollback:** Level 1 `market_ie_open=false` · Level 2 unset `market_ie_payment_start_at` · Level 3 `BILLING_UI_DISABLED=true` + `payment_enabled=false`.

```bash
npm run ie-fi:release-gates   # IE billing+device YES; READY_TO_OPEN NO until founder_open_approved_ie
# On VPS after deploy (see deploy-ops):
curl -s http://127.0.0.1:3000/api/market/registration-gates | jq '{ie:.market_ie_open,billing:.public_billing_usable,signup:.signup_allowed.IE}'
curl -s http://127.0.0.1:3000/health | jq '{sha:.git_sha,billing:.iap_readiness.billing_ui_globally_disabled,paid:.iap_paid_rollout_ready,pg:.payment_go_live}'
```

---

## Launch sequence (A→F) — execute only after gates clear

Billing must be usable **before** IE signup opens (trial markets require `publicBillingUsable`).

**Safety (all steps):** SE new purchase denied before `payment_start_at` (2026-10-01 Stockholm). SE `intro_year` unchanged. Restore allowed when global infra is on. FI/NL/DE/AT/GB purchase denied. `market_eu_open` stays false.

### Step A — Global billing infrastructure

| | |
|--|--|
| Keys | Remove env `BILLING_UI_DISABLED` · `app_settings.payment_enabled=true` · `app_settings.iap_paid_rollout_ready=true` |
| Before | `public_billing_usable=false` |
| After | `public_billing_usable=true` (SE purchases still denied until Oct 1 market gate) |
| Verify | `/health` → `billing_ui_disabled=false`, `payment_go_live.blockers` empty |
| Rollback | Admin `payment_enabled=false` · `BILLING_UI_DISABLED=true` + restart |
| STOP | Readiness gaps · SE family gets purchase before Oct 1 |

### Step B — IE market billing start

| | |
|--|--|
| Key | `app_settings.market_ie_payment_start_at` (ISO or `YYYY-MM-DD` Dublin midnight) |
| Before | `null` (IE purchase fail-closed) |
| After | Instant ≤ now |
| Verify | `/api/market/registration-gates` → `payment_start_at.IE` non-null |
| Rollback | Delete key (IE purchases fail-closed; entitlements preserved) |
| STOP | Step A incomplete |

### Step C — IE purchase eligibility while signup CLOSED

| | |
|--|--|
| Constraint | `market_ie_open` stays `false` |
| Setup | Admin IE country on QA family only |
| Verify | `signup_allowed.IE=false` · QA family `GET /api/iap/config?platform=ios` → `nativePurchasesEnabled:true`, `nativeRestoreEnabled:true` |
| STOP | Public IE signup opens · SE purchase before Oct 1 |

### Step D — Founder approval (governance)

| | |
|--|--|
| Key | `config/ie-fi-release-evidence.json` → `founder_open_approved_ie: true` + deploy |
| Verify | `npm run ie-fi:release-gates` → `IE_READY_TO_OPEN: YES` (market flag still off) |
| Rollback | Revert evidence + deploy |

### Step E — Open IE acquisition

| | |
|--|--|
| Key | `feature_flag.market_ie_open=true` via `PUT /api/admin/feature-flags/market_ie_open` |
| Verify | `signup_allowed.IE=true`, `public_billing_usable=true` |
| Rollback | `market_ie_open=false` (stops new signups; existing families unchanged) |

### Step F — One fresh IE signup smoke

Verify: `access_kind=trial` · 14 days · no `intro_year` row · purchase + restore on native.

---

## Rollback levels

| Level | Action | Entitlements / webhooks |
|-------|--------|-------------------------|
| 1 Acquisition | `market_ie_open=false` | Existing families keep access; webhooks continue |
| 2 IE purchases | Unset / future `market_ie_payment_start_at` | Store rows honored; new IE purchases fail-closed |
| 3 Global kill | `BILLING_UI_DISABLED=true` + `payment_enabled=false` | No revocation; webhooks still processed; client IAP/restore UI off |

Disarm SE auto go-live if needed: `PATCH /api/admin/subscription-settings/payment-go-live-armed` `{"armed":false}`.

---

## 24h monitoring (launch day)

- IE registrations: `family WHERE country_code='IE' AND created_at > now()-'24h'`
- No IE `intro_year`: `family_entitlements.source='intro_year'` for IE families
- Webhooks: `iap_webhook_log` by `skip_reason` / `processing_outcome`; journalctl `[iap-webhook]` 401/500
- Purchases: `payment_audit_log` by `event_type`, `store`
- Duplicates: families with >1 active `apple`/`google` entitlement row
- `MARKET_BILLING_NOT_READY` in logs after Step E → alert
- Unexpected SE store rows before Oct 1 (non-sandbox)
- Non-IE/non-SE store rows (FI/NL/DE/AT/GB)

Hourly: `/health` + `/api/market/registration-gates`.

---

## Delta runbook (after store review)

**Do not re-run a full audit.** Update only when **both** ASC and Google Play have cleared review (or document a deliberate single-platform launch — not default for IE).

1. **Apple 1.4.5 review** → **PASS** ✓ (2026-09-17; submission `fe4969ce-dfaf-4b39-b9bc-5c581769187c`)
2. **Google Play review** → `PASS` or `FAIL` (if FAIL: stop; no Steps A–F)
3. **`config/ie-fi-release-evidence.json`** → **SYNCED** ✓ (2026-09-17 founder attestation)
   - `apple_iap_ie`, `play_named_skus_ie`, `revenuecat` → verified
   - `ios_purchase_ie`, `ios_restore_ie`, `android_purchase_ie`, `android_restore_ie` → verified
   - `apple_download_price` / `apple_paid_download_unresolved_p0` if ASC confirms free download
   - `EVIDENCE_SOURCE: founder_observation` + date in `notes`
4. **`npm run ie-fi:release-gates`** — paste output into launch log
5. **Founder approval** — flip `founder_open_approved_ie` (+ `paid_rollout_approved_ie` if required) only as explicit decision
6. **Legal** — confirm conscious risk acceptance recorded (Track 1); external counsel remains optional founder call
7. **Execute A→F** in order with verify/STOP gates above
8. **Ops check Q3** — any prod IE families from prior sandbox toggles before ads

Commit evidence + this status table in one small PR. Sweden Oct 1 go-live remains separate ([`PAYMENTS-GO-LIVE-2026-10-01.md`](PAYMENTS-GO-LIVE-2026-10-01.md)).

---

## Related

- Device RC checklist: [`IE-FI-DEVICE-RC.md`](IE-FI-DEVICE-RC.md)
- Sweden IAP Oct 1 (does not open IE): [`PAYMENTS-GO-LIVE-2026-10-01.md`](PAYMENTS-GO-LIVE-2026-10-01.md)
- Release gate definitions: [`../ie-fi-release-gates.md`](../ie-fi-release-gates.md)
