# Ireland Country Overlay

**Version:** 0.1 · **Date:** August 2026  
**Purpose:** IE-specific legal/compliance additions on top of EEA baseline documents (`/en/eea/*`).  
**Status:** Internal draft — see [`LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md`](../LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md)

---

## 1. Supervisory authority

| Item | Draft text (public notice) | Status |
|------|------------------------------|--------|
| Lead authority | Integritetsskyddsmyndigheten (IMY), Sweden | **Accepted** (LDRA-C-A) |
| Concerned authority (IE users) | Data Protection Commission (DPC), Ireland | Irish users may lodge complaints with DPC |
| Complaint right | Right to lodge complaint with DPC | Standard GDPR |
| DPC contact | https://www.dataprotection.ie | Public link |

---

## 2. Controller establishment

| Item | Value | Status |
|------|-------|--------|
| Controller | Papa Bravo AB (Sweden) — EU-established | **Accepted** |
| Article 27 representative | Not required (EU establishment) | **Accepted N/A** (LDRA-C-B) |
| Contact point | `/en/contact` | Operational |

---

## 3. Irish consumer & digital content

| Topic | Product fact | Status |
|-------|--------------|--------|
| Pricing currency | EUR default for IE (`market-config.js`) | Commercial track |
| IAP merchant | Apple App Store / Google Play via RevenueCat | **Accepted** (LDRA-A6) — Terms §7 |
| Free trial / subscription copy | EN paywall strings — commercial track | Commercial track verifies |
| October 2026 SE billing | Sweden payment rollout separate from IE launch | Document in launch control |

---

## 4. Children & Irish law

| Topic | Status |
|-------|--------|
| Article 8 / consent scope | **Accepted** (LDRA-A1) — parent contract model; narrow Art. 8 scope |
| Parental consent model | Parent registers, child PIN — documented in child privacy notice |
| Children's privacy notice | `/en/eea/child-privacy` |
| Optional wellbeing notes | **Art. 9 guardrails** (LDRA-A2) — not health-data positioning; enhanced protection for voluntary sensitive free text |

---

## 5. Marketing to Irish users

| Channel | Consent | Child data |
|---------|---------|------------|
| Web GA4 / Meta / Google Ads | Opt-in cookie banner | No child event payloads in code |
| Push notifications | Parent opt-in | Parent device |
| Email newsletter | Opt-in | Parent email |
| Win-back email | LDRA-B2 accepted | May include child first name |

See [`marketing-child-data-assessment.md`](./marketing-child-data-assessment.md).

---

## 6. Data localisation & transfers

| Item | Status |
|------|--------|
| Core hosting regions | ✅ **Verified** (LDRA-A3 closed 2026-08-20) — VPS PostgreSQL + Inleed hosting, Stockholm SE; R2 EU jurisdiction |
| US processors | ✅ **Documented** (LDRA-A4 closed 2026-08-20) — Resend, Apple, Google Sign-In, optional consent-gated GA4/Ads/Meta |

---

## 7. Public document overlay map

When IE launches (after internal sign-off):

| Base document | IE overlay section |
|---------------|-------------------|
| `/en/eea/privacy` | § Supervisory authority (DPC) · § IMY/DPC model · § Transfers summary |
| `/en/eea/terms` | § Irish consumer / digital content · § EUR/IAP |
| `/en/eea/child-privacy` | § Parent-managed child model |
| `/en/tracking-choices` | No IE-specific change expected |

---

## 8. Launch gate

**Do not enable `market_ie_open` until:**

- [x] LDRA-A3 + A4 closed (processor/transfer verification — 2026-08-20)
- [ ] Internal sign-off on [`TRACK-1-SELF-SIGNOFF-REPORT.md`](../TRACK-1-SELF-SIGNOFF-REPORT.md)
- [ ] `resolveLegalRoutes()` flipped to `live` (separate PR)
- [ ] Commercial/store + Ireland RC complete
