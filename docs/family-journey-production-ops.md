# Family Journey — Prod Rollout

Rollout guide for Family Journey Fas 1–5 on the live VPS (see deploy rules in AGENTS.md).

## Prerequisites

- Migration `1808920000000_family_journey.js` (Fas 1) applied
- Migration `1808930000000_journey_fas2_5.js` (Fas 2–5) applied
- Deploy branch merged to `main` (GitHub Actions deploy)

## Feature flags (default OFF except noted)

| Flag | Default | Phase |
|------|---------|-------|
| `family_journey_context_api` | OFF | 1 |
| `family_journey_ingest_enabled` | OFF | 1 |
| `family_journey_evaluator_enabled` | OFF | 1 |
| `family_journey_onboarding_v1` | OFF | 1 |
| `family_journey_debug_api` | OFF | 1 |
| `family_journey_registry_v2` | OFF | 2 |
| `family_journey_handoff_v2` | OFF | 2 |
| `family_journey_parent_ack_v1` | OFF | 2 |
| `family_journey_coach_v1` | OFF | 3 |
| `family_journey_established_phase` | OFF | 3 |
| `family_journey_engine_shadow` | OFF | 3 |
| `activation_program_new_enrollments` | **ON** | 4 sunset |
| `activation_program_api_deprecated` | OFF | 4 |
| `activation_program_ui_removed` | OFF | 4 |
| `family_journey_expanding_phase` | OFF | 5 |
| `family_journey_independence_phase` | OFF | 5 |
| `family_journey_push_v1` | OFF | 5 |
| `family_journey_add_child_v1` | OFF | 5 |

## Recommended rollout order

### Wave 1 — Fas 1 (shadow)

1. Enable `family_journey_ingest_enabled`
2. Enable `family_journey_evaluator_enabled`
3. Enable `family_journey_context_api`
4. Verify `GET /api/me/journey-context` for test families
5. Enable `family_journey_debug_api` temporarily if needed

### Wave 2 — Fas 2 (parent ack + handoff)

1. `family_journey_registry_v2`
2. `family_journey_parent_ack_v1`
3. `family_journey_handoff_v2`
4. `family_journey_onboarding_v1` (onboarding CTA)

### Wave 3 — Fas 3 (coach + established)

1. `family_journey_established_phase`
2. `family_journey_coach_v1` (Engine coach yields)
3. `family_journey_engine_shadow` (compare logs)

### Wave 4 — Fas 4 (activation sunset)

1. `activation_program_new_enrollments` → **OFF**
2. `activation_program_ui_removed`
3. `activation_program_api_deprecated` (410 on program API)

### Wave 5 — Fas 5 (expanding + push)

1. `family_journey_expanding_phase`
2. `family_journey_add_child_v1`
3. `family_journey_independence_phase`
4. `family_journey_push_v1`

## Verification

```bash
# Health after deploy (on VPS)
curl -s http://127.0.0.1:3000/health

# Journey context (authenticated parent cookie required)
curl -s -b cookies.txt http://127.0.0.1:3000/api/me/journey-context

# Debug (dev/admin only)
curl -s -b cookies.txt http://127.0.0.1:3000/api/me/journey-debug
```

## Rollback

Disable flags in reverse order. Ingest/evaluator can stay ON — UI surfaces hide when context API is OFF (503).

For activation sunset rollback: re-enable `activation_program_new_enrollments` and disable `activation_program_api_deprecated`.

## Monitoring

- `[journey/ingest]` — milestone write errors
- `[journey-engine-shadow]` — Engine vs Journey divergence (Fas 3)
- `[journey-phase-eval]` — nightly established/independence milestones
- `[journey-push]` — push projection job

## Invariants

- `onboarding_completed` auth flag — **never** use for product logic
- `first_success` = derived from `child_first_completion` ∧ `parent_saw_completion`
- Inconsistent milestone state → `SETTING_UP`, `blocking_experience: null`
