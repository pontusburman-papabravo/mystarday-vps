# Activation First Success — global launch checklist

**Current prod (preflight 2026-08-04):**

| Check | Result |
|-------|--------|
| `/health` | healthy |
| `git_sha` | `2c542358cc2512a4a1b98f65938db16985c73bc6` (pre-v771 deploy) |
| `cache_version` | `stjarndag-v770` |
| PR #858 child-first | on `main` |
| Global `activation_first_success_v1` | **OFF** |
| Growth flags | **OFF** |
| Physical child-first QA | **PASS** (do not re-open) |

## Before global ON

1. Merge PR with recoverable steps + schedule picker (v771).
2. Deploy → `DEPLOY_PASS` → `/health` SHA + `stjarndag-v771` + `/sw.js` match.
3. Prod smoke: schedule load, empty, error UI, retry, report, continue anyway, parent restore, child-first.
4. `feature:family-override --verify` + global flag verification.
5. Set `activation_first_success_v1` ON and rollout 100% per flag contract; keep kill switch.

## Rollback triggers (set global OFF)

- Redirect loops, double completion/stars, tenant spill, critical login failure, data integrity issues, spike in blocking schedule-load errors with no fallback usage.

## Post-launch watch

15 min / 2 h / 24 h: schedule load failures, skip rate, problem reports, child access, completion, first star, 4xx/5xx.

**Slutstatus efter denna PR:** code ready — **global flag remains OFF** until deploy + prod-smoke.
