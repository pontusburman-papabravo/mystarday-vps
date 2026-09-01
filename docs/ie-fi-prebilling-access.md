# Ireland + Finland prebilling launch access

Do **not** flip `market_ie_open`, `market_fi_open`, or public billing from this document.

## Three access concepts

| Concept | Who | Permanent? | Source |
|---|---|---|---|
| Sweden grandfathering | SE families created before `payment_start_at` | Yes, where current rules say so | `family_entitlements.source = grandfathered` |
| IE/FI prebilling launch access | IE/FI families created before that country’s paid-start | No | Computed `premium.source = prebilling` — **not** a grandfather row |
| Paid entitlement | Store / admin / gift after paid-start | Per store/admin rules | `apple` / `google` / `admin` / `gift` |

IE/FI are never auto-grandfathered. An existing explicit grandfather row (manual/admin) is left untouched.

## Canonical dates

| Key | Default | Scope |
|---|---|---|
| `payment_start_at` | `2026-10-01T00:00:00+02:00` | Sweden grandfather cutoff only |
| `market_ie_payment_start_at` | **unset** (fail closed) | Ireland paid-start. Store an absolute ISO instant or `YYYY-MM-DD` (Dublin civil midnight). No commercial date is committed. |
| `market_fi_payment_start_at` | **unset** (fail closed) | Finland paid-start. Absolute ISO or `YYYY-MM-DD` (Helsinki civil midnight). |

Helpers: `getPaymentStartAtForCountry()`, `setPaymentStartAtForCountry()`.

## Signup

```
publicBillingUsable =
  payment_enabled && !BILLING_UI_DISABLED && iap_paid_rollout_ready

signup_allowed =
  market_open &&
  (SE grandfather path || IE/FI prebilling window || publicBillingUsable)
```

Closed market → no public signup.  
Open IE/FI before that country’s paid-start → signup allowed even if billing is off.  
Open IE/FI at/after paid-start without billing → `MARKET_BILLING_NOT_READY`.

## Transition for a launch-window IE/FI family

Temporary access is **computed on every resolve**, not stored as a grandfather row. Sessions are not revoked. The next request and the next app launch see the new state.

| When | Billing | Access |
|---|---|---|
| `now < payment_start_at` | off or on | Full temporary access (`access_kind=prebilling`). Paywall hidden. |
| `now >= payment_start_at` | **off** | Hold prebilling (ops-late safety — they cannot purchase yet). **New signup blocked.** |
| `now >= payment_start_at` | **on** | Intentional limited + paywall. Session stays logged in. No extra calendar grace days. |

### Exact surfaces (do not treat raw middleware as policy)

| Event | Designed behaviour |
|---|---|
| Active parent session | Cookies stay valid. No forced logout. |
| Active child session | Child cookies stay valid. No forced logout. |
| Next API request | `requirePremiumApi` calls `resolveFamilyEntitlements(familyId)` with server now. If temporary access has ended and no store/admin/gift row is active → `402 PREMIUM_REQUIRED`, `limited_account: true`, `paywall_url: /paywall`. Allowlisted parent paths still work (`/api/subscription/`, `/api/iap/`, `/api/auth/`, delete-account). |
| Next app launch | `GET /api/subscription/status` (allowlisted) returns `requires_paywall: true`, `access_kind: limited`, `upgrade_url: /paywall`. Client must show paywall from this payload — not from a session reset. |
| Paywall appearance | Only after country paid-start **and** public billing usable, or for a family that was never prebilling-eligible. Hidden while `access_kind=prebilling`. |
| Purchase success | RevenueCat webhook / `/api/iap/sync` writes `apple`/`google`. Store winner beats computed prebilling. `access_kind=paid`. |
| Purchase cancellation | `CANCELLATION` while the period is still valid keeps store status `active` until the period ends. Access stays paid, not prebilling. |
| Store expiry / refund | `EXPIRATION` (or expired reconcile) revokes the store row. If the family is still inside the prebilling window **or** hold (billing unusable) → computed `prebilling` returns. After cutoff + billing ON → limited + paywall. Never grandfathered. |
| Store unavailable | Limited parent can still call `/api/iap/*` (restore/sync). Failed sync does not delete computed prebilling. |
| RevenueCat unavailable | Resolver / premium-check errors → `503` (retry), never a silent 402 that would look like “access ended”. `/api/iap/sync` returns `503 RC_NOT_CONFIGURED` or `502 RC_VERIFY_FAILED` and leaves current entitlement rows untouched. |
| Restore | Same `/api/iap/sync` reconcile path. Success applies store entitlement. Failure leaves prebilling or limited state unchanged. |
| Expired temporary access | `now >= country payment_start_at` **and** public billing usable **and** no active store/admin/gift row → `premium.source=none`, `access_kind=limited`, `requires_paywall=true`. `family.is_lifetime_free` stays false. |

A family created **after** that country’s paid-start is never prebilling-eligible. Signup in that state with billing OFF is rejected (`MARKET_BILLING_NOT_READY`) so we never create register → 402 → cannot purchase accounts.

### Other paths

- **Webhook grandfather skip** is unchanged: only an existing `grandfathered` row is skipped. IE/FI have no auto grandfather row.
- **Child after expiry:** only explicit first-star prefixes stay allowlisted (`/api/me/daily-log`, `/api/me/weekly-schedule`, `/api/me/view-type`) plus auth, subscription read, and parent-restore. A broad `/api/me/` prefix is not used — rewards, garden, family hall, universe, journey, and other Premium child surfaces return `402`. `/api/messages`, `/api/iap/*`, `/api/account/*`, `/api/admin/*`, and `/api/family/delete-account` stay parent/admin-gated.
- **Lifetime free:** prebilling never sets `family.is_lifetime_free`.

## Release states (do not collapse)

Canonical evaluator: `src/lib/ie-fi-release-gates.js` / `docs/ie-fi-release-gates.md`.

1. **CLOSED_CODE_READY** — deploy while IE/FI stay closed.
2. **PREBILLING_MARKET_READY** — product path proven for a later open with billing OFF. This is **not** permission to flip flags.
3. **BILLING_READY** — Store / RevenueCat / device paid path verified. Never inferred from unit tests.
4. **READY_TO_OPEN** — explicit founder/ops approval. Green CI does not set this.
5. **PAID_ROLLOUT_READY** — billing ready plus explicit paid-rollout approval.

Expected ops sequence: deploy (closed) → verify prebilling → **explicit** open IE/FI → free window → finish Store/RC/device → enable paid later. No product-code PR is required between open and paid if these dates/flags are used.

Hold policy: a clock crossing `market_*_payment_start_at` does **not** 402 launch-window families while public billing is unusable. That is deliberate ops-late safety (Constitution 2 + 5). Paywall starts only when cutoff is reached **and** billing is usable.
