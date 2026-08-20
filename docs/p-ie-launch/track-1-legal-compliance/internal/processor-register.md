# Processor Register

**Controller:** Papa Bravo AB · **Version:** 0.2 · **Verified:** 2026-08-20 (prod VPS read-only)  
**Evidence:** VPS SSH probe of deploy `.env` on VPS (path in deploy ops docs; secrets redacted), `GET /health`, ipinfo.io for `188.66.60.93`

> **Prod architecture note:** The live VPS deploy uses **self-hosted PostgreSQL on localhost** — not Neon. Neon appears in repo/dev docs but is **not** the prod `DATABASE_URL` as deployed.

---

## Active on prod VPS (verified 2026-08-20)

| Processor | Service | Personal data | Location (verified) | GDPR role | DPA / terms | Evidence |
|-----------|---------|---------------|---------------------|-----------|-------------|----------|
| **Self-hosted PostgreSQL** | Primary application database | All account/family data at rest | **Stockholm, SE** — `localhost:5432` on VPS `188.66.60.93`; PostgreSQL service active | Controller-hosted (Papa Bravo AB); VPS provider = infrastructure sub-processor | N/A (first-party DB) | VPS SSH: `DATABASE_URL` host=localhost; `ss -ltn` :5432 |
| **Inleed / Yelles AB** | VPS hosting (AS206170) | Data in memory, logs, `.env` at runtime | **Stockholm, Sweden (EU/EEA)** | Infrastructure processor / sub-processor | Provider contract (hosting agreement) | ipinfo.io org `AS206170 Yelles AB`; hostname `server-188-66-60-93`; TZ `Europe/Stockholm` |
| **Cloudflare, Inc.** | R2 object storage | Avatar / uploaded images | **EU jurisdiction** — `UPLOAD_STORAGE=r2`, `R2_JURISDICTION=eu`, S3 endpoint `*.eu.r2.cloudflarestorage.com` | Processor (Art. 28) | [Cloudflare Customer DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) (part of Self-Serve Agreement) | VPS env + [R2 jurisdictional restrictions](https://developers.cloudflare.com/r2/reference/data-location/) |
| **Resend (Plus Five Five, Inc.)** | Transactional email | Parent email, name in templates | **United States** (processor HQ) | Processor | [Resend DPA](https://resend.com/legal/dpa) incl. EU SCCs; effective on account signup | `RESEND_API_KEY` set; `EMAIL_ENABLED=true` |
| **Apple Inc.** | Sign in with Apple (native), APNs push | Auth identifiers, push tokens | **Global Apple infrastructure** (transfers may reach US) | Separate roles: Apple = platform for Sign in with Apple; APNs delivery processor for push tokens we send | Apple Developer Program License Agreement; EEA transfers per [Apple Privacy Policy](https://www.apple.com/legal/privacy/) (SCCs) | `APNS_*` set; `APPLE_CLIENT_ID` set |
| **Google LLC** | Google Sign-In (web) | OAuth identifiers, email/name from Google account | **United States / global Google infra** | Google OAuth/API services — Google processes sign-in; we are controller for data we store | [Google APIs Terms](https://developers.google.com/terms); transfer safeguards: [Google data transfer frameworks](https://policies.google.com/privacy/frameworks) (DPF + SCCs for business services) | `GOOGLE_WEB_CLIENT_ID` set |
| **Google LLC** | Google Analytics 4 (optional) | Online identifiers, page events | **United States** when enabled | Processor (when consent granted) | [Google Ads/Analytics Data Processing Terms](https://www.google.com/analytics/terms/dpa/dataprocessingamendment_20200816.html) + SCCs; consent-gated | Hard-coded `G-8PYNFJH1EQ` in `cookie-banner.js`; default deny |
| **Google LLC** | Google Ads (optional) | Ad cookies / conversion events | **United States** when enabled | Processor (when consent granted) | Same Google business DPT + SCCs; consent-gated | `AW-7601142474` in `marketing-events.js`; default deny |
| **Meta Platforms, Inc.** | Meta Pixel (optional) | Marketing cookies / page events | **United States** when enabled | Processor (when consent granted) | [Meta Data Processing Terms](https://www.facebook.com/legal/terms/dataprocessing) + [EU Data Transfer Addendum](https://www.facebook.com/legal/EU_data_transfer_addendum); consent-gated | `cookie-banner.js` Meta Pixel; default deny |

---

## Inactive on prod VPS (verified 2026-08-20)

| Processor | Reason inactive | Notes for Ireland launch |
|-----------|-----------------|---------------------------|
| **Neon Tech** | Prod `DATABASE_URL` = `localhost:5432`, not Neon | Dev/legacy reference only unless prod DB migrates |
| **RevenueCat, Inc.** | No `REVENUECAT_API_KEY`; health `iap_webhook_ready: false` | Required before native IAP entitlement sync; [RevenueCat DPA](https://www.revenuecat.com/dpa) + EU SCCs documented for enablement |
| **Google FCM** | No `FCM_SERVER_KEY` | Android native push stub only; APNs active for iOS |
| **Meta (Facebook page cross-post)** | No `FACEBOOK_PAGE_*` env vars | Admin dagens nyhet cross-post disabled |

---

## Non-processor / independent controllers

| Party | Role | Evidence |
|-------|------|----------|
| Recipient of professional share link | Independent controller once parent shares URL | LDRA-B4; disclosed in EEA privacy |
| Apple App Store / Google Play | Merchant of record for IAP (when live) | LDRA-A6; Terms §7 |

---

## Verification log

| Item | Result | Date |
|------|--------|------|
| Prod DB region | Local PostgreSQL on VPS, Stockholm SE | 2026-08-20 |
| VPS provider/location | Inleed / Yelles AB, Stockholm SE | 2026-08-20 |
| R2 active + EU jurisdiction | Yes (`UPLOAD_STORAGE=r2`, `R2_JURISDICTION=eu`) | 2026-08-20 |
| Active processor DPA status | Documented below in transfer register | 2026-08-20 |

**LDRA-A3:** Closed on verified prod facts (see [`LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md`](../LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md)).
