# Ireland Country Overlay

**Version:** 0.1 · **Date:** August 2026  
**Purpose:** IE-specific legal/compliance additions on top of EEA baseline documents (`/en/eea/*`).  
**Status:** Draft — items marked **`LEGAL_REVIEW_REQUIRED`** must be resolved before `market_ie_open ON`.

---

## 1. Supervisory authority

| Item | Draft text (public notice) | Status |
|------|------------------------------|--------|
| Lead authority | Integritetsskyddsmyndigheten (IMY), Sweden — expected lead SA for cross-border processing | **`LEGAL_REVIEW_REQUIRED`** — counsel confirm (see `LEGAL_REVIEW_REQUIRED.md` C-A) |
| Concerned authority (IE users) | Data Protection Commission (DPC), Ireland | Standard GDPR — Irish users may lodge complaints with DPC |
| Complaint right | Right to lodge complaint with DPC (and IMY where applicable) | Counsel wording |
| DPC contact | https://www.dataprotection.ie | Public link |

---

## 2. Controller establishment

| Item | Value | Status |
|------|-------|--------|
| Controller | Papa Bravo AB (Sweden) — EU-established | Article 27 representative expected **N/A** — counsel confirm (see `LEGAL_REVIEW_REQUIRED.md` C-B) |
| Contact point | `/en/contact` | Operational |

---

## 3. Irish consumer & digital content

| Topic | Product fact | Status |
|-------|--------------|--------|
| Pricing currency | EUR default for IE (`market-config.js`) | Commercial track |
| IAP merchant | Apple App Store / Google Play via RevenueCat | **`LEGAL_REVIEW_REQUIRED`** Terms § payment & withdrawal (A6) |
| Free trial / subscription copy | EN paywall strings — commercial track | **`LEGAL_REVIEW_REQUIRED`** (A6) |
| October 2026 SE billing | Sweden payment rollout separate from IE launch | Document in launch control |

---

## 4. Children & Irish law

| Topic | Status |
|-------|--------|
| Article 8 / consent scope | **`LEGAL_REVIEW_REQUIRED`** — which child-processing activities rely on consent such that Article 8 and Ireland’s age-16 threshold applies? (A1) |
| Parental consent model (parent registers, child PIN) | Covered under A1 — adequacy for Irish DPC expectations |
| Children's privacy notice plain language | Draft at `/en/eea/child-privacy` |
| Optional wellbeing notes (`pedagog_notes`) | **`LEGAL_REVIEW_REQUIRED`** Article 9 risk (A2) |

---

## 5. Marketing to Irish users

| Channel | Consent | Child data |
|---------|---------|------------|
| Web GA4 / Meta / Google Ads | Opt-in cookie banner | No child event payloads in code |
| Push notifications | Parent opt-in | Parent device |
| Email newsletter | Opt-in | Parent email |
| Win-back email | **`LEGAL_REVIEW_REQUIRED`** classification (B2) | May include child first name |

See [`marketing-child-data-assessment.md`](./marketing-child-data-assessment.md).

---

## 6. Data localisation & transfers

| Item | Status |
|------|--------|
| Core hosting regions | EEA Privacy states aim for EU/EEA where applicable; exact Neon + VPS regions **`LEGAL_REVIEW_REQUIRED`** (A3) |
| US processors (Resend, RC, optional analytics) | Transfer register + DPF/SCC/TIA **`LEGAL_REVIEW_REQUIRED`** (A4) |

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

- [ ] All **`LEGAL_REVIEW_REQUIRED`** Priority A rows closed or accepted
- [ ] Short confirmations C-A and C-B closed
- [ ] [`LEGAL_REVIEW_REQUIRED.md`](../LEGAL_REVIEW_REQUIRED.md) Priority A queue empty or accepted
- [ ] Commercial/store + Ireland RC complete
