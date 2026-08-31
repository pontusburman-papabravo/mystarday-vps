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
| `market_ie_payment_start_at` | `2026-10-15T00:00:00+02:00` | Ireland paid-start (ops override) |
| `market_fi_payment_start_at` | `2026-10-15T00:00:00+02:00` | Finland paid-start (ops override) |

Helpers: `getPaymentStartAtForCountry()`, `setPaymentStartAtForCountry()`.

## Signup

```
signup_allowed =
  market_open &&
  (SE grandfather path || IE/FI prebilling window || public billing usable)
```

Closed market → no public signup.  
Open IE/FI before that country’s paid-start → signup allowed even if billing is off.  
Open IE/FI at/after paid-start without billing → `MARKET_BILLING_NOT_READY`.

## Transition for a launch-window IE/FI family

| When | Billing | Access |
|---|---|---|
| `now < payment_start_at` | off or on | Full temporary access (`prebilling`). Paywall hidden. |
| `now >= payment_start_at` | **off** | Hold prebilling (ops-late safety — they cannot purchase yet). New signup blocked. |
| `now >= payment_start_at` | **on** | Intentional limited + paywall (`402 PREMIUM_REQUIRED`, `paywall_url=/paywall`). Session stays logged in. |

No extra calendar grace days after paid-start once billing is usable.

### Other paths

- **Store / RevenueCat unavailable:** resolver errors → `503`, not a raw 402. Restore remains `/api/iap/` (limited-account allowlist).
- **Webhook:** store rows beat computed prebilling. Grandfather skip is unchanged (SE / explicit rows only).
- **Child:** `/api/me/` stays allowlisted for limited child sessions (first-star). During prebilling the family is premium, so child APIs are fully allowed.
- **Lifetime free:** prebilling never sets `family.is_lifetime_free`.

## Release states (do not collapse)

1. **CODE READY** — deploy while IE/FI stay closed.
2. **PREBILLING MARKET READY** — may open IE/FI during the free window.
3. **BILLING READY** — Store/RC/device paid path verified; then enable public billing at/before `market_*_payment_start_at`.

Expected ops sequence: deploy → keep closed → verify prebilling → open IE/FI → free window → finish Store/RC/device → enable paid later. No product-code PR is required between open and paid if these dates/flags are used.
