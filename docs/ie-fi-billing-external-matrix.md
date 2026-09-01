# IE / FI external billing & storefront matrix

Fetched **2026-08-31**. Do **not** flip `market_ie_open`, `market_fi_open`, or public billing from this document.

Evidence statuses: `VERIFIED EXTERNALLY` · `VERIFIED INTERNALLY` · `CONFIGURED` · `NOT VERIFIED` · `BLOCKED`.

Internal config is never promoted to verified.

Re-run public Apple/Play checks: `node scripts/verify-storefront-billing.mjs`.

## Apple download price — REVIEW_REQUIRED

Public sources conflict. Do not infer store truth.

| Source (2026-08-31) | Ireland | Finland |
|---|---|---|
| iTunes lookup `kind=software` | `price=5.99` EUR / `€5.99` | `price=5.99` EUR / `5,99 €` |
| App Store HTML | `hasInAppPurchases:true`, CTA “Get” | same pattern |
| App Store Connect | **not opened** | **not opened** |

`APPLE_DOWNLOAD_PRICE = REVIEW_REQUIRED`

Named monthly/yearly SKUs and IE/FI EUR subscription prices remain **NOT VERIFIED**. Do not replace Store truth with portal targets.

Sweden (context only): App Store listing is **59,00 kr** paid download (`kind=software`). Play SE IAP range is `59,00 kr - 590,00 kr if billed through Play`.

## Apple Ireland

| Fact | Value | Status |
|---|---|---|
| App availability | Listed, `trackId` 6774493098, Lifestyle | VERIFIED EXTERNALLY |
| App download price | €5.99 paid (`isFree=false`) | VERIFIED EXTERNALLY |
| Subscription group | — | NOT VERIFIED |
| Monthly product ID | Contract: `*.subscription.monthly` | CONFIGURED |
| Annual product ID | Contract: `*.subscription.yearly.v2` | CONFIGURED |
| Product status | — | NOT VERIFIED |
| Country availability (app) | IE storefront live | VERIFIED EXTERNALLY |
| Country availability (IAP) | `hasInAppPurchases=false` on this app | VERIFIED EXTERNALLY (not sellable on listing) |
| `MONTHLY_IAP_PRICE_IE` | — | NOT VERIFIED |
| `ANNUAL_IAP_PRICE_IE` | — | NOT VERIFIED |
| Sellable subscriptions | No IAP shelf; button is paid app buy | VERIFIED EXTERNALLY as not listed |

## Apple Finland

| Fact | Value | Status |
|---|---|---|
| App availability | Listed, same `trackId` | VERIFIED EXTERNALLY |
| App download price | 5,99 € paid (`isFree=false`) | VERIFIED EXTERNALLY |
| Subscription group | — | NOT VERIFIED |
| Monthly / annual product IDs | Same contract as IE | CONFIGURED |
| Product status | — | NOT VERIFIED |
| Country availability (app) | FI storefront live | VERIFIED EXTERNALLY |
| Country availability (IAP) | `hasInAppPurchases=false` | VERIFIED EXTERNALLY (not sellable on listing) |
| `MONTHLY_IAP_PRICE_FI` | — | NOT VERIFIED |
| `ANNUAL_IAP_PRICE_FI` | — | NOT VERIFIED |
| Sellable subscriptions | Not listed | VERIFIED EXTERNALLY as not listed |

App Store Connect API: **BLOCKED** (no ASC credentials in this environment).

## Google Ireland

| Fact | Value | Status |
|---|---|---|
| App availability | Play listing live, `Install` CTA | VERIFIED EXTERNALLY |
| App download | Free install | VERIFIED EXTERNALLY |
| In-app purchases badge | Present | VERIFIED EXTERNALLY |
| IAP public range | `€5.99 - €59.00 if billed through Play` | VERIFIED EXTERNALLY (range only) |
| Subscription IDs | Contract: `*.subscription.premium` | CONFIGURED |
| Base plans | Contract: `monthly`, `yearly` | CONFIGURED |
| Active state (named plans) | — | NOT VERIFIED |
| Regional availability | IE `gl=IE` listing + Play-billed range | VERIFIED EXTERNALLY for listing |
| `MONTHLY_IAP_PRICE_IE` | Range low €5.99 is **not** a named SKU | NOT VERIFIED |
| `ANNUAL_IAP_PRICE_IE` | Range high €59.00 is **not** a named SKU | NOT VERIFIED |
| Tester / sandbox | — | NOT VERIFIED |
| Product mapping to RC | — | NOT VERIFIED |

Portal IAP *target* yearly is €59.99. Play’s public high endpoint is **€59.00**. Do not change commercial prices from this finding.

## Google Finland

| Fact | Value | Status |
|---|---|---|
| App availability | Play listing live, `Install` CTA | VERIFIED EXTERNALLY |
| App download | Free install | VERIFIED EXTERNALLY |
| In-app purchases badge | Present | VERIFIED EXTERNALLY |
| IAP public range | `€5.90 - €59.00 if billed through Play` | VERIFIED EXTERNALLY (range only) |
| Subscription IDs / base plans | Same contract as IE | CONFIGURED |
| Active state (named plans) | — | NOT VERIFIED |
| Regional availability | FI `gl=FI` listing + Play-billed range | VERIFIED EXTERNALLY for listing |
| `MONTHLY_IAP_PRICE_FI` | Range low €5.90 is **not** a named SKU | NOT VERIFIED |
| `ANNUAL_IAP_PRICE_FI` | Range high €59.00 is **not** a named SKU | NOT VERIFIED |
| Tester / sandbox | — | NOT VERIFIED |
| Product mapping to RC | — | NOT VERIFIED |

## RevenueCat

No RevenueCat public or secret key is available in this environment. `GET https://api.revenuecat.com/v1/subscribers/.../offerings` → HTTP 401 `Invalid API Key.` `GET /v2/projects` → HTTP 401.

| Fact | Value | Status |
|---|---|---|
| Project / app mapping | — | BLOCKED |
| iOS products | Contract IDs only | CONFIGURED |
| Android products | Contract IDs only | CONFIGURED |
| Entitlement | `basic` | CONFIGURED |
| Offering | `default` | CONFIGURED |
| Packages | `$rc_monthly`, `$rc_annual` | CONFIGURED |
| Monthly / annual mapping | Contract + client picker | CONFIGURED |
| Product availability to SDK | — | BLOCKED |
| Expected `priceString` source | Native StoreKit / Play via RevenueCat SDK (`product.priceString`) | VERIFIED INTERNALLY (code path) |

## Verdict

```
IE_BILLING_CONFIGURATION_READY = NO
FI_BILLING_CONFIGURATION_READY = NO
```

This does **not** mean public billing should be enabled. It also does **not** block CODE READY or PREBILLING MARKET READY.

Blockers to configuration-ready:

1. P0 — Apple IE/FI app download is paid; IAP not listed (`hasInAppPurchases=false`)
2. RevenueCat project/offering/products **BLOCKED** without credentials
3. Google named SKUs, base-plan active state, and sandbox **NOT VERIFIED**
4. Device/sandbox purchase still **NOT VERIFIED** (`docs/runbooks/IE-FI-DEVICE-RC.md`)

No product-ID mismatch was proven. No prices were changed.
