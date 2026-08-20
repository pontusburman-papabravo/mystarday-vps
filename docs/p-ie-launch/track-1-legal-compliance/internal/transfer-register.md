# Transfer Register (international transfers)

**Controller:** Papa Bravo AB · **Version:** 0.1 · **Date:** August 2026

Assumption: primary storage and VPS processing intended within **EU/EEA** (per existing Swedish privacy). Third-country transfers occur primarily via **optional marketing/analytics** and **US-based SaaS processors**.

---

| Transfer | From | To (country) | Data categories | Mechanism | Status |
|----------|------|--------------|-----------------|-----------|--------|
| Database hosting (Neon) | EEA users | **`LEGAL_REVIEW_REQUIRED`** | All account data | **`LEGAL_REVIEW_REQUIRED`** | Confirm region + SCCs if US |
| Email (Resend) | EEA | Likely US | Email, name | **`LEGAL_REVIEW_REQUIRED`** | DPA + SCC/ adequacy |
| Avatars (Cloudflare R2) | EEA | **`LEGAL_REVIEW_REQUIRED`** | Profile images | **`LEGAL_REVIEW_REQUIRED`** | Only if R2 enabled |
| RevenueCat webhooks | EEA | US (typical) | Subscription IDs, events | **`LEGAL_REVIEW_REQUIRED`** | RevenueCat DPA |
| Google Analytics 4 (consent) | EEA | US | Online identifiers, usage | Consent + **`LEGAL_REVIEW_REQUIRED`** SCC/TIA | Opt-in only |
| Google Ads (consent) | EEA | US | Ad cookies | Consent + **`LEGAL_REVIEW_REQUIRED`** | Opt-in only |
| Meta Pixel (consent) | EEA | US | Ad cookies | Consent + **`LEGAL_REVIEW_REQUIRED`** | Opt-in only |
| Apple APNs / Sign in | EEA | Global Apple infra | Auth, push tokens | Apple terms + **`LEGAL_REVIEW_REQUIRED`** | Required for iOS features |
| Google FCM / Sign in | EEA | Global Google infra | Auth, push tokens | Google terms + **`LEGAL_REVIEW_REQUIRED`** | Required for Android features |
| Professional share link recipient | EEA | Any (recipient choice) | Parent-selected child stats | Parent-initiated — **`LEGAL_REVIEW_REQUIRED`** classify as user-directed transfer |

---

## Transfer Impact Assessments (TIA)

| Processor | TIA required? | Status |
|-----------|---------------|--------|
| Google Analytics / Ads | **`LEGAL_REVIEW_REQUIRED`** if US transfer post-Schrems II | Not in repo |
| Meta Pixel | **`LEGAL_REVIEW_REQUIRED`** | Not in repo |
| RevenueCat | **`LEGAL_REVIEW_REQUIRED`** | Not in repo |
| Resend | **`LEGAL_REVIEW_REQUIRED`** | Not in repo |

---

## Mitigations in product (code)

- Marketing/analytics tags **not loaded** until consent (`cookie-banner.js` default denied).
- No child routine data sent to ad platforms (implementation review — see child data assessment).
- Family delete removes `analytics_events` for that family.

---

## Public disclosure

EEA Privacy Notice includes processor list and transfer summary — see `/en/eea/privacy` (Track 1 draft).
