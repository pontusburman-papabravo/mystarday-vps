# LEGAL_REVIEW_REQUIRED — External counsel queue

**Project:** P-IE-LAUNCH Track 1  
**Purpose:** Items that **cannot** be resolved from code review alone. Close or accept before `market_ie_open ON` and before flipping `resolveLegalRoutes()` to `live`.

---

## Priority A — Launch blockers

| ID | Topic | Question for counsel | References |
|----|-------|---------------------|------------|
| A1 | Lead supervisory authority | For Irish-resident users of a Swedish controller, is DPC lead, IMY lead, or one-stop-shop applicable? | IE overlay, public privacy § complaints |
| A2 | Article 27 representative | Is an EU/EEA representative required for Papa Bravo AB selling to IE without establishment? | IE overlay |
| A3 | Child consent model | Is parent-only registration + child PIN sufficient under Irish law and DPC guidance? | Child data assessment |
| A4 | Age of digital consent | Minimum age / parental authority for IE | Child data assessment |
| A5 | Processor DPAs & regions | Confirm Neon prod region, VPS location, signed DPAs (Resend, Cloudflare, RevenueCat, Google, Meta, Apple) | Processor register |
| A6 | International transfers | SCCs / TIAs for US processors (Resend, RevenueCat, GA4, Meta, Google Ads) | Transfer register |
| A7 | Public document sign-off | Approve `/en/eea/*` and tracking notice text for publication | Public HTML drafts |
| A8 | Irish consumer / digital content | Subscription terms, withdrawal, App Store/Play as merchant of record | Terms overlay, commercial track |

---

## Priority B — High risk / should resolve pre-launch

| ID | Topic | Question for counsel | References |
|----|-------|---------------------|------------|
| B1 | Pedagog notes sensitivity | Do optional mood/sleep/behaviour fields require additional basis, DPIA, or restrictions for IE? | DPIA, lawful basis #13 |
| B2 | Product analytics LI | Legitimate interest balancing test for `analytics_events` (family UUID) | Lawful basis #9 |
| B3 | Win-back emails | Marketing or service email? Lawful basis and opt-out | Lawful basis #11 |
| B4 | Retention exceptions | Lawful retention period for `contact_message`, `admin_audit_log` post-erasure | Retention schedule |
| B5 | Professional share links | Controller vs processor role when parent shares link internationally | Transfer register P-09 |
| B6 | DPO appointment | Is DPO mandatory for this processing scale? | RoPA header |
| B7 | Breach playbooks | Confirm 72h DPC notification thresholds and templates | Breach runbook |

---

## Priority C — Operational / polish

| ID | Topic | Question for counsel | References |
|----|-------|---------------------|------------|
| C1 | DSAR SLA & identity verification | Standard verification for non-logged-in requests | DSAR runbook |
| C2 | DSAR internal log | Format for Article 30-compatible request log | DSAR runbook |
| C3 | Marketing to families with children | Restrictions on ad copy targeting NPF/routines | Marketing assessment |
| C4 | Child page script audit | Confirm no marketing pixels on child dashboard routes | Marketing assessment |
| C5 | RevenueCat data deletion | Obligations after account delete | Account deletion runbook |
| C6 | Swedish `/privacy` drift | Separate project: align SE policy with cookie reality | README gaps table |
| C7 | Gamification / vulnerable children | ICO-style assessment of celebrations/nudges | Child data assessment §6 |

---

## Resolution log

| ID | Status | Counsel note | Date |
|----|--------|--------------|------|
| A1 | Open | | |
| … | | | |

_Update this table as items close._

---

## How to use

1. Send counsel: this file + [`implementation-baseline.md`](./implementation-baseline.md) + public HTML drafts.
2. Closed items: update public docs and remove inline `LEGAL_REVIEW_REQUIRED` markers in a follow-up PR (product change: flip legal routing status only after sign-off).
3. Do **not** enable `market_ie_open` while Priority A items remain Open.
