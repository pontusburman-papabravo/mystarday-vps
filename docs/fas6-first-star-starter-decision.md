# Fas 6 — Empty-day first star (product decision, implemented)

**PR:** #809 · **Branch:** `cursor/golden-path-first-star`

## Decision

When First Star Mode is on, the child has **zero lifetime completions**, has completed a **real child login**, and today's canonical daily log has **no activities** (empty weekend, no schema, or weekday without rows for today), the server ensures **exactly one temporary starter** for the current local day in `Europe/Stockholm`.

We do **not**:

- add permanent weekend rows to forskola/skola templates,
- use Morgonhuset, gameplay, or child worlds,
- inject starters via a broad read-only GET without idempotent guards.

## Starter activity rules

| Property | Value |
|----------|--------|
| Model | Canonical `daily_log` + `daily_log_item` |
| `starter_kind` | `first_star` (partial unique index: one per log) |
| `is_once_task` | `true` |
| Stars | `1` |
| Completion | Same `PUT /api/me/daily-log-items/:id/complete` as normal items |
| Milestone | Same atomic `first_completion_at` + `child_first_completion` journey ingest |
| Idempotency | Login retry, refresh, parallel sessions → one row per child-day |

Stop condition: **any** lifetime completion (`completed = true` on any log item) — no new starters on later empty days.

## Implementation

- `src/lib/first-star-starter.js` — `ensureFirstStarStarterActivity`
- After successful child login (`child-login.js`) and before first empty today view (`child-self.js` GET daily-log)
- Migration `1810100000000_first_star_starter_kind.js`

## i18n

- `child.firstStarStarter.name` — sv-SE: «Min första stjärna», en-GB: «My first star»

## Tests

- `golden-path-fas6-weekend-first-star.integration.test.js`
- `golden-path-fas6-starter-race.integration.test.js` (20× concurrent ensure)
- `golden-path-fas6-starter-isolation.integration.test.js` (tenant, siblings, post-completion, Stockholm date)

See also `docs/fas6-weekend-first-star-findings.md` for pre-implementation analysis.
