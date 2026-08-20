# Processor Register

**Controller:** Papa Bravo AB · **Version:** 0.1 · **Date:** August 2026

| Processor | Service | Personal data processed | Location (declared / code) | DPA status | Sub-processors |
|-----------|---------|-------------------------|----------------------------|------------|----------------|
| **Neon Tech** | PostgreSQL database | All application personal data | **Open (LDRA-A3)** — verify prod region | **Open** — file DPA | Neon sub-processor list |
| **VPS provider** | Application hosting | Data in memory/logs at runtime | **Open (LDRA-A3)** — confirm deploy host | **Open** | Provider-specific |
| **Resend** | Email delivery | Parent email, name in templates | Likely US | **Open** — Resend DPA | Resend sub-processors |
| **Cloudflare, Inc.** | R2 object storage (optional) | Avatar images | **Open** if R2 enabled | **Open** — Cloudflare DPA | Cloudflare |
| **Apple Inc.** | Sign in with Apple, APNs, App Store | Auth identifiers, push tokens, purchase data | Global Apple infra | Apple platform terms | Apple infrastructure |
| **Google LLC** | Google Sign-In, FCM, Play, Analytics, Ads | Auth identifiers, push tokens, analytics cookies | Global Google infra | Google platform terms | Google |
| **Meta Platforms** | Meta Pixel (optional) | Marketing cookies/events | US (typical) | Meta Business Tools terms | Meta |
| **RevenueCat, Inc.** | Subscription management | Customer IDs, entitlement events | US (typical) | **Open** — RevenueCat DPA | RevenueCat |

---

## Non-processor / independent controllers

| Party | Role |
|-------|------|
| Recipient of professional share link | Independent controller once parent shares URL — disclosed in privacy notice (LDRA-B4) |
| Apple / Google (store billing) | Merchant of record for IAP — disclosed in Terms §7 (LDRA-A6) |

---

## Action list before `resolveLegalRoutes()` live

1. Verify Neon prod region + VPS location; record in this table.
2. Collect DPAs (or confirm platform terms) for each processor above.
3. Update public Privacy Notice processor list with verified facts only.
4. Close LDRA-A3 in [`LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md`](../LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md).
