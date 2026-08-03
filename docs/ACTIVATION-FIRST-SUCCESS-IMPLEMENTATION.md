# Activation & First Success v1 — Implementation

**Branch:** `cursor/activation-first-success-v1`  
**Baseline:** `origin/main` @ `df733b1b` (post #844)  
**ADR:** [ADR-020-CANONICAL-FIRST-SUCCESS-COACH.md](./adr/ADR-020-CANONICAL-FIRST-SUCCESS-COACH.md)  
**Flag:** `activation_first_success_v1` (default OFF)

## 1. Executive summary

Prompt 1A delivers a **Journey-authoritative** Day-0 path and a **single primary Hem coach** behind `activation_first_success_v1`. Product Engine remains a compatibility adapter; readiness stays exception-only. Child Core (#840), English RC (#842), and Growth dark-state (#841) are preserved. No prod flag enablement in this deliverable.

## 2. Before / after flow

| Stage | Before (flag OFF) | After (flag ON) |
|-------|-------------------|-----------------|
| Hem coach | Engine + Journey may both render | One `#activationFirstSuccessCoachMount` |
| Onboarding | ACT-1 / slim flags separately | Day-0 via v1 flag (starter plan slim path) |
| Next step API | `/first-success` + `/journey-context` | `GET /api/family/next-action` (canonical) |
| Activated family | Engine/Journey as today | No First Success coach (`already_first_success`) |

## 3. Day-0 onboarding

Required decisions before first activity: **child**, **starter schedule**, **child access**. Deferred: co-parent, advanced rewards, full personalization (unchanged features, not in Day-0 path).

`onboarding-starter-plan.js` treats `activation_first_success_v1` like slim signup for resume and entry.

## 4. Starter schedule

Reuses **ACT-1 / `onboarding-starter-plan.js`** and server `schema_saved_at` via `activation-p0` (no duplicate scheduler).

## 5. Child access

Coach step `child_access` → `DashboardChildHandoff.startChildLogin()` / child-login flow. `child_access_completed_at` unchanged (child-login route). PIN hint copy in i18n; **no ADR-019**.

## 6. Guided first completion

Child path unchanged (#840 substeps, offline queue, session resume). First star via normal completion chain — no demo star.

## 7. Journey authority

- Phase: `context-builder.js` + `evaluator.js` + `family_milestones`
- Comms gate: `communication-gate.js` (retention; not duplicated on Hem)
- Canonical builder: `src/lib/activation/canonical-next-action.js`

## 8. Next-action contract

`GET /api/family/next-action` returns:

`enabled`, `show_primary_coach`, `next_action`, `reason[]`, `journey_phase`, `blocking_issue`, `cta_label`, `cta_target`, `headline`, `body`, `funnel_step`, `authority`.

Priority: milestone ladder → Journey experience → Engine adapter → none.

## 9. Milestones / timestamps

| Event | Source of truth | Field / table |
|-------|-----------------|---------------|
| family_created | `family.created_at` | family |
| child_created | `activation-p0` | `family_activation_state.child_created_at` |
| first_schedule_saved | `activation-p0` | `schema_saved_at` |
| child_access_completed | child-login | `child_access_completed_at` |
| first_activity_completed | `activation-first-completion` | `first_completion_at` + milestones |
| first_star_earned | daily-logs completion payload | client event + server completion |
| first_success | Journey ingest | `family_milestones.first_success` |

Idempotency: existing `ONCE_MILESTONES` / activation-p0 “only if null” writes.

## 10. Feature flag

Migration `1810150000000_activation_first_success_v1_flag.js`. Server enforcement via `isActivationFlagEnabled`. Client reads `activation-config` + `/next-action`.

## 11. Analytics

Allowlist: `activation_first_success_next_action_shown`, `activation_first_success_cta_clicked`. No PII in properties. Funnel timing uses server timestamps for authoritative metrics.

## 12. Accessibility

Single primary CTA (min 44px), `aria-label` on coach region, PIN hint as text (not color-only). Reuses #840 PIN contrast on child surfaces.

## 13. i18n

`home.firstSuccess.*` in `config/i18n/home-sv-SE.json` and `home-en-GB.json`. Server `t()` for API copy.

## 14. Performance sanity

One optional `/api/family/next-action` per Hem refresh (45s client cache). No extra bundle for flag OFF (script loaded on dashboard only; hub no-ops when disabled). No duplicate Journey polling added.

## 15. Test results (Prompt 1B gate)

| Command | Result |
|---------|--------|
| `test/activation-first-success-canonical.test.js` | 60/60 PASS |
| `npm run test:gate` | 1906 + 418 PASS |
| `npm run audit:i18n:strict` | PASS |
| `npm run check:css` / `check:routes` / `lint:public` | PASS |
| `npm run test:e2e:i18n` | 23 PASS |
| `npm run test:child-core-harness` | PASS |
| `npm run test:activation-first-success-browser` | sv-SE + en-GB PASS — see `ACTIVATION-FIRST-SUCCESS-HARNESS-LAST.json` |

**first_success test root cause:** `WRONG TEST ASSUMPTION` — runtime derives `first_success` via `child_first_completion` + `parent_saw_completion` and `maybeDeriveFirstSuccess`; direct `ingestMilestone('first_success')` is rejected in `ingest.js`.

## 16. Dark launch

See [ACTIVATION-FIRST-SUCCESS-DARK-LAUNCH.md](./ACTIVATION-FIRST-SUCCESS-DARK-LAUNCH.md).

## 17. Remaining blockers

- Physical device QA on QA allowlist before Fas 1 dark launch
- Product copy review on en-GB edge strings (non-blocking)

## 18. Merge decision

**CONDITIONAL MERGE** — automated gates green, flag default OFF; enable QA allowlist after deploy and physical smoke.
