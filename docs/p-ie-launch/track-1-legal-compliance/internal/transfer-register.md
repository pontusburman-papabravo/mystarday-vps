# Transfer Register (international transfers)

**Controller:** Papa Bravo AB · **Version:** 0.2 · **Verified:** 2026-08-20  
**Scope:** Active prod VPS services on `188.66.60.93` + consent-gated client-side tags

---

## EEA storage — no third-country transfer

| Processing | From | To | Data | Mechanism | Evidence |
|------------|------|-----|------|-----------|----------|
| Application database | EEA users | **VPS PostgreSQL, Stockholm SE** | All account data at rest | Data remains in EU/EEA; no transfer | VPS SSH `localhost:5432` |
| VPS runtime | EEA users | **Inleed VPS, Stockholm SE** | Memory, logs, sessions | EU/EEA hosting | ipinfo.io AS206170 |
| Cloudflare R2 avatars | EEA users | **EU R2 jurisdiction bucket** | Profile images | EU jurisdictional restriction + Cloudflare DPA; objects stored in EU jurisdiction per bucket config | `R2_JURISDICTION=eu`; [R2 data location](https://developers.cloudflare.com/r2/reference/data-location/) |

---

## Active third-country transfers — documented mechanisms

| Transfer | Processor | To | Data categories | Mechanism | Consent / basis | Official source |
|----------|-----------|-----|-----------------|-----------|-----------------|-----------------|
| Transactional email | Resend | **US** | Parent email, name | **DPA + EU SCCs** (incorporated on signup) | Contract (Art. 6(1)(b)) | [resend.com/legal/dpa](https://resend.com/legal/dpa) |
| Google Sign-In (web) | Google | **US / global** | OAuth tokens, email/name from Google | **Google API Terms** + **DPF/SCC** per [Google transfer frameworks](https://policies.google.com/privacy/frameworks) | Contract + user OAuth action | [developers.google.com/terms](https://developers.google.com/terms) |
| Sign in with Apple / APNs | Apple | **Global (incl. US)** | Auth IDs, push tokens | **Apple SCCs** for EEA-origin transfers; Developer Program terms | Contract + user action / push opt-in | [apple.com/legal/privacy](https://www.apple.com/legal/privacy/) |
| GA4 (optional) | Google | **US** | Client IDs, page events | **Google Ads/Analytics DPT + SCCs**; **consent** (Art. 6(1)(a)) | Opt-in only (`cookie-banner.js` default deny) | [Google Ads DPT](https://www.google.com/analytics/terms/dpa/dataprocessingamendment_20200816.html) |
| Google Ads (optional) | Google | **US** | Ad cookies, conversions | Same Google business DPT + SCCs; **consent** | Opt-in only | Same as GA4 DPT |
| Meta Pixel (optional) | Meta | **US** | Ad cookies, page events | **Meta Data Processing Terms + EU Data Transfer Addendum (SCCs)**; **consent** | Opt-in only | [Meta DPA](https://www.facebook.com/legal/terms/dataprocessing), [EU transfer addendum](https://www.facebook.com/legal/EU_data_transfer_addendum) |
| Professional share link | Recipient (any country) | **User-selected** | Parent-selected child stats | **Parent-initiated** disclosure; recipient becomes independent controller | Parent action (Art. 6 + transparency) | LDRA-B4 |

---

## Inactive / pre-documented for enablement

| Transfer | Status | Mechanism when enabled |
|----------|--------|------------------------|
| RevenueCat webhooks | **Inactive** on prod VPS (no API key) | [RevenueCat DPA](https://www.revenuecat.com/dpa) + EU SCCs (Section 5 of DPA) |
| Google FCM | **Inactive** (no `FCM_SERVER_KEY`) | Google business DPT + SCCs when configured |
| Neon database | **Not used in prod** | N/A unless prod architecture changes |

---

## Transfer impact assessment (internal summary)

| Processor | TIA needed? | Internal conclusion |
|-----------|-------------|---------------------|
| Resend | Yes (US) | Vendor DPA + SCCs; transactional necessity; no marketing use |
| Google Sign-In | Yes (US) | Vendor DPF/SCC framework; limited OAuth fields stored |
| Apple APNs | Yes (global) | Apple SCCs; push tokens only; deleted on logout/delete |
| GA4 / Google Ads | Yes (US) | Consent-gated; off by default; vendor DPT + SCCs |
| Meta Pixel | Yes (US) | Consent-gated; off by default; Meta DPA + EU SCC addendum |
| R2 EU | No third-country transfer for stored objects | EU jurisdiction bucket |

No launch-relevant active service remains with unknown transfer mechanism.

**LDRA-A4:** Closed on documented vendor mechanisms for all **active** third-country processors (2026-08-20).

---

## Public disclosure

EEA Privacy Notice processor list should reflect: local EU/EEA database on VPS, Cloudflare R2 EU, Resend US (SCC), optional US analytics/marketing (consent), Apple/Google platform services.
