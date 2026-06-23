# Paywall inventory (C2a)

> Generated 2026-06-23 as part of REFACTOR.md Fas 0 / C2a.  
> **Canonical paywall model (target):** per-route `requireComponent()` from `src/middleware/require-component.js`.

## Executive summary

| Mechanism | Mounted / used? | Effective? |
|-----------|-----------------|------------|
| **Global `requireActiveSubscription`** (`app.js`) | Yes — `app.use('/api', …)` **after** `registerRoutes()` | **No-op** — runs after route handlers are registered; never intercepts matched API routes |
| **Per-route `requireComponent()`** | Pedagog API routers | **Active** — checks `family_subscriptions.components` |
| **Per-route `requireFeature()`** | Feature-flag gates (dev/live families) | **Active** — checks `family_features` / feature status |
| **Stripe / legacy** | Not mounted | Dead code (Fas 1 removes) |

**Normative decision (REFACTOR C2b):** remove the global `requireActiveSubscription` mount; keep per-route `requireComponent` as canonical subscription gating.

---

## Global middleware order (`app.js`)

```
restoreParentSession → optionalAuth → globalLimiter → … → CSRF → apiLimiter
→ checkMaintenanceMode → registerRoutes()
→ static → requireActiveSubscription (post-routes, no-op) → public-pages
```

---

## `requireActiveSubscription` (`src/middleware/subscription.js`)

**Mount:** `app.js` — after `registerRoutes()`, exempt prefixes: `/auth`, `/iap`, `/resend/`, `/health`, `/landing`, `/public/`, `/i18n`.

**Logic:** blocks families with expired trial/subscription unless `is_lifetime_free`, `beta` (until 2027-06-30), `active`, or valid `trial`.

**Because it is mounted after routes, no API handler is gated by this middleware today.**

---

## `requireComponent()` — active per-route gates

| Component | Router / file |
|-----------|---------------|
| `pedagog` | `src/routes/pedagog-daily-log.js` (router-level) |
| `pedagog` | `src/routes/pedagog-school-activities.js` |
| `pedagog` | `src/routes/pedagog-absence.js` |
| `pedagog` | `src/routes/pedagog-day-comments.js` (per-route on some endpoints) |

**Not paywall but related:** `pedagog-notes.js` uses `requireFeature('pedagoganteckningar')` (feature flag, not subscription component).

---

## `requireFeature()` — feature-flag gates (not subscription paywall)

Examples (non-exhaustive):

| Feature slug | File |
|--------------|------|
| `klinisk_rapportering` | `reports.js` |
| `standardbibliotek` | `standard-library.js` |
| `push_notiser` | `push.js` POST `/subscribe` |
| `enkater` | `surveys.js` |
| `child_creation_wizard` | `onboarding.js` |
| `for_dig` | `for-dig.js` |
| `feedback_formular` | `feedback.js` |
| `nyhetsbrev` | `dagens-nyhet.js`, `newsletter.js` (admin) |

These gate **product features** via `family_features` / feature status — separate from IAP component billing.

---

## Routes that probably should be paywall-gated (review for C2b / G4d)

| Area | Current gate | Notes |
|------|--------------|-------|
| Core parent app (`/api/children`, daily-logs, schedules) | None (global sub no-op) | Relies on `lifetime_free` / trial at family level only if global mount were fixed |
| Pedagog tools | `requireComponent('pedagog')` | Correct per-component model |
| Reports | `requireFeature` only | May need `reporting` component when billing launches |
| `/api/subscription` | Open to authenticated family | Status read, not a gate |

---

## IAP / RevenueCat

- **Active path:** `POST /api/iap/webhook` (RevenueCat), mounted in `src/routes/index.js`
- **Exempt from maintenance** (G4c default): `/api/iap/*` — webhook must stay reachable during maintenance

---

## Verification commands

```bash
rg -n "requireComponent" src/
rg -n "requireActiveSubscription" src/ app.js server.js
rg -n "requireFeature" src/routes/
```
