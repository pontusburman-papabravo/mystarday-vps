# Track 1 — Internal Legal Self-Signoff Report

**Date:** 20 August 2026  
**Branch:** `cursor/p-ie-launch-legal-6b85` · PR #1051  
**Model:** Internal compliance sign-off — **not externally legally verified**

---

## Executive summary

Track 1 **interna compliance sign-off är godkänd** av controller (20 Aug 2026, verifierat mot `4f5859d2`). **LDRA-A3 och A4 stängda** (20 Aug 2026) efter read-only prod-verifiering via VPS SSH + vendor documentation. Dokumenterade residualrisker accepterade.

We do **not** claim legal approval. Public documents carry honest v0.1 disclaimers.

**Founder sign-off:** ✅ **Approved** — internal risk acceptance only; not external legal verification.

**Gates efter sign-off:**

| Gate | Status |
|------|--------|
| `resolveLegalRoutes()` → `live` | **Eligible** — A3 + A4 closed; separate PR to flip routing (not in this task) |
| `market_ie_open ON` | Blocked until **Commercial/Store + Ireland RC + Launch Control** |

---

## Sign-off checklist

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | No HIGH unresolved risks | ✅ | Highest accepted = MEDIUM (A1, A2 interpretive) |
| 2 | Public statements match implementation | ✅ | EEA privacy processor section synced with prod verification |
| 3 | Processor/hosting/transfer facts verified | ✅ | LDRA-A3 + A4 closed 2026-08-20 — VPS SSH + vendor docs |
| 4 | Child lawful bases documented | ✅ | [`lawful-basis-register.md`](./internal/lawful-basis-register.md) + A2 Art. 9 guardrails |
| 5 | Irish IAP disclosures match flow | ✅ | EEA Terms §7; RevenueCat/native only (RC API inactive on prod until commercial track) |

**Overall:** ✅ **Track 1 internally complete** for legal/compliance docs. `live` flip is a separate product PR. `market_ie_open` requires commercial/RC/launch control.

---

## Decision summary

| ID | Topic | Residual risk | Launch blocker | Status |
|----|-------|---------------|----------------|--------|
| A1 | Child processing / Art. 8 | MEDIUM | NO | ✅ Accepted |
| A2 | Article 9 / wellbeing guardrails | MEDIUM | NO | ✅ Accepted (guardrails documented) |
| A3 | Processors + hosting regions | LOW | NO | ✅ **Closed** 2026-08-20 |
| A4 | International transfers | LOW | NO | ✅ **Closed** 2026-08-20 |
| A5 | Public document accuracy | LOW | NO | ✅ Accepted |
| A6 | Irish consumer / IAP | LOW | NO | ✅ Accepted |
| C-A | IMY lead / DPC concerned | LOW | NO | ✅ Accepted |
| C-B | Art. 27 representative N/A | LOW | NO | ✅ Accepted |

Full rationale: [`LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md`](./LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md)

---

## A3 / A4 verification summary (2026-08-20)

**Evidence source:** VPS SSH read-only probe (`deploy@188.66.60.93`), `GET /health`, ipinfo.io AS206170, vendor official documentation (links in registers).

| Check | Result |
|-------|--------|
| Prod database | **Self-hosted PostgreSQL** on `localhost:5432` — **Stockholm, SE** — **not Neon** |
| VPS hosting | **Inleed / Yelles AB** (AS206170), Stockholm, Sweden (EU/EEA) |
| Cloudflare R2 | **Active:** `UPLOAD_STORAGE=r2`, `R2_JURISDICTION=eu` |
| Resend | **Active** (`RESEND_API_KEY`, `EMAIL_ENABLED=true`) |
| RevenueCat | **Inactive** (no `REVENUECAT_API_KEY`; `iap_webhook_ready: false`) |
| Google Sign-In | **Active** (`GOOGLE_WEB_CLIENT_ID`) |
| Apple APNs / Sign in | **Active** (`APNS_*`, `APPLE_CLIENT_ID`) |
| FCM | **Inactive** (no `FCM_SERVER_KEY`) |
| GA4 / Meta / Google Ads | **Consent-gated** in client code (default deny) |
| Facebook cross-post | **Inactive** (no `FACEBOOK_PAGE_*`) |

**Human portal check required:** **None** — Neon not used in prod; all active processors documented from vendor public terms.

---

## Active processor matrix (prod VPS)

| Processor | Active | Location | GDPR role | Transfer mechanism |
|-----------|--------|----------|-----------|-------------------|
| Self-hosted PostgreSQL (VPS) | ✅ | Stockholm SE (EEA) | Controller-hosted | N/A — EEA storage |
| Inleed / Yelles AB (VPS) | ✅ | Stockholm SE (EEA) | Infrastructure sub-processor | EEA hosting |
| Cloudflare R2 | ✅ | EU jurisdiction bucket | Processor (Art. 28) | EU storage — no third-country transfer for stored objects |
| Resend | ✅ | US (processor HQ) | Processor | DPA + EU SCCs |
| Apple (Sign in + APNs) | ✅ | Global (incl. US) | Platform / push processor | Apple SCCs (Privacy Policy) |
| Google Sign-In | ✅ | US / global | OAuth processor | Google API Terms + DPF/SCCs |
| Google GA4 | ⚡ consent | US | Processor when enabled | Google DPT + SCCs; opt-in only |
| Google Ads | ⚡ consent | US | Processor when enabled | Google DPT + SCCs; opt-in only |
| Meta Pixel | ⚡ consent | US | Processor when enabled | Meta DPA + EU transfer addendum |
| RevenueCat | ❌ | — | — | Pre-documented for enablement; not active on prod |
| Neon | ❌ | — | — | Not prod architecture |
| Google FCM | ❌ | — | — | Not configured on prod |

---

## Copy fixes completed (this PR)

| Item | Fix |
|------|-----|
| EEA hosting claim | Verified — EU/EEA VPS + local PostgreSQL; R2 EU jurisdiction |
| `analytics_events` | Pseudonymised / family-linked — not “anonymised” |
| IMY/DPC model | Documented as internal decision (not counsel queue) |
| SE `/privacy` cookies | Aligned with consent-gated GA4/Meta/Ads |
| SE `/privacy` hosting | Softened EU/EES claim (same PR) |
| Counsel mandatory wording | Removed from Track 1 model |
| A2 Art. 9 guardrails | Contract not claimed for health data; Ireland V1 non-health positioning |
| A3/A4 ops verification | Processor + transfer registers v0.2; EEA privacy processors synced |

---

## Known remaining gaps (non-blocking)

| Gap | Risk | Action |
|-----|------|--------|
| RevenueCat server integration inactive | LOW (pre-launch commercial) | Enable `REVENUECAT_API_KEY` + webhook on commercial track |
| DPA PDFs not stored in repo | LOW | Optional: archive signed/vendor PDFs internally |
| Swedish privacy — wellbeing fields | LOW | Optional future SE policy update |
| Penetration test | LOW | Separate security track |
| DPO formal appointment | LOW | Accepted N/A at current scale |

---

## Public document status

| URL | Version | Internal sign-off | External legal |
|-----|---------|-------------------|----------------|
| `/en/eea/privacy` | 0.1 | ✅ Prod-verified processors | Not claimed |
| `/en/eea/terms` | 0.1 | ✅ IAP section aligned | Not claimed |
| `/en/eea/child-privacy` | 0.1 | ✅ Parent-managed model | Not claimed |
| `/en/tracking-choices` | 0.1 | ✅ Consent model accurate | Not claimed |
| `/privacy` (SE) | legacy | ✅ Cookies + hosting fixed | Not claimed |
| `/en/privacy` | legacy | ✅ Cookies + hosting fixed | Not claimed |

---

## Recommended next steps

1. **Product PR:** Flip `resolveLegalRoutes()` `placeholder` → `live` (A3/A4 now closed).
2. **Commercial track:** Enable RevenueCat API + confirm IE paywall strings match Terms §7.
3. **RC + launch control:** Physical device pass; then `market_ie_open ON` as last gate.

**Do not** engage external counsel unless a HIGH-risk item opens or regulator contact occurs.

---

## Sign-off

| Role | Name | Date | Record |
|------|------|------|--------|
| Controller representative | Papa Bravo AB (founder) | 2026-08-20 | **Approved** — internal compliance sign-off; documented residual risks accepted. Verified A2 on `4f5859d2`. |
| Engineering (code baseline) | Track 1 agent pass | 2026-08-20 | A3/A4 closed on VPS verification + vendor docs |

### Founder acceptance statement

> Ja — jag godkänner Track 1:s interna compliance sign-off och accepterar de dokumenterade residualriskerna. A3 och A4 ska vara stängda innan `resolveLegalRoutes()` sätts till live. `market_ie_open` ska fortsatt vara OFF tills Commercial/Store, Ireland RC och Launch Control är godkända. Detta är intern riskacceptans och inte ett påstående om extern juridisk verifiering.

This report does **not** constitute legal advice.
