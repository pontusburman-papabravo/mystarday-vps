# Ireland Country Overlay

**Version:** 0.1 · **Date:** August 2026  
**Purpose:** IE-specific legal/compliance additions on top of EEA baseline documents (`/en/eea/*`).  
**Status:** Draft — items marked **`LEGAL_REVIEW_REQUIRED`** must be resolved before `market_ie_open ON`.

---

## 1. Supervisory authority

| Item | Draft text (public notice) | Status |
|------|------------------------------|--------|
| Lead authority for IE residents | Data Protection Commission (DPC), Ireland | **`LEGAL_REVIEW_REQUIRED`** — confirm lead authority vs cross-border one-stop-shop with Swedish IMY |
| Complaint right | Right to lodge complaint with DPC | Standard GDPR — counsel wording |
| DPC contact | https://www.dataprotection.ie | Public link |

---

## 2. Controller establishment

| Item | Value | Status |
|------|-------|--------|
| Controller | Papa Bravo AB (Sweden) | **`LEGAL_REVIEW_REQUIRED`** — whether EU Article 27 representative is required in Ireland/EEA |
| Contact point | `/en/contact` | Operational |

---

## 3. Irish consumer & digital content

| Topic | Product fact | Status |
|-------|--------------|--------|
| Pricing currency | EUR default for IE (`market-config.js`) | Commercial track |
| IAP merchant | Apple App Store / Google Play via RevenueCat | **`LEGAL_REVIEW_REQUIRED`** Terms § payment & withdrawal |
| Free trial / subscription copy | EN paywall strings — commercial track | **`LEGAL_REVIEW_REQUIRED`** |
| October 2026 SE billing | Sweden payment rollout separate from IE launch | Document in launch control |

---

## 4. Children & Irish law

| Topic | Status |
|-------|--------|
| Age of digital consent in Ireland | **`LEGAL_REVIEW_REQUIRED`** |
| Parental consent model (parent registers, child PIN) | **`LEGAL_REVIEW_REQUIRED`** acceptability for DPC |
| Children's privacy notice plain language | Draft at `/en/eea/child-privacy` |
| Optional wellbeing notes (`pedagog_notes`) | **`LEGAL_REVIEW_REQUIRED`** if health-adjacent |

---

## 5. Marketing to Irish users

| Channel | Consent | Child data |
|---------|---------|------------|
| Web GA4 / Meta / Google Ads | Opt-in cookie banner | No child event payloads in code |
| Push notifications | Parent opt-in | Parent device |
| Email newsletter | Opt-in | Parent email |
| Win-back email | **`LEGAL_REVIEW_REQUIRED`** classification | May include child first name |

See [`marketing-child-data-assessment.md`](./marketing-child-data-assessment.md).

---

## 6. Data localisation & transfers

| Item | Status |
|------|--------|
| Primary hosting EU/EEA | Stated in privacy; **`LEGAL_REVIEW_REQUIRED`** confirm Neon region + VPS location |
| US processors (Resend, RC, optional analytics) | Transfer register + SCCs **`LEGAL_REVIEW_REQUIRED`** |

---

## 7. Public document overlay map

When IE launches, public pages should include (after counsel sign-off):

| Base document | IE overlay section |
|---------------|-------------------|
| `/en/eea/privacy` | § Supervisory authority (DPC) · § IE contact · § Transfers summary |
| `/en/eea/terms` | § Irish consumer law / digital content · § EUR/IAP |
| `/en/eea/child-privacy` | § Irish children wording review |
| `/en/tracking-choices` | No IE-specific change expected |

Until overlay signed, IE users see EEA baseline + this internal overlay pending publication.

---

## 8. Launch gate

**Do not enable `market_ie_open` until:**

- [ ] All **`LEGAL_REVIEW_REQUIRED`** rows in this overlay closed
- [ ] [`LEGAL_REVIEW_REQUIRED.md`](../LEGAL_REVIEW_REQUIRED.md) queue empty or accepted
- [ ] Commercial/store + Ireland RC complete
