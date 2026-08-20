# Track 1 — Internal Legal Self-Signoff Report

**Date:** 20 August 2026  
**Branch:** `cursor/p-ie-launch-legal-6b85` · PR #1051  
**Model:** Internal compliance sign-off — **not externally legally verified**

---

## Executive summary

Track 1 is **substantially launch-usable** under internal risk acceptance. Seven of nine priority decisions are **accepted** with documented interpretation and product alignment. **Two operational blockers remain open** (processor/hosting verification and transfer mechanism documentation) before we flip `resolveLegalRoutes()` to `live`.

We do **not** claim legal approval. Public documents carry honest v0.1 disclaimers.

**`market_ie_open`** — still OFF (store + RC + launch control independent).  
**`resolveLegalRoutes()`** — still `placeholder` (flip in separate PR after A3/A4 close).

---

## Sign-off checklist

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | No HIGH unresolved risks | ✅ | Highest open = MEDIUM (A3, A4, A1, A2) |
| 2 | Public statements match implementation | ✅ | EEA docs code-derived; SE cookies + hosting softened this PR |
| 3 | Processor/hosting/transfer facts verified | ⏳ **Open** | LDRA-A3, A4 — ops task before `live` |
| 4 | Child lawful bases documented | ✅ | [`lawful-basis-register.md`](./internal/lawful-basis-register.md) |
| 5 | Irish IAP disclosures match flow | ✅ | EEA Terms §7; RevenueCat/native only |

**Overall:** **Conditional pass** — ready for counsel-free path after A3/A4 ops verification.

---

## Decision summary

| ID | Topic | Residual risk | Launch blocker | Status |
|----|-------|---------------|----------------|--------|
| A1 | Child processing / Art. 8 | MEDIUM | NO | ✅ Accepted |
| A2 | Special-category wellbeing | MEDIUM | NO | ✅ Accepted |
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

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Controller representative | _Pending founder sign-off_ | | |
| Engineering (code baseline) | Track 1 agent pass | 2026-08-20 | Code-derived docs complete |

This report does **not** constitute legal advice.
