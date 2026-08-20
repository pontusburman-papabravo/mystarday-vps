# LEGAL_REVIEW_REQUIRED — External counsel queue

**Project:** P-IE-LAUNCH Track 1  
**Purpose:** Items that **cannot** be resolved from code review alone. Close or accept before `market_ie_open ON` and before flipping `resolveLegalRoutes()` to `live`.

---

## Priority A — Launch blockers (counsel questions)

| ID | Topic | Question for counsel | References |
|----|-------|---------------------|------------|
| A1 | Child processing / Article 8 | Which My Starday child-processing activities, if any, rely on consent such that Article 8 and Ireland’s age-16 threshold applies? How does that interact with our parent-managed model (parent registers, child PIN login)? | Child data assessment, IE overlay §4 |
| A2 | Special-category risk | Do optional mood/sleep/behaviour fields and free-text observations (`pedagog_notes`, `child_observation`) trigger Article 9 processing? What additional basis, restrictions, or DPIA steps are required for Ireland? | DPIA, lawful basis #13 |
| A3 | Processor contracts + hosting regions | Confirm signed DPAs and **actual** hosting/processing regions for Neon, VPS, Resend, Cloudflare, RevenueCat, Google, Meta, and Apple. | Processor register |
| A4 | International transfers | Confirm transfer mechanisms (DPF, SCCs, TIAs) and any required supplementary measures for US and other third-country processors. | Transfer register |
| A5 | Public document sign-off | Approve `/en/eea/*` and `/en/tracking-choices` text for publication. | Public HTML drafts |
| A6 | Irish consumer / subscription law | Confirm IAP, renewal, trial, cancellation, and digital content/service rules for Ireland (Apple App Store / Google Play via RevenueCat). | Terms overlay, commercial track |

---

## Short confirmations (expected N/A or narrow confirm — not open-ended blockers)

| ID | Topic | Question for counsel | Expected answer |
|----|-------|---------------------|-----------------|
| C-A | Main establishment / lead SA | Please confirm that Papa Bravo AB’s Swedish establishment constitutes the main establishment and that IMY is the lead supervisory authority for cross-border processing, with DPC as concerned supervisory authority for Irish users. | IMY lead · DPC concerned |
| C-B | Article 27 representative | Confirm that Article 27 EU representative is **not required** because Papa Bravo AB is established in the EU (Sweden) as controller. | N/A |

---

## Priority B — High risk / should resolve pre-launch

| ID | Topic | Question for counsel | References |
|----|-------|---------------------|------------|
| B1 | Product analytics LI | Legitimate interest balancing test for `analytics_events` (family-linked pseudonymised analytics) | Lawful basis #9 |
| B2 | Win-back emails | Marketing or service email? Lawful basis and opt-out | Lawful basis #11 |
| B3 | Retention exceptions | Lawful retention period for `contact_message`, `admin_audit_log` post-erasure | Retention schedule |
| B4 | Professional share links | Controller vs processor role when parent shares link internationally | Transfer register P-09 |
| B5 | DPO appointment | Is DPO mandatory for this processing scale? | RoPA header |
| B6 | Breach playbooks | Confirm 72h DPC notification thresholds and templates | Breach runbook |

---

## Priority C — Operational / polish

| ID | Topic | Question for counsel | References |
|----|-------|---------------------|------------|
| C1 | DSAR SLA & identity verification | Standard verification for non-logged-in requests | DSAR runbook |
| C2 | DSAR internal log | Format for Article 30-compatible request log | DSAR runbook |
| C3 | Marketing to families with children | Restrictions on ad copy targeting NPF/routines | Marketing assessment |
| C4 | Child page script audit | Confirm no marketing pixels on child dashboard routes | Marketing assessment |
| C5 | RevenueCat data deletion | Obligations after account delete | Account deletion runbook |
| C6 | Gamification / vulnerable children | ICO-style assessment of celebrations/nudges | Child data assessment §6 |

---

## Resolution log

| ID | Status | Counsel note | Date |
|----|--------|--------------|------|
| A1 | Open | | |
| A2 | Open | | |
| A3 | Open | | |
| A4 | Open | | |
| A5 | Open | | |
| A6 | Open | | |
| C-A | Open | | |
| C-B | Open | | |
| … | | | |

_Update this table as items close._

---

## How to use

1. Send counsel: this file + [`implementation-baseline.md`](./implementation-baseline.md) + public HTML drafts.
2. Closed items: update public docs and remove inline `LEGAL_REVIEW_REQUIRED` markers in a follow-up PR (product change: flip legal routing status only after sign-off).
3. Do **not** enable `market_ie_open` while Priority A items remain Open.
