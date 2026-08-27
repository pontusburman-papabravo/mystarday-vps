# Schedule domain — canonical command/query architecture (Phase 1A)

**Status:** implemented (Phase 1A). **Baseline:** `main` @ `80bc241a7fbf122ec7afa43d141d6598f83b75dd`.

This is the short architecture note required by the Phase 1A task brief (§34). It documents
the canonical command service, the canonical effective-schedule resolver, apply modes,
precedence, legacy adapters, and the deferred Phase 1B/2/Special Period boundary.

## Why

Before this phase, two independent code paths mutated a child's `weekly_schedule` from a
reusable source, with the same "does the day already have items?" logic duplicated verbatim:

- `src/routes/schedules/templates.js` `POST /:templateId/apply` (family template → child)
- `src/lib/canonical-library-copy.js` `copyCanonicalScheduleToFamily()` → `writeScheduleDays()`
  (standard schedule → child, called from `src/routes/standard-library.js`)

Both loops used the *same* skip/overwrite semantics and the *same* raw
`DELETE FROM weekly_schedule_item ... ; INSERT ...` pattern, but as separate implementations —
a future behavioural fix would have had to land twice. Read-side precedence (special day vs.
weekly, exclusions, custody) was similarly duplicated across three near-identical SQL blocks in
`src/lib/daily-log-generator.js` plus its own copy in `src/routes/schedules/items.js`.

## Canonical command service — `src/lib/schedule-apply.js`

**Source types** (`SOURCE_TYPES`): `family_template` | `standard_schedule`.
`activity_category` (used by legacy fill-week) is explicitly **not** a canonical source type
and must not become one (§13).

**Apply modes** (`APPLY_MODES`): `merge` (default) | `replace_sections` | `replace_day`.

**Primitives** (composable, no route/SQL/authz/broadcast mixed into one god-function):

- `resolveScheduleSource(client, { familyId, sourceType, sourceId, ... })` — resolves a source
  into a flat item list. For `standard_schedule` it calls
  `materializeStandardScheduleActivities()` (`src/lib/canonical-library-runtime.js` →
  `src/lib/canonical-library-copy.js`) — the **same** materializer `templates.js`'s
  "create template from standard" already used. No second materializer was introduced (§10).
- `applyScheduleItemsToDay(client, { childId, dayOfWeek, items, mode, custodyHomeId })` — the
  **only** place that writes `weekly_schedule_item` rows for a canonical command. Implements
  all three modes.
- `applyScheduleSourceToChild({ familyId, childId, sourceType, sourceId, days, mode,
  operationId, custodyContext })` — single-child command. One `BEGIN`/`COMMIT` transaction
  covers source resolution + every requested day (§5.6/§23): if any day fails, nothing for that
  child is written.
- `applyScheduleSourceToTargets({ targets, authorizeChild, ... })` — thin batch orchestrator.
  **Not exposed as a public route in Phase 1A.** Preflight authorizes every target before the
  first write, so one unauthorized child blocks the whole batch (§6). Each child is still its
  own DB transaction (the pool is `max: 5` — see `src/lib/db.js` — holding N open transactions
  for one HTTP request is unsafe at that pool size), so a promise of **cross-child** atomicity
  would be misleading; this function is documented, tested, and kept internal until Phase 1B
  decides how (or whether) to expose true multi-child atomicity.

### Duplicate-identity rule (§5.2)

`activity_template_id + section + start_time + end_time`. Plain `activity_template_id + section`
was rejected because `weekly_schedule_item` has no DB uniqueness constraint on that pair and the
existing product (e.g. reading twice a day at different times) legitimately allows the same
activity twice in one section at different times — see
`test/schedule-apply.test.js` "same activity twice in one section at different times is
allowed, not deduped".

### Idempotency (§7) — `schedule_apply_operation`

Migration `migrations/1810430000000_schedule_apply_operation.js` adds a
`schedule_apply_operation (operation_id, child_id, family_id, result_json, created_at)` table.

Existing infra was audited first: `db/widget-idempotency.js` /
`widget_completion_idempotency` is the only prior idempotency pattern, keyed by
`(installation_id, idempotency_key)` and scoped to widget completion — reusing it would overload
an unrelated table with a different identity and retention profile. `schedule_apply_operation`
follows the same "store result once, replay on retry" shape, keyed by `(operation_id, child_id)`
— the natural identity for a single-child command.

Retention: `cleanupExpiredScheduleApplyOperations()` deletes rows older than 30 days; called
best-effort from the existing midnight scheduler (`src/lib/midnight-scheduler.js`), next to the
existing `notification_log` prune — no new scheduler/advisory-lock entry was added.

Migration is additive-only; `down()` drops the table, which only means a retried request after
rollback is re-executed as a fresh (still duplicate-safe) operation — it cannot resurrect
deleted schedule data. No other schema change was needed or added in this phase.

### Transaction boundaries (§23)

Single-child, multi-day apply = one transaction. Standard-schedule materialization
(`ensureFamilyActivityTemplate` inside `resolveScheduleSource`) runs on the **same** client, so
a rollback also rolls back any activity_template rows created for this call. Daily-log sync and
SSE broadcast are post-commit and best-effort (unchanged from pre-existing behaviour) — see
`§24` below.

## Canonical query service — `src/lib/effective-schedule.js`

`resolveEffectiveSchedule(childId, dateStr, { client, timezone })` → `{ child_id, date,
day_of_week, source: { base_type, base_id }, items, excluded_activity_template_ids, metadata }`.

**Precedence implemented** (current product semantics, unchanged, now centralized):

1. Explicit **special day** (`special_day_schedule` + items) — if it has ≥1 items.
2. Otherwise **custody-aware weekly** schedule (`resolveWeeklyScheduleId`,
   `src/lib/custody-schedule-resolve.js` — untouched, reused as-is).
3. **Date exclusions** (`schedule_date_exclusion`) are applied to the weekly base only — never
   to an explicit special day. This matches the existing `items.js` GET filter and
   `syncDailyLogWithSchedule`'s exclusion check.

**§8.1 — empty special day.** A `special_day_schedule` row with zero items falls back to
weekly. This was already `daily-log-generator.js`'s behaviour ("Empty special day row — fall
through to weekly schedule below") and is preserved and locked with a regression test
(`test/effective-schedule.test.js` "empty special day row falls back to weekly").

**§8.3 — once-tasks boundary (deferred).** Once-tasks (`daily_log_item.is_once_task = true`)
are **not** merged into `resolveEffectiveSchedule()`'s `items`. They are created directly
against `daily_log_item` (`POST /api/children/:childId/schedules/once-tasks`) and have their
own lifecycle, independent of `weekly_schedule`/`special_day_schedule`. Folding them into this
resolver would require it to read *and* write `daily_log_item`, risking duplicate once-tasks on
every read. This boundary is intentional for Phase 1A and documented here so Phase 1B can design
one merged read model (resolver + once-task overlay) without repeating this analysis.

### Daily-log integration (§9)

`daily-log-generator.js`'s `getOrGenerateDailyLog()` now calls
`resolveBaseItemsForLog()` → `resolveEffectiveSchedule()` for its two "no items yet" code paths
(first-ever generation, and the "log exists but has 0 items" backfill path), replacing three
near-duplicated inline SQL blocks. Snapshot/materialization mechanics
(`batchInsertDailyLogItems`, `generated_from` bookkeeping, the exact final `SELECT` shapes
returned to callers) are untouched.

**One intentional, tested behaviour change:** before this refactor, first-ever generation of a
daily log copied `weekly_schedule_item` rows directly and did **not** check
`schedule_date_exclusion` — only the later `syncDailyLogWithSchedule()` sync path did. An
exclusion created before a date's log had ever been generated would therefore still show up on
first read. Routing first-time generation through the same resolver used everywhere else closes
this gap: exclusions are now honoured immediately, matching §16 ("date exclusions are a critical
minimal-mutation capability"). Covered by
`test/effective-schedule.test.js` "exclusion honoured on first-ever generation via
daily-log-generator (§9, gap closed)". `syncDailyLogWithSchedule()` / `syncDailyLogForSpecialDay()`
(the re-sync paths) were **not** changed — they already had correct exclusion/once-task handling
and rewriting them was out of scope for this phase.

## Canonical section order — `src/lib/schedule-sections.js`

`CANONICAL_SECTIONS = ['morgon', 'dag', 'kvall', 'natt']`. Used by the two new services above.
Existing scattered SQL `CASE` expressions (`daily-log-generator.js`,
`canonical-child-next-activity.js`, `first-star-mode.js`, etc.) were **not** touched — rewriting
every existing section-order expression is a larger, unrelated cleanup explicitly out of scope
for this phase (§17: "do not perform a giant unrelated cleanup"). `time_group` values such as
`eftermiddag` on `activity_template` are a separate, unrelated concept and were not promoted to
a schedule section.

## Route changes (before → after)

| Route | Before | After |
|---|---|---|
| `POST /api/schedule-templates/:id/apply` | Own day-write loop in `templates.js` (skip if occupied & `!overwrite`, else delete+insert) | Same response contract (`message`, `filled_days`); internally calls `applyScheduleSourceToChild` once with `mode: 'merge'` for untouched days and once with `mode: 'replace_day'` for `overwrite`-targeted days that already exist |
| `POST /api/standard-library/schedules/:id/copy` | `copyCanonicalScheduleToFamily()`'s own `writeScheduleDays()` loop (identical shape to the above) | Same response contract (`message`, `filled_days`, `activities_created`, `schedule_canonical_id`); same split-mode mapping as the family-template route, sourceType `standard_schedule` |
| `POST /api/children/:childId/schedules/fill-week` | `activity_category`-driven insert loop | **Unchanged.** Explicitly isolated as legacy (§13) — see `src/routes/schedules/fill-week.js` header comment. `activity_category` did not become a canonical source type. |
| `POST /api/children/:childId/schedules/once-tasks` | Direct `daily_log_item` insert | **Unchanged** — preserved minimal-mutation semantics (§15), out of scope for this phase's write engine. |
| `POST /api/schedules/:scheduleId/items/:itemId/exclude-date` | Direct `schedule_date_exclusion` insert + daily_log_item delete | **Unchanged** on the write side. Read side now flows through `resolveEffectiveSchedule()` for first-ever generation (see above). |
| `POST /api/children/:childId/schedules/apply-date-range` | `special_day_schedule` materialization over a date range | **Unchanged.** Full-day snapshot domain, explicitly out of scope for Phase 1A (§14) — not part of the recurring-weekly canonical command. |

Compatibility note for the two rewritten routes: `overwrite=false` (default) still means "skip
days that already have a schedule" (not "merge into them") — the pre-existing contract for
these two routes, preserved exactly via the merge/replace_day split described above. One
deliberate, documented tightening: applying a genuinely **empty** source (template or standard
schedule with zero items) now returns a `400` instead of silently creating an empty
`weekly_schedule` row or, under `overwrite=true`, silently wiping a populated day (§5.5). No
existing test asserted the old silent-wipe behaviour, and the new error aligns with the explicit
Phase 1A validation requirement.

## Authorization (§22)

`applyScheduleSourceToChild` re-validates `family_id` ownership of the source
(`weekly_schedule.family_id = $familyId AND child_id IS NULL` for templates;
`materializeStandardScheduleActivities` writes only under the caller's `familyId`) inside its own
transaction — it never trusts a bare `familyId`/`sourceId` from the caller. Both rewritten routes
still perform their own `getChildAccess`/`parent_child` check before calling the service (child
scope is enforced at the route boundary, as elsewhere in the codebase). Cross-family source and
cross-family child denial are covered by `test/schedule-apply.test.js` and
`test/standard-library-schedule-copy.test.js`; the pre-existing revoked-parent/cross-family
integration coverage in `test/schedules-revoked-parent.integration.test.js` continues to pass
unmodified.

## Broadcast / live refresh (§24)

Unchanged: both rewritten routes still call `syncDailyLogWithSchedule()` per changed day and
`broadcast(familyId, 'SCHEDULE_UPDATED', ...)` once, after the canonical command's transaction
has committed. Nothing is broadcast before commit.

## Deferred / out of scope for Phase 1A

- **Special Period** — no new domain concept or migration added (§34). The existing
  `apply-date-range` (`special_day_schedule` over a date range) is unchanged and continues to
  serve that need until Phase 2.
- **Undo** — no fake "wait 5s" undo. `replace_sections`/`replace_day` are explicit, non-default,
  and always run inside a single transaction, which is the minimum precondition for a real
  server-side undo. A real implementation would most cheaply build on the
  `schedule_apply_operation` ledger: extend `result_json` to include a before-state snapshot
  (the deleted rows) for destructive modes, and add an `undoOperation(operationId, childId)`
  that re-materializes that snapshot inside a new transaction. Left for Phase 1B/2 — building a
  full undo subsystem now would be premature (§18).
- **Legacy fill-week** — isolated, not adapted, per §13 option B (documented in the file's own
  header comment). No new code depends on `activity_category` as a schedule source.
- **`applyScheduleSourceToTargets` as a public route** — implemented, tested, but intentionally
  not mounted. Phase 1B should decide the real cross-child atomicity contract (see "Not exposed
  as a public route" above) before exposing it.
- **Full once-task/effective-schedule read-model unification** — documented boundary in
  `effective-schedule.js`, not implemented in Phase 1A (§8.3).
