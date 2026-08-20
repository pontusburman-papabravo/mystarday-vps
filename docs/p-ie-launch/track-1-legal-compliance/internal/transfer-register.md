# Transfer Register (international transfers)

**Controller:** Papa Bravo AB · **Version:** 0.1 · **Date:** August 2026

Core application data is intended for EU/EEA hosting where applicable; exact Neon and VPS regions under verification (**LDRA-A3**). Third-country transfers occur via **optional marketing/analytics** (consent-gated) and **US-based SaaS processors**.

---

| Transfer | From | To (country) | Data categories | Mechanism | Status |
|----------|------|--------------|-----------------|-----------|--------|
| Database hosting (Neon) | EEA users | **Open** | All account data | SCCs if non-EEA; verify region | LDRA-A3 |
| Email (Resend) | EEA | Likely US | Email, name | DPA + SCC / DPF | LDRA-A4 |
| Avatars (Cloudflare R2) | EEA | **Open** if enabled | Profile images | Cloudflare DPA | LDRA-A3/A4 |
| RevenueCat webhooks | EEA | US (typical) | Subscription IDs, events | RevenueCat DPA + SCC/DPF | LDRA-A4 |
| Google Analytics 4 (consent) | EEA | US | Online identifiers, usage | Consent + SCC/TIA | LDRA-A4 — opt-in only |
| Google Ads (consent) | EEA | US | Ad cookies | Consent + SCC/TIA | LDRA-A4 — opt-in only |
| Meta Pixel (consent) | EEA | US | Ad cookies | Consent + SCC/TIA | LDRA-A4 — opt-in only |
| Apple APNs / Sign in | EEA | Global Apple infra | Auth, push tokens | Apple terms + SCC where applicable | LDRA-A4 |
| Google FCM / Sign in | EEA | Global Google infra | Auth, push tokens | Google terms + SCC where applicable | LDRA-A4 |
| Professional share link recipient | EEA | Any (recipient choice) | Parent-selected child stats | Parent-initiated user-directed transfer | LDRA-B4 accepted |

---

## Transfer Impact Assessments (TIA)

| Processor | TIA required? | Status |
|-----------|---------------|--------|
| Google Analytics / Ads | Yes if US transfer | **Open** — file before `live` |
| Meta Pixel | Yes if US transfer | **Open** |
| RevenueCat | Yes | **Open** |
| Resend | Yes | **Open** |

---

## Mitigations in product (code)

- Marketing/analytics tags **not loaded** until consent (`cookie-banner.js` default denied).
- No child routine data sent to ad platforms (implementation review — see child data assessment).
- Family delete removes `analytics_events` for that family.

---

## Public disclosure

EEA Privacy Notice includes processor list and transfer summary — `/en/eea/privacy`.

Close **LDRA-A4** before `resolveLegalRoutes()` → `live`.
