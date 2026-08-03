# Activation First Success — Merge Gate (Prompt 1C)

## PR and HEAD

| Field | Value |
|-------|--------|
| PR | #845 |
| Branch | `cursor/activation-first-success-v1` |
| Pre-fix HEAD | `128f56c78b76ff509ae4db6a64ed1d43760fb9e4` |
| Base | `origin/main` @ `df733b1b` |

## Diff / scope review

28 files, ~1.5k lines — ADR-020, migration (`activation_first_success_v1` OFF), `GET /api/family/next-action`, hub + coach suppression, i18n, analytics, SW v767, tests + browser harness. **No** growth core, RC1, child offline queue, ADR-019, or store/legal changes.

## CI results (initial)

| Check | Run | Result |
|-------|-----|--------|
| CI test (push) | 30842403624 | SUCCESS |
| CI test (pull_request) | 30842418157 | FAILURE |
| E2E i18n | 30842418284 | SUCCESS |

**Failure:** `golden-path-fas6-concurrent-milestone.integration.test.js` — `deadlock detected` (40P01) on `truncate()` between loop iterations. **Classification:** TEST ISOLATION / transient DB deadlock (not activation logic). Same commit green on push run.

## CI fix (Prompt 1C)

- `test/helpers/setup.js`: retry `TRUNCATE` up to 4× on PostgreSQL deadlock `40P01` with short backoff.

## Local full gate (1B + 1C re-verify)

Run on branch before merge:

- `activation-first-success-canonical.test.js` — 60/60
- `npm run test:gate` — PASS
- `npm run test:e2e:i18n` — PASS
- `npm run lint:public` / `check:css` / `check:routes` — PASS
- `npm run test:child-core-harness` — PASS
- `npm run test:activation-first-success-browser` — sv-SE + en-GB PASS

## Browser golden path

Hybrid fixture + Puppeteer; evidence `docs/ACTIVATION-FIRST-SUCCESS-HARNESS-LAST.json`.

## Feature flag

- `activation_first_success_v1` default **OFF** (migration seed).
- Flag OFF: hub no-op, `next-action` returns `enabled: false`, legacy coaches unchanged.

## Milestones / i18n

- `first_success` derived via prod chain (`maybeDeriveFirstSuccess`); direct ingest rejected.
- `home.firstSuccess.*` sv-SE + en-GB; no empty en-GB values.

## SW / cache

`stjarndag-v767` aligned across `config/cache-version.json`, `public/sw.js`, CSS header.

## Manual QA (post-merge, not blocking merge)

- Founder allowlist physical smoke with flag ON
- Dark launch: `docs/ACTIVATION-FIRST-SUCCESS-DARK-LAUNCH.md`
- **No** prod flag enable in this train

## Merge decision

**MERGE READY** when obligatorisk CI is green on final pushed HEAD (including CI fix commit) and local gate re-confirmed.
