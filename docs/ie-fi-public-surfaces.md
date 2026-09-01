# Ireland / Finland public surfaces

Do **not** flip `market_ie_open`, `market_fi_open`, or public billing from this document.

Public pages must follow the same launch model as signup. Do not invent per-page launch flags.

## Architecture

`GET /api/market/registration-gates` is the source of truth.

| Field | Meaning |
|---|---|
| `signup_allowed.{IE,FI,SE}` | Can this country complete registration now? |
| `public_billing_usable` | Public billing / IAP UI is on |
| `english_available` | English app language is live |
| `launch_state.{IE,FI,SE}` | Derived public state |

Derived states (`src/lib/public-launch-state.js`):

| State | Rule | Customer meaning |
|---|---|---|
| `closed` | `signup_allowed = false` | Market unavailable. Waitlist may capture interest. |
| `open_prebilling` | signup allowed, billing off | Register and use the product. No “subscribe now”. |
| `open_paid` | signup allowed, billing on | Normal in-app subscription / paywall. |

Client: `public/js/landing-market-state.js` (English funnel). Register country gate: `public/js/country-choice.js`.

## What stays separate

| Layer | Not a customer conclusion |
|---|---|
| Technical / public-page readiness | Pages can show the three states without a new deploy |
| Internal legal sign-off | Engineering checklist only |
| External legal review | Counsel / reviewer — **REVIEW_REQUIRED** until they sign |

## REVIEW_REQUIRED (do not invent)

- Whether Finnish consumer / language law requires a Finnish-language legal set. Product launch language for FI is Swedish only (`sv-SE`). No Finnish UI exists.
- Whether Swedish `/privacy` + `/terms` are sufficient for FI families who register in Swedish.
- External legal review of `/en/eea/*` for Ireland and Finland.
- UK `/en/uk/*` placeholder pages (not IE/FI).
- App Store paid download vs intended free-app + subscription (see `docs/ie-fi-billing-external-matrix.md`).

## Console-only (not code blockers)

Fetched 2026-08-31 via iTunes lookup `id=6774493098`:

- Apple IE/FI languages: `EN`, `SV` (no Finnish locale listed).
- Apple IE/FI description and release notes are **Swedish**, including on the Ireland storefront. Ireland listing copy should be English in App Store Connect.
- Apple IE/FI app download is paid (`€5.99` / `5,99 €`). This is store metadata, not a website code change.
- Screenshots present (8 iPhone + 8 iPad). No waitlist / coming-soon / Finnish-UI claims in the description.
- Store URLs: `apps.apple.com/ie/app/my-starday/id6774493098` and `/fi/` — correct storefront, brand domain is not used on the listing.
- Play IE/FI listings respond with an Install CTA; no Finnish-UI claim in the HTML. Named SKUs remain unverified (see billing matrix).
- RevenueCat dashboard: credentials not in this environment.
- Do not flip live market or billing flags from this work.
