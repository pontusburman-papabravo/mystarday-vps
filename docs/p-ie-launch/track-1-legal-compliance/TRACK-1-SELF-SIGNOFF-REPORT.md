# Track 1 — Internal Legal Self-Signoff Report

**Date:** 20 August 2026  
**Branch:** `cursor/p-ie-launch-legal-6b85` · PR #1051  
**Model:** Internal compliance sign-off — **not externally legally verified**

---

## Executive summary

Track 1 **interna compliance sign-off är godkänd** av controller (20 Aug 2026, verifierat mot `4f5859d2`). Dokumenterade residualrisker accepterade. **Två ops-blockers kvarstår** (LDRA-A3, A4) innan `resolveLegalRoutes()` → `live`.

We do **not** claim legal approval. Public documents carry honest v0.1 disclaimers.

**Founder sign-off:** ✅ **Approved** — internal risk acceptance only; not external legal verification.

**Gates efter sign-off:**

| Gate | Status |
|------|--------|
| `resolveLegalRoutes()` → `live` | Blocked until **A3 + A4 closed** (separate PR) |
| `market_ie_open ON` | Blocked until **Commercial/Store + Ireland RC + Launch Control** |

---

## Sign-off checklist

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | No HIGH unresolved risks | ✅ | Highest open = MEDIUM (A3, A4, A1, A2) |
| 2 | Public statements match implementation | ✅ | EEA docs code-derived; SE cookies + hosting softened this PR |
| 3 | Processor/hosting/transfer facts verified | ⏳ **Open** | LDRA-A3, A4 — ops task before `live` |
| 4 | Child lawful bases documented | ✅ | [`lawful-basis-register.md`](./internal/lawful-basis-register.md) + A2 Art. 9 guardrails |
| 5 | Irish IAP disclosures match flow | ✅ | EEA Terms §7; RevenueCat/native only |

**Overall:** ✅ **Founder sign-off complete** — Track 1 internally accepted. `live` flip requires A3/A4; `market_ie_open` requires commercial/RC/launch control.

---

## Decision summary

| ID | Topic | Residual risk | Launch blocker | Status |
|----|-------|---------------|----------------|--------|
| A1 | Child processing / Art. 8 | MEDIUM | NO | ✅ Accepted |
| A2 | Article 9 / wellbeing guardrails | MEDIUM | NO | ✅ Accepted (guardrails documented) |
| A3 | Processors + hosting regions | MEDIUM | **YES** | ⏳ Open |
| A4 | International transfers | MEDIUM | **YES** | ⏳ Open |
| A5 | Public document accuracy | LOW | NO | ✅ Accepted |
| A6 | Irish consumer / IAP | LOW | NO | ✅ Accepted |
| C-A | IMY lead / DPC concerned | LOW | NO | ✅ Accepted |
| C-B | Art. 27 representative N/A | LOW | NO | ✅ Accepted |

Full rationale: [`LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md`](./LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md)

---

## Copy fixes completed (this PR)

| Item | Fix |
|------|-----|
| EEA hosting claim | Softened — no “hosted within EU/EEA” until verified |
| `analytics_events` | Pseudonymised / family-linked — not “anonymised” |
| IMY/DPC model | Documented as internal decision (not counsel queue) |
| SE `/privacy` cookies | Aligned with consent-gated GA4/Meta/Ads |
| SE `/privacy` hosting | Softened EU/EES claim (same PR) |
| Counsel mandatory wording | Removed from Track 1 model |
| A2 Art. 9 guardrails | Contract not claimed for health data; Ireland V1 non-health positioning; enhanced free-text protection |

---

## Known remaining gaps (non-blocking or ops)

| Gap | Risk | Action |
|-----|------|--------|
| Neon prod region not filed | MEDIUM | Verify dashboard + update processor register |
| VPS exact location | MEDIUM | Confirm deploy host jurisdiction |
| DPA links not in repo | MEDIUM | Collect vendor DPAs to internal folder |
| Transfer mechanisms not filed | MEDIUM | Update transfer register per vendor |
| Swedish privacy — wellbeing fields | LOW | Optional future SE policy update |
| Penetration test | LOW | Separate security track |
| DPO formal appointment | LOW | Accepted N/A at current scale |

---

## Public document status

| URL | Version | Internal sign-off | External legal |
|-----|---------|-------------------|----------------|
| `/en/eea/privacy` | 0.1 | ✅ Code-aligned | Not claimed |
| `/en/eea/terms` | 0.1 | ✅ IAP section aligned | Not claimed |
| `/en/eea/child-privacy` | 0.1 | ✅ Parent-managed model | Not claimed |
| `/en/tracking-choices` | 0.1 | ✅ Consent model accurate | Not claimed |
| `/privacy` (SE) | legacy | ✅ Cookies + hosting fixed | Not claimed |
| `/en/privacy` | legacy | ✅ Cookies + hosting fixed | Not claimed |

---

## Recommended next steps (post-merge Track 1)

1. **Ops:** Close LDRA-A3 + A4 (verify Neon region, VPS, file DPAs + transfer mechanisms).
2. **Product PR:** Flip `resolveLegalRoutes()` `placeholder` → `live` after A3/A4 closed.
3. **Commercial track:** Confirm IE paywall strings match Terms §7.
4. **RC + launch control:** Physical device pass; then `market_ie_open ON` as last gate.

**Do not** engage external counsel unless a HIGH-risk item opens or regulator contact occurs.

---

## Sign-off

| Role | Name | Date | Record |
|------|------|------|--------|
| Controller representative | Papa Bravo AB (founder) | 2026-08-20 | **Approved** — internal compliance sign-off; documented residual risks accepted. Verified A2 on `4f5859d2`. |
| Engineering (code baseline) | Track 1 agent pass | 2026-08-20 | Code-derived docs complete |

### Founder acceptance statement

> Ja — jag godkänner Track 1:s interna compliance sign-off och accepterar de dokumenterade residualriskerna. A3 och A4 ska vara stängda innan `resolveLegalRoutes()` sätts till live. `market_ie_open` ska fortsatt vara OFF tills Commercial/Store, Ireland RC och Launch Control är godkända. Detta är intern riskacceptans och inte ett påstående om extern juridisk verifiering.

This report does **not** constitute legal advice.
