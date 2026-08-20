# Processor Register

**Controller:** Papa Bravo AB · **Version:** 0.1 · **Date:** August 2026

| Processor | Service | Personal data processed | Location (declared / code) | DPA status | Sub-processors |
|-----------|---------|-------------------------|----------------------------|------------|----------------|
| **Neon Tech** | PostgreSQL database | All application personal data | **`LEGAL_REVIEW_REQUIRED`** (confirm EU region for prod DB) | **`LEGAL_REVIEW_REQUIRED`** | Neon sub-processor list |
| **VPS provider** | Application hosting | Data in memory/logs at runtime | EU/EES stated in Swedish privacy | **`LEGAL_REVIEW_REQUIRED`** | Provider-specific |
| **Resend** | Email delivery | Parent email, name in templates | **`LEGAL_REVIEW_REQUIRED`** (likely US) | **`LEGAL_REVIEW_REQUIRED`** | Resend DPA |
| **Cloudflare, Inc.** | R2 object storage (optional) | Avatar images | **`LEGAL_REVIEW_REQUIRED`** | **`LEGAL_REVIEW_REQUIRED`** | Cloudflare DPA |
| **Apple Inc.** | Sign in with Apple, APNs, App Store | Auth identifiers, push tokens, purchase data | Global | Apple terms + **`LEGAL_REVIEW_REQUIRED`** DPA/SCC where applicable | Apple infrastructure |
| **Google LLC** | Google Sign-In, FCM, Play, Analytics, Ads | Auth identifiers, push tokens, analytics cookies | Global | **`LEGAL_REVIEW_REQUIRED`** | Google Ads/Analytics terms |
| **Meta Platforms** | Meta Pixel (optional) | Marketing cookies/events | **`LEGAL_REVIEW_REQUIRED`** | **`LEGAL_REVIEW_REQUIRED`** | Meta Business Tools terms |
| **RevenueCat, Inc.** | Subscription management | Customer IDs, entitlement events | **`LEGAL_REVIEW_REQUIRED`** (US) | **`LEGAL_REVIEW_REQUIRED`** | RevenueCat DPA |

---

## Non-processor / independent controllers

| Party | Role |
|-------|------|
| Recipient of professional share link | Independent controller once parent shares URL **`LEGAL_REVIEW_REQUIRED`** wording in privacy notice |
| Apple / Google (store billing) | Merchant of record for IAP **`LEGAL_REVIEW_REQUIRED`** consumer disclosure |

---

## Action list before Ireland launch

1. Collect signed DPAs (or confirm platform terms adequacy) for each processor above.
2. File sub-processor notification procedure.
3. Update public Privacy Notice Annex / processor list to match signed set.
4. Confirm Neon + VPS hosting region documentation on file.
