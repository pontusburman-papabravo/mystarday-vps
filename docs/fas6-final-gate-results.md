# Fas 6 — final gate notes (PR #809)

## Tailwind determinism

- **Root cause:** `config/cache-version.json` has `stjarndag-v753` but committed `public/css/tailwind.build.css` header still said `stjarndag-v750`. `npm run css:build` rewrites only the header line (`750` → `753`, **2 bytes**). Not introduced by #809 product commits; present on `origin/main` at rebase base.
- **Fix:** `fix(build): align tailwind.build.css header with cache-version.json` — CSS only, no SW bump.
- **Note:** `css:build` may still touch `public/sw.js` locally (comment line); do not commit SW in #809.

## test:full exit code

- `scripts/run-full-npm-test.js` on main already exits **1** when TAP `fail > 0`.
- Prior report `exit code 0` with `fail=1` came from **shell pipeline** (`npm run test:full 2>&1 | tail -25`) — exit status of `tail`, not the runner.
- Correct verification: `NODE_ENV=test … npm run test:full; echo "TEST_FULL_EXIT=$?"` with **no pipe**.

## Constraint 23505 (follow-up)

Accepted handlers only:

| Constraint | Handler |
|------------|---------|
| `parent_email_lower_idx` | register → 409 |
| `idx_weekly_schedule_child_dow_variant` | onboarding schedule → idempotent recover |

Other `23505` errors propagate (not mapped to 409/200).

## Starter init model

See `docs/fas6-first-star-starter-decision.md` — child login primary; GET daily-log idempotent self-heal.
