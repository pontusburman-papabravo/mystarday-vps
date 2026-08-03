# Growth Feedback Loop — Prod Dark Launch Plan

**Status:** Plan only — do **not** execute in the PR #841 review assignment.  
**Constraint:** this product has **no staging environment**. All verification is local/CI → prod with flags OFF → limited prod pilots.

Related: `docs/GROWTH-FEEDBACK-LOOP-IMPLEMENTATION.md`, `docs/GROWTH-FEEDBACK-PR841-REVIEW.md`, `docs/GROWTH-FEEDBACK-PR841-FINAL-MERGE-GATE.md`.

**Gate 2C (2026-08-03):** Fas 0 kräver merged #840/#842 på `main`, rebased #841 @ SW **v765**, grön `test:gate` + CI — se final merge gate doc.

---

## Flags (all default OFF after migrate)

| Key | Surface |
|-----|---------|
| `growth_feedback_v1` | Parent Hem feedback API + UI |
| `growth_referral_cta_v1` | Personal referral CTA (also needs `referral_program`) |
| `growth_stuck_cohorts_v1` | Admin stuck cohort preview |
| `growth_waitlist_funnel_v1` | Reserved ops UI |
| `referral_program` | Existing referral capture/qualify |

---

## Fas 0 — Kod i prod, alla flags OFF

**Goal:** Ship schema + code with zero customer-visible growth UI and zero new outreach.

| Item | Detail |
|------|--------|
| Flags | All growth flags OFF; `referral_program` remains OFF unless already intentionally on |
| Audience | Entire prod |
| Evidence before start | CI green on merged commit; migrate applied; `/health` OK |
| Verify | No `#growthFeedbackMount` content; no referral CTA; admin stuck API returns 503; no new mass email |
| Metrics | Error rate, p95 Hem, unexpected writes to `family_acquisition_attribution` only on new signups with UTM (acceptable) |
| Stop conditions | JS errors on Hem; migration failure; write spike unrelated to signup |
| Rollback | Flags already OFF; revert deploy / disable routes via flag; optional migration `down` only if unused |
| Owner | Release Manager + Backend |

**Attribution note:** Email/OAuth signup may still persist first-touch rows when clients send UTM — this is measurement, not UI. Confirm volume on founder QA signup only before broader interpretation.

---

## Fas 1 — Intern / read-only verifiering

| Item | Detail |
|------|--------|
| Flags | Optionally enable `growth_stuck_cohorts_v1` for **admin accounts only** (global flag — keep OFF for customers by not advertising; API is admin-only). Prefer leave OFF and use SQL preview against helpers in a maintenance window if global admin flag is too broad. |
| Audience | Founder / internal admin; founder QA family for attribution write check |
| Evidence | Fas 0 stable ≥1 deploy cycle; cohort SQL counts reviewed; QA family excluded from stuck list |
| Metrics | Cohort counts by blocking_step; attribution row for QA signup |
| Stop | Cohort includes obvious QA; preview endpoints callable without admin |
| Rollback | Set `growth_stuck_cohorts_v1` OFF |
| Owner | Admin ops + QA |
| Forbidden | Customer email/push; destructive QA on real families |

---

## Fas 2 — Begränsad feedbackpilot

| Item | Detail |
|------|--------|
| Flags | `growth_feedback_v1` ON for allowlisted families **or** low % if platform supports (otherwise short time-boxed global ON with stop conditions) |
| Audience | Families with proven value only (server-enforced); never first login |
| Evidence | Fas 1 OK; Hem screenshot on QA with flag ON; dismiss/submit paths verified |
| Metrics | `growth_feedback_shown` / `dismissed` / `submitted`; no prompt spam (unique per prompt) |
| Stop | Prompt during critical routine; child surface leakage; >1 shown/day per family; support tickets |
| Rollback | Flag OFF immediately |
| Owner | CPO + Frontend |

---

## Fas 3 — Referral CTA-pilot

| Item | Detail |
|------|--------|
| Flags | `referral_program` ON + `growth_referral_cta_v1` ON (pilot audience) |
| Audience | Proven-value families without blockers |
| Evidence | Self-referral blocked; invalid ref signup works; copy has **no reward promise** |
| Metrics | `referral_shown`, `copied`, `shared`, `signup`, abuse rate (same IP many refs) |
| Stop | Reward expectations in support; code guessing abuse; CTA during blockers |
| Rollback | Both flags OFF |
| Owner | Growth + Backend |
| Out of scope | Referral rewards / payouts |

---

## Fas 4 — Stuck cohort operationalisering

| Item | Detail |
|------|--------|
| Flags | `growth_stuck_cohorts_v1` ON |
| Audience | Admin preview only |
| Evidence | Single helper definition matches reviewed counts; QA excluded; `autoSendAllowed: false` |
| Metrics | Cohort sizes; time-to-review |
| Stop | Any path that sends without human approval |
| Rollback | Flag OFF |
| Owner | Ops + Journey |
| **Separate decision required** before any outreach email/push — **not** authorized by PR #841 |

---

## Recommended order

```
Merge (flags OFF)
  → Fas 0 prod observe
  → Fas 1 admin/QA read-only
  → Fas 2 feedback pilot
  → Fas 3 referral CTA pilot
  → Fas 4 stuck preview ops
  → (later ADR) outreach / rewards
```

## Explicit non-actions

- Do not “enable in staging”  
- Do not turn flags on as part of merge  
- Do not run mass sends from stuck preview  
- Do not promise referral rewards in UI or email  
