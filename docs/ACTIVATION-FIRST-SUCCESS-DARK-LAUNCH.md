# Activation First Success v1 — Dark Launch Plan

**Flag:** `activation_first_success_v1`  
**Default:** OFF (all environments after migrate)

## Fas 0 — Merged, flag OFF

| | |
|--|--|
| Audience | All families |
| Preconditions | Code on `main`, migration applied |
| Metrics | No change vs baseline |
| Stop | N/A |
| Rollback | N/A |
| Owner | Engineering |

## Fas 1 — Founder QA family only

| | |
|--|--|
| Audience | `FOUNDER_QA_*` household only |
| Preconditions | Fas 0 deploy; manual `UPDATE feature_flag SET enabled = true` **or** family allowlist hook if added later |
| Metrics | Funnel: signup → child → schema → child access → completion → first_success; console errors; `next-action` authority |
| Stop | Child login regression, duplicate milestones, coach conflicts |
| Rollback | Flag OFF |
| Owner | Founder + agent QA |

## Fas 2 — Small allowlist (new families)

| | |
|--|--|
| Audience | New registrations after `ACTIVATION_ONBOARDING_LAUNCH_AT` + allowlist |
| Preconditions | Fas 1 green 48h |
| Metrics | Step conversion vs control; time-to-first-star |
| Stop | &lt; baseline child completion rate |
| Rollback | Flag OFF |
| Owner | Product + Engineering |

## Fas 3 — Limited % new registrations

| | |
|--|--|
| Audience | e.g. 10% new families (cohort by family id hash) |
| Preconditions | Fas 2 metrics stable |
| Metrics | sv-SE vs en-GB; email vs OAuth |
| Stop | Support tickets / PIN confusion spike |
| Rollback | Flag OFF |
| Owner | Product |

## Fas 4 — Broader rollout

| | |
|--|--|
| Audience | All new families → then existing non-activated |
| Preconditions | Fas 3 success; Engine primary coach retired for activation cohort |
| Metrics | P0 48h rate, retention week 1 |
| Stop | POS coach conflicts |
| Rollback | Flag OFF; Engine/Journey legacy path |
| Owner | Executive + Product |

**This PR does not enable any phase beyond Fas 0.**
