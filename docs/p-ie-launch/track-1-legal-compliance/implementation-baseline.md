# Implementation baseline — verified from code (August 2026)

This document is the **single internal fact sheet** for Track 1 legal/compliance writing. Facts below are derived from repository code unless marked **LDRA open** (see [`LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md`](./LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md)).

---

## Controller & product

| Item | Value | Source |
|------|-------|--------|
| Legal entity | Papa Bravo AB | `public/privacy.html`, `public/terms.html` |
| Product name | My Starday | `public/en-privacy.html` |
| Public contact | Contact form `/en/contact` | `config/public-web-routes.js` |
| Service type | Parent-managed family routine app (schedules, stars, rewards, child PIN login) | POS + `CLAUDE.md` |

---

## Jurisdiction model (Ireland path)

| Field | IE registration (when gate opens) | Source |
|-------|-----------------------------------|--------|
| `country_code` | `IE` (user choice at signup) | `public/js/country-choice.js` |
| `market_region` | `EU` (legacy EEA bucket) | `src/lib/market-region.js` |
| `family.timezone` | `Europe/Dublin` | `src/lib/market-config.js`, `src/routes/auth/register.js` |
| `preferred_locale` | User must choose; default market preference `en-GB` | `src/lib/market-config.js` |
| Legal routes | `/en/eea/*`, `/en/tracking-choices` | `src/lib/legal-routing.js` |
| Registration gate | `market_ie_open` feature flag (currently OFF in prod) | `migrations/1810320000000_market_country_gates.js` |

---

## Personal data categories

### Parent account

| Data | Purpose | Storage |
|------|---------|---------|
| Email, name | Auth, communication | `parent` table |
| Password hash (bcrypt) | Auth | `parent` |
| Apple ID / Google email & name | OAuth sign-in | `parent.apple_*`, registration flow |
| Parent PIN (optional app lock) | Re-auth to parent settings | hashed |
| Push preferences, notification settings | Notifications | JSONB / related tables |
| `preferred_locale` | UI language | `family.preferred_locale` |

### Family

| Data | Purpose | Storage |
|------|---------|---------|
| `country_code`, `market_region` | Legal jurisdiction, gates | `family` |
| `timezone` | Schedule day boundaries | `family.timezone` |
| Subscription / IAP state | Access control | `family`, `family_subscriptions`, RevenueCat webhook fields |
| `rc_customer_id` | RevenueCat linkage | `family` |

### Child profile

| Data | Purpose | Storage |
|------|---------|---------|
| First name / nickname, emoji | Child UI identity | `child` |
| Username + PIN hash | Child login | `child`, `pin_lockout`, `pin_audit_log` |
| Optional avatar image | Profile display | `child.avatar_url` → R2 or local uploads |
| Optional birthday | Age-appropriate UX | `child.birthday` |
| `child_view_config` | UI visibility flags | JSONB |

**Not stored for children (by design):** surname, national ID, email, phone — stated in Swedish privacy; no code path collects these for `child`.

### Activity & family content

| Data | Purpose | Storage |
|------|---------|---------|
| Schedules, activities, completions, stars | Core product | `weekly_schedule*`, `daily_log*`, `activity_template`, `streak` |
| Rewards & redemptions | Gamification | `reward`, `reward_redemption` |
| Parent ratings/comments on activities | Optional feedback | `rating` |
| Pedagog notes (mood, sleep, meals, behaviour) | Optional parent/pedagog observations | `pedagog_notes` |
| Child observations (by section) | Reports | `child_observation` |
| General family notes | Reports | `general_observations` |
| Professional share links | Parent-initiated export to third party | `professional_share_link` (PIN optional, 7d expiry) |

### Technical / operational

| Data | Purpose | Storage |
|------|---------|---------|
| Refresh/access tokens | Session | httpOnly cookies, `refresh_token` |
| Push device tokens | Notifications | `push_subscriptions` (web endpoint or native token) |
| Notification archive | In-app notification history | `notification_log` (pruned 7d — scheduler) |
| Analytics events | Product metrics (family_id keyed) | `analytics_events` (metadata JSONB, no IP in route comment) |
| Email subscription / marketing opt-in | Newsletter | `email_subscriptions` |
| UTM / attribution (signup) | Growth analytics | `family_acquisition_*` tables (if populated) |

---

## Processors & subprocessors (operational)

**Verified prod (2026-08-20):** VPS SSH read-only. Prod uses **local PostgreSQL on VPS** — not Neon.

| Processor | Role | Active in prod | Data touched | Location (verified) | Code / config reference |
|-----------|------|----------------|--------------|---------------------|-------------------------|
| **Self-hosted PostgreSQL** | Primary database | ✅ | All application DB | Stockholm SE (`localhost:5432` on VPS) | `DATABASE_URL`, `src/lib/db.js` |
| **Inleed / Yelles AB (VPS)** | App/API hosting | ✅ | All traffic, runtime secrets | Stockholm SE (EU/EEA) | deploy rules, `AGENTS.md` |
| **Resend** | Transactional email | ✅ | Parent email, name in templates | US (processor) | `src/lib/email.js` |
| **Cloudflare R2** | Avatar/object storage | ✅ | Uploaded images | EU jurisdiction (`R2_JURISDICTION=eu`) | R2 env config |
| **Apple** | Sign in with Apple, APNs | ✅ | Auth identifiers, push tokens | Global (incl. US) | `src/routes/auth/oauth-apple.js`, native |
| **Google** | Google Sign-In | ✅ | OAuth identifiers | US / global | OAuth routes |
| **Google FCM** | Android push | ❌ | — | — | No `FCM_SERVER_KEY` on prod |
| **RevenueCat** | IAP entitlement sync | ❌ | — | — | No `REVENUECAT_API_KEY`; health `iap_webhook_ready: false` |
| **Google Analytics 4** | Web analytics (optional) | ⚡ consent | Consent-gated page/events | US when enabled | `cookie-banner.js` |
| **Meta (Facebook Pixel)** | Marketing measurement (optional) | ⚡ consent | Consent-gated | US when enabled | `cookie-banner.js` |
| **Google Ads** | Ads conversion (optional) | ⚡ consent | Consent-gated | US when enabled | `marketing-events.js` |
| **Neon** | PostgreSQL (dev/legacy docs) | ❌ | — | — | Not prod `DATABASE_URL` |

**LDRA-A3 closed:** [`processor-register.md`](./internal/processor-register.md) v0.2 (2026-08-20).

---

## Cookies & similar technologies (web)

| Category | Default | Mechanism |
|----------|---------|-----------|
| Strictly necessary | Always on | Session cookies (`access_token`, `refresh_token`), CSRF |
| Preferences | App storage | Theme etc. |
| Analytics | Opt-in | GA4 via GCM v2 consent update |
| Marketing | Opt-in | Meta Pixel, Google Ads tags |
| Persistence | 1 year | `cc_consent` cookie + `localStorage.cookie_consent` |

Child in-app WebView: consent banner on `/en/*` public pages; logged-in app settings referenced in tracking notice.

**Explicit product rule (code):** client analytics whitelist in `src/routes/analytics.js`; marketing scripts consent-gated; no code path sends child routine completions to ad platforms.

---

## Data subject rights (implemented)

| Right | Implementation |
|-------|----------------|
| Access / portability | `GET /api/account/export-data` → ZIP of CSVs (24h rate limit per parent) — `src/routes/account/export.js` |
| Erasure | `DELETE /api/family/delete-account` — `src/routes/family/account.js` |
| Rectification | In-app profile/settings (parent-edited) |
| Restrict / object (marketing) | Cookie banner; email unsubscribe token in `email_subscriptions` |
| Complaint to authority | Not automated — contact form |

### Deletion scope (family delete)

**Deleted:** family-scoped operational data including children, schedules, logs, rewards, push tokens, refresh tokens, `analytics_events` for family, avatars, win_back rows for parents, etc. (see `account.js`).

**Not deleted (documented in engineering spec):**

| Table | Reason |
|-------|--------|
| `admin_audit_log` | Admin audit trail |
| `contact_message` | Support/legal correspondence |
| `analytics_daily_snapshots` | Aggregated metrics (no family_id) |

**LDRA-B3:** statutory retention for contact/support logs and whether aggregate snapshots require mention in public notice — disclosed as exceptions in EEA privacy.

---

## Retention (code-evidenced)

| Data | Retention rule | Source |
|------|----------------|--------|
| Account data | Until account deletion | `account.js`, privacy copy |
| `notification_log` | Pruned after 7 days | midnight scheduler (`CLAUDE.md`) |
| `analytics_events` | Until family delete | `account.js` |
| Professional share links | 7 days default expiry + revoke | `professional_share_link` schema |
| Refresh tokens | 30d TTL default | `CLAUDE.md` / auth session |

---

## Security measures (high level)

- HTTPS for live traffic
- Passwords bcrypt-hashed (privacy copy)
- Child scope server-enforced (`requireChild`, authz middleware)
- CSRF on destructive parent actions
- PIN lockout after failed attempts (`pin_lockout`, `pin_audit_log`)

---

## Payments (Ireland commercial track overlap)

- No card numbers stored in application database
- Native: Apple/Google IAP via RevenueCat webhook → `family` subscription fields
- Web: no Stripe checkout (removed); subscription enforcement via `src/lib/subscription.js`

**LDRA-A6 accepted:** Irish consumer/IAP disclosures in EEA Terms §7 (Apple/Google MoR, EUR pricing, store-managed renewal/cancellation). CCPC digital content guidance applied internally — not externally legally verified.

---

## Analytics event types (non-exhaustive)

Server-side product analytics via `analytics_events` (family UUID + event_type + metadata JSONB). Client beacon whitelist in `src/routes/analytics.js` (`ALLOWED_CLIENT_EVENTS`). Metadata enriched with actor role via `session-telemetry` — **no IP stored in analytics route comment**.

Win-back emails may include child first name in email content (`analytics-tracker.js` `trackWinBackEmailSent`) — parent-facing email only.

---

## Documents superseded by this track

Placeholder HTML under `public/en/eea-*.html` replaced with reality-based English drafts in the same PR series as this folder.
