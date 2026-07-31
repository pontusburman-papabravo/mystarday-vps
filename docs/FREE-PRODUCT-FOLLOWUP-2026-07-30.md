# Free product follow-up — 2026-07-30 <!-- pragma: allowlist secret -->

Living report for post–PR #790 integrity work. **No merge/deploy** unless explicitly assigned.

Payment scope: **Deferred — payment rollout not active** (no IAP/RevenueCat/subscription/paywall changes).

QA account for agents: `docs/founder-qa-test-account.md` (founder parent / Astrid). <!-- pragma: allowlist secret -->

---

## Baseline (Fas 0)

| Item | Value |
|------|--------|
| Report start | 2026-07-30 |
| `origin/main` (preflight) | `e53f59e04ac9d8d28302d447aac73eefea6ffc24` |
| Known PR #790 merge | `ff5bb3e3` |
| Node | v20.20.2 |
| npm | 10.8.2 |
| Local branch note | Work branches off `origin/main`; agent QA rule branch `#794` not merged at preflight |

---

## Fas 1 — Produktionsverifiering (read-only)

**Status:** GO WITH FOLLOW-UP  
**Branch:** — (verification only)  
**Start SHA:** `e53f59e0`

### Deploy

| Check | Result |
|-------|--------|
| `GET` prod `/health` | `status: healthy`, `git_sha: e53f59e0…` | <!-- pragma: allowlist secret -->
| SHA vs `origin/main` | Matches deployed main commit |
| `/login` | HTTP 200 |
| Restart loops | Not observed in sampled journal window |

### Automated coverage (proxy for manual QA)

PR #790 behaviors covered by `test:gate` integration tests on main: child-login cross-family, rewards revoked/visibility/integrity, rate limits, safe-url-fetch, pin-warning revoked parent, ratings revoked parent.

### Log sample (VPS journal, post-deploy window)

- Repeated `[PUSH] register-native` DB constraint errors (`ON CONFLICT`) — **P2 follow-up**, not #790 regression.
- No SSRF/rate-limit spikes or reward transaction failures in sampled grep.

### Manual prod smoke (founder QA account)

Not executed in this agent run (browser). **Follow-up:** run checklist from integrity report on founder QA account.

### Fas 1 verdict

**GO WITH FOLLOW-UP** — health/deploy SHA aligned; integration tests green on main; manual founder-QA smoke + push-native constraint still open.

---

## Fas 2 — Schedules revoked-parent authz

**Status:** GO (PR ready, not merged)  
**Branch:** `cursor/schedules-revoked-parent-authz`  
**Start SHA:** `e53f59e0`

### Finding

- `POST /api/schedule-templates/:id/apply` used raw `parent_child` join **without** `revoked_at IS NULL` (bypass when `AUTHZ_HARDENING_ENABLED=false`).
- `fill-week` duplicated the same query; middleware covers hardened path but route must enforce via `getChildAccess` always.

### Changes

- `src/routes/schedules/templates.js` — `getChildAccess` for apply.
- `src/routes/schedules/fill-week.js` — `req.authzChild` or `getChildAccess`.
- `test/schedules-revoked-parent.integration.test.js` — HTTP + DB integration.
- `test/revoked-access-contract.test.js`, `test/ci-test-manifest.test.js`, `package.json` `test:gate:db`.

### Tests (local)

- `node --test test/schedules-revoked-parent.integration.test.js` — pass (after fix).
- Full `test:gate` — re-run before PR finalize.

### PR

- Link: _(create on push)_

### Risks

- Low; aligns with existing `authz.getChildAccess` / `parent-access.getActiveChildAccess`.

---

## Fas 3–8 (planned)

| Fas | Branch | Status |
|-----|--------|--------|
| 3 Opaque parent-session handoff | `cursor/opaque-parent-session-handoff` | Not started |
| 4 Full `npm test` cleanup | `cursor/full-test-suite-cleanup` | Not started |
| 5 Lint budget reduction | `cursor/lint-budget-reduction` | Not started |
| 6 Onboarding → first star | `cursor/onboarding-first-star-integrity` | Not started |
| 7 PWA/offline | `cursor/pwa-offline-integrity` | Not started |
| 8 Final verification | — | Not started |

---

## Summary table

| Fas | Branch | PR | Status | Risk | Tester |
|-----|--------|-----|--------|------|--------|
| 0 Baseline | — | — | Done | — | git/node preflight |
| 1 Prod verify | — | — | GO WITH FOLLOW-UP | Manual smoke pending | curl + VPS logs |
| 2 Schedules authz | `cursor/schedules-revoked-parent-authz` | pending | GO | Low | integration + gate |
| 3–8 | see above | — | Not started | — | — |
