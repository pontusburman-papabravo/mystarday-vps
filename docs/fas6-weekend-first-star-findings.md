# Fas 6 — Weekend / first star (P1) findings

**Status:** Implemented in PR #809 — see `docs/fas6-first-star-starter-decision.md`.

## Verified in code

| Mechanism | Behavior |
|-----------|----------|
| `POST /api/onboarding/schedule` with `forskola` / `skola` | Seeds `weekly_schedule` for Mon–Fri only (`SCHOOL_GROUPS` in `src/routes/onboarding.js`). |
| `POST /api/onboarding/weekend-schedule` | Optional Helg on Sat+Sun — not auto-applied for school/preschool path. |
| `GET /api/me/daily-log` | Built from today's DOW + `syncDailyLogWithSchedule`. No rows → empty `items`. |
| First Star Mode (`activation_first_star_mode_v1`) | `applyFirstStarModeFilter` in `src/lib/first-star-mode.js` filters to first unchecked item; if list is empty, returns **empty array** — **no starter activity injection**. |
| Onboarding starter plan | Template selection / ACT-1 APIs — does not auto-create a one-off completable item on empty days. |

## Test coverage (`golden-path-fas6-weekend-first-star.integration.test.js`)

1. **Weekday** — forskola onboarding when today is Mon–Fri → at least one item (skips on weekend CI).
2. **Saturday/Sunday live** — forskola onboarding when today is weekend → empty Idag (skips on weekday CI).
3. **Child without schema** — empty daily log.
4. **Weekday schedule but empty today** — delete non-Monday rows + sync Saturday.
5. **First Star Mode ON + empty today** — `first_star_mode: true` but still zero items on weekend.

## Product alternatives (for separate decision)

**Option A — Empty-day starter activity (minimal)**  
When `lifetimeCompletions === 0` and today's generated log has zero items, insert a single family-scoped **temporary** `daily_log_item` (or one-off template) tied to the child, completable once via canonical `PUT …/complete`, not added to `weekly_schedule`. Cleared after first completion or next schedule sync.

**Option B — Onboarding CTA / template default**  
Keep weekday-only school templates but change onboarding copy + default template recommendation on weekend signup to `helg` or prompt `weekend-schedule` opt-in before handoff (no automatic permanent helg schema without parent consent).

## Fas 8 note

Offline queue / replay for empty-day retries is **out of scope** for Fas 6 (documented only).
