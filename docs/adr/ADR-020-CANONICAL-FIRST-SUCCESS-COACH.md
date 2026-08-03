# ADR-020 — Canonical First Success Coach (Journey Authority)

**Status:** Accepted (Prompt 1A)  
**Date:** 2026-08-03  
**Supersedes:** Informal “Engine as SoT” comments in `first-success.js` (compatibility only)

## Context

Hem currently combines **readiness exceptions**, **Product Engine** (`GET /api/family/first-success`), and **Journey Context** (`GET /api/me/journey-context`) with client-side conflict logging. POS PA-01 requires **one** primary coach for “what’s next.” Post-merge baseline (#844) marked **PROMPT 1 READY** to consolidate activation without a fourth parallel brain.

## Decision

1. **Journey Context + communication gate** are the **canonical source of truth** for recommended next step and comms during activation and retention.
2. **Product Engine** remains a **compatibility adapter** — may translate or forward during migration; must not render a competing primary coach when `activation_first_success_v1` is ON.
3. **Readiness** (`GET /api/family/readiness`) stays **diagnostics and operational exceptions** (PIN, approvals, invites) — not a product coach.
4. **`GET /api/family/next-action`** exposes the canonical contract when `activation_first_success_v1` is enabled:

   `next_action`, `reason`, `journey_phase`, `blocking_issue`, `cta_label`, `cta_target` (+ headline/body for UI).

5. **Priority ladder** (server + client):

   1. Critical readiness exceptions (existing readiness slot — unchanged)
   2. Incomplete first-success milestone chain (`family_activation_state` + `family_milestones`)
   3. Journey evaluator experience / blocking experience
   4. Product Engine adapter (fallback only)
   5. No primary coach

6. **Growth** (`growth_feedback_v1`, referral CTA, etc.) **must not** become the primary onboarding coach; growth continues to read `family_activation_state` + milestones (unchanged in #841).

7. **ADR-019** (trusted device / no-PIN) is **not** implemented in this ADR.

## Feature flag

- Key: `activation_first_success_v1`
- Default: **OFF** (migration `1810150000000`)
- Enforcement: **server-side** (`isActivationFlagEnabled`); clients cannot self-enable.

## Migration strategy

| Phase | Behavior |
|-------|----------|
| Flag OFF | Legacy Engine + Journey + readiness unchanged |
| Flag ON (QA allowlist) | Single `#activationFirstSuccessCoachMount`; Engine/Journey primary coaches suppressed |
| Flag ON (gradual) | Same; monitor funnel metrics |
| Post first_success | Coach hidden; Journey first-week / retention paths unchanged |

## Rollback

1. Set `activation_first_success_v1` OFF in `feature_flag` (or per-family disable if extended).
2. Deploy — no data migration required; timestamps in `family_activation_state` remain valid.
3. Clients revert to Engine/Journey arbitration automatically.

## API compatibility

- `GET /api/family/first-success` — **unchanged**; still used when flag OFF or as adapter input.
- `GET /api/me/journey-context` — **unchanged**; consumed by canonical builder.
- `GET /api/family/readiness` — **unchanged**.
- `GET /api/family/activation-config` — adds `activation_first_success_v1` boolean.

## Consumers

| Consumer | Change |
|----------|--------|
| `activation-first-success-hub.js` | New primary UI |
| `engine-coach.js` / `journey-coach.js` | Defer when hub active |
| `growth-feedback-eligibility.js` | No change (reads same activation state) |
| Onboarding (`onboarding-starter-plan.js`) | Day-0 path when v1 flag ON |

## Consequences

- Positive: One Hem coach during Day-0; Journey-aligned milestones; safe dark launch.
- Negative: Temporary dual code paths until flag is default ON and Engine UI is retired.
- Testing: Unit + browser harness required before prod flag enable.
