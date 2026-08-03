# Activation First Success — Test Matrix

## Automated (CI / agent)

| Command | Scope |
|---------|--------|
| `npm run test:gate` | Includes `test/activation-first-success-canonical.test.js` |
| `npm run audit:i18n:strict` | home.firstSuccess keys |
| `npm run test:e2e:i18n` | Regression |
| `npm run test:child-core-harness` | #840 preserved |
| `npm run test:activation-first-success-browser` | sv-SE + en-GB coach + next-action API |

## Unit / integration

| Test file | Covers |
|-----------|--------|
| `activation-first-success-canonical.test.js` | Flag OFF/ON, milestone ladder, first_success hide, route mount, client defer |
| `first-success-journey-e2e.test.js` | Journey ingest (existing) |
| `child-access-semantics.test.js` | `child_access_completed_at` (existing) |
| `activation-growth-completion.test.js` | Growth reads activation state (existing) |

## Browser E2E (harness)

`scripts/activation-first-success-browser-harness.mjs`:

1. Enable `activation_first_success_v1` (restored OFF after)
2. Register sv-SE + en-GB parent
3. Assert `next-action` enabled → `create_child` → after child → `save_schedule`
4. Dashboard: single primary coach (`primaryCount: 1`)
5. Child login → child/today → real completion (UI or API) → first star
6. Parent dashboard: `next_action` → `none`, coach hidden after `first_success`

Evidence: `docs/ACTIVATION-FIRST-SUCCESS-HARNESS-LAST.json`.

## Negative scenarios (manual / follow-up)

Documented for QA: refresh mid-flow, OAuth signup, 409 replay, growth ON with v1 primary, existing activated family, multi-child, locale switch — covered by existing gate tests where applicable; full matrix in program Prompt 1A §15 for dedicated QA pass.

## SW / cache

Client static change → **stjarndag-v767**.
