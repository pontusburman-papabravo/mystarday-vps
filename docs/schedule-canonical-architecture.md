# Schedule domain — canonical command/query architecture (Phase 1A + 1B + 1C + 2 + 3 + 4)

**Status: PHASE 1A COMPLETE — merged, deployed, and verified.**
**Status: PHASE 1B COMPLETE — merged, deployed, and verified.**
**Status: PHASE 1C COMPLETE — merged, deployed, and verified.**
**Status: PHASE 2 COMPLETE — merged, deployed, and verified.**
**Status: PHASE 3 COMPLETE — merged, deployed, and verified.**

- Merged via PR [#1093](https://github.com/pontusburman-papabravo/mystarday-vps/pull/1093) — <!-- pragma: allowlist secret -->
  merge commit `9512ec6cc1c6cf7fa3f9baab8199ac3af9f0f34f` on `main`.
- Post-merge deploy hotfix via PR [#1094](https://github.com/pontusburman-papabravo/mystarday-vps/pull/1094) <!-- pragma: allowlist secret -->
  (missing deploy snapshot-contract registrations for the two new migrations — see "Deployment"
  below) — merge commit `745eae8c0745f892bc85b543dd48726002be0be2` on `main`.
- Deployed to the live app at `main` SHA `5f012d0d18049744ef00e91f75a536d179187376`
  (`DEPLOY_SUMMARY status=success outcome=DEPLOY_PASS health_check_result=ok`).
- Verified: both migrations applied on the deployed database with the expected schema
  (including `command_fingerprint`), `/health` green, no application startup errors, no
  schedule/daily-log error spike in `journalctl -u mystarday`, feature/payment/market flags <!-- pragma: allowlist secret -->
  unchanged (deploy gate's own business-table drift check passed).

## Phase 1B merge + deploy record

- Merged via PR [#1095](https://github.com/pontusburman-papabravo/mystarday-vps/pull/1095) — <!-- pragma: allowlist secret -->
  ("Fas 1B — New Weekly Schedule \"+ Lägg till\" flow"), reviewed HEAD
  `87042154b8f446564ffea05ae32eca4dfeecb8cd` rebased onto `main`
  `63031d0b89cc791b99040209161706d337eb3c5d` (a real, unrelated SW-cache-version bump
  collision was resolved by sequencing the version bumps — no Phase 1B logic changed) —
  merge commit `8527174c5030d92088f4a15991615b51fbd5a9c0` on `main`.
- Deployed to the live app at `main` SHA `8527174c5030d92088f4a15991615b51fbd5a9c0`
  (`Deploy to VPS` GitHub Actions run: success).
- Verified: `/health` green (`git_sha` matches the deployed merge commit, `cache_version:
  stjarndag-v887`), clean server restart with no startup errors, no schedule/custody error
  spike in `journalctl -u mystarday` (one unrelated pre-existing `[ONCE-TASKS] Create error` <!-- pragma: allowlist secret -->
  duplicate-key race from the legacy once-task route — `src/routes/schedules/child-crud.js`,
  untouched by Phase 1B, already gracefully handled with a 500 + friendly error, not a crash),
  IAP/English-market flags unchanged from pre-deploy.
- Post-deploy smoke test on an isolated, immediately-deleted sandbox family (never touched a
  real customer family): Weekly Schedule loads, "+ Lägg till" visible, Aktivitet / Från mall /
  Kopiera dag / Spara dagen som mall all work end to end, `replace_day` shows the explicit
  Ersätt/Avbryt confirmation (not a generic "OK"), and two-home custody isolation holds — an
  activity added to "Hos mamma" (home A) does not leak into "Hos pappa" (home B) and persists
  correctly when switching back, confirmed both in the UI and directly in the database
  (`custody_home_id`/`week_variant` correctly scoped per home; the saved template row stayed
  custody-neutral). The pre-existing legacy per-day-card "Kopiera dag" button (not part of
  Phase 1B, untouched) was separately observed to still write to the generic (no-home)
  `weekly_schedule` row as it always has — a known, out-of-scope limitation of that legacy
  control, not a Phase 1B regression.

**Baseline:** `main` @ `80bc241a7fbf122ec7afa43d141d6598f83b75dd` (initial), rebased twice for
review follow-ups, final pre-merge HEAD `edaf2351eac4fa365bf75c958627c687174044eb` on top of
`main` @ `7a5d7229112a98f175d5c5c1a1fec658a3cf54ee`.

This is the short architecture note required by the Phase 1A task brief (§34). It documents
the canonical command service, the canonical effective-schedule resolver, apply modes,
precedence, legacy adapters, and the deferred Phase 1B/2/Special Period boundary.

The rules below are **locked** for Phase 1B and later unless post-merge verification reveals a
real regression: canonical command service; canonical effective-schedule resolver; source types
`family_template`/`standard_schedule`; `merge` default; `replace_sections`; explicit
`replace_day`; duplicate identity `activity_template_id + section + start_time + end_time`;
canonical sections `morgon -> dag -> kvall -> natt`; idempotency with command fingerprint;
advisory-lock concurrency protection; single-child multi-day transactional atomicity;
child/family invariant inside the canonical service; custody-aware weekly resolution;
special-day > weekly base precedence; date exclusions; the once-task boundary (intentionally
separate); `activity_category` remains legacy, not canonical; no Special Period yet.

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
- `applyScheduleSourceToChildPlan({ familyId, childId, sourceType, sourceId, targets, operationId,
  custodyContext, locale, variants, optionalSelections })` — **the** single-child command
  primitive (added in the PR #1093 hardening pass). `targets` is a per-day plan —
  `[{ dayOfWeek, mode }]` — so ONE call can mix `merge` for empty days and `replace_day` for
  populated days in the SAME transaction. Source resolution/materialization happens once;
  family/child integrity and idempotency are enforced before any mutation (see below).
- `applyScheduleSourceToChild({ familyId, childId, sourceType, sourceId, days, mode,
  operationId, custodyContext })` — thin same-mode-for-all-days wrapper around the plan
  primitive, kept for callers that genuinely want one mode across every day. It builds
  `targets = days.map(d => ({ dayOfWeek: d, mode }))` and delegates entirely to
  `applyScheduleSourceToChildPlan` — there is only one write path underneath.
- `applyScheduleSourceToTargets({ targets, authorizeChild, ... })` — thin batch orchestrator.
  **Not exposed as a public route in Phase 1A.** Preflight authorizes every target before the
  first write, so one unauthorized child blocks the whole batch (§6). Each child is still its
  own DB transaction (the pool is `max: 5` — see `src/lib/db.js` — holding N open transactions
  for one HTTP request is unsafe at that pool size), so a promise of **cross-child** atomicity
  would be misleading; this function is documented, tested, and kept internal until Phase 1B
  decides how (or whether) to expose true multi-child atomicity.

### Legacy-route atomicity fix (PR #1093 review)

The initial Phase 1A cut split one legacy-route request into up to two canonical commands
(one `merge` call for empty days, one `replace_day` call for `overwrite`-targeted populated
days) — each its own transaction. That was an atomicity **regression** versus the pre-Phase-1A
code: a request like `days=[1,2,3], overwrite=true` with day 2 already populated could commit
days 1+3 and then fail on day 2, leaving a partial apply.

Fixed by routing both `templates.js`'s `/apply` and `standard-library.js`'s
`/schedules/:id/copy` through **one** `applyScheduleSourceToChildPlan()` call per request: the
route computes a single per-day plan (`{ dayOfWeek, mode: 'merge' | 'replace_day' }` for every
day that will actually be touched; days that already have a schedule and `overwrite=false` are
simply left out of the plan, matching the pre-existing "skip" semantics) and submits it as one
call. Source resolution/materialization happens once; one `BEGIN`/`COMMIT` covers every target
day; a failure on any target day rolls back every target day in that request, including ones
processed earlier in the same call. Covered by `test/schedule-apply-hardening.test.js` tests
A–D (mixed plan, forced mid-plan failure proving an earlier-processed day rolls back, and the
same proof for standard-schedule materialization).

### Duplicate-identity rule (§5.2)

`activity_template_id + section + start_time + end_time`. Plain `activity_template_id + section`
was rejected because `weekly_schedule_item` has no DB uniqueness constraint on that pair and the
existing product (e.g. reading twice a day at different times) legitimately allows the same
activity twice in one section at different times — see
`test/schedule-apply.test.js` "same activity twice in one section at different times is
allowed, not deduped".

### Idempotency + concurrency (§7, hardened per PR #1093 review) — `schedule_apply_operation`

Migration `migrations/1810430000000_schedule_apply_operation.js` adds
`schedule_apply_operation (operation_id, child_id, family_id, command_fingerprint, result_json,
created_at)`; migration `migrations/1810430000001_schedule_apply_operation_fingerprint.js` adds
`command_fingerprint` (the hardening pass — see below).

Existing infra was audited first: `db/widget-idempotency.js` /
`widget_completion_idempotency` is the only prior idempotency pattern, keyed by
`(installation_id, idempotency_key)` and scoped to widget completion — reusing it would overload
an unrelated table with a different identity and retention profile. `schedule_apply_operation`
follows the same "store result once, replay on retry" shape, keyed by `(operation_id, child_id)`
— the natural identity for a single-child command.

**Why `(operation_id, child_id)` alone was insufficient (§3 finding).** A client could reuse an
`operation_id` for a materially different command (different source, days, or mode), and the
original implementation would have silently replayed the FIRST command's result for a
completely different SECOND command — a correctness bug, not just a cosmetic one.

**Command fingerprint (`computeCommandFingerprint()`).** A SHA-256 hash over a
canonically-ordered, key-sorted JSON serialization of every input that materially defines the
command's output: `childId`, `familyId`, `sourceType`, `sourceId`, the full per-day
`targets` plan (day + mode, sorted by day), `custodyHomeId`, `locale`, `variants`,
`optionalSelections`. Behaviour:

- same `operation_id` + same `child_id` + **matching** fingerprint → replay the stored result,
  no mutation
- same `operation_id` + same `child_id` + **different** fingerprint → deterministic `409
  IDEMPOTENCY_KEY_REUSED`, no mutation

**Concurrency (§3B finding).** The naive `SELECT ledger; mutate; INSERT ... ON CONFLICT DO
NOTHING` pattern does not guarantee at-most-once execution: two concurrent requests with the
same identity can both miss the `SELECT` before either has inserted. Fixed with a
**transaction-scoped Postgres advisory lock** on the `(operation_id, child_id)` identity,
acquired immediately after the family/child integrity check and before the ledger is read:

```sql
SELECT pg_advisory_xact_lock(hashtext('schedule_apply_operation'), hashtext($1 || ':' || $2))
```

`pg_advisory_xact_lock` blocks the calling transaction until the lock is free, and — critically
— releases automatically at `COMMIT`/`ROLLBACK`, so there is no manual unlock and no risk of a
leaked lock on a crash. Two concurrent transactions with the same `(operation_id, child_id)`
now execute strictly one after another: the first proceeds, mutates, stores the ledger row, and
commits (releasing the lock); the second then acquires the lock, re-reads the ledger (now
populated), and either replays (fingerprint match) or gets `409` (mismatch) — it never mutates.
No external infrastructure (Redis, etc.) was introduced. This is covered by
`test/schedule-apply-hardening.test.js` "two concurrent identical requests mutate exactly once"
(two `Promise.all`-parallel calls; asserts exactly one row was written and exactly one of the
two results is `replayed: true`).

Retention: `cleanupExpiredScheduleApplyOperations()` deletes rows older than 30 days; called
best-effort from the existing midnight scheduler (`src/lib/midnight-scheduler.js`), next to the
existing `notification_log` prune — no new scheduler/advisory-lock-registry entry was added
(the per-command advisory lock above is transaction-scoped and self-releasing; it needs no
registry).

Migrations are additive-only; `down()` drops the table/column, which only means a retried
request after rollback is re-executed as a fresh (still duplicate-safe) operation — it cannot
resurrect deleted schedule data. No other schema change was needed or added in this phase.

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
| `POST /api/schedule-templates/:id/apply` | Own day-write loop in `templates.js` (skip if occupied & `!overwrite`, else delete+insert) | Same response contract (`message`, `filled_days`); builds ONE per-day plan (`merge` for untouched days, `replace_day` for `overwrite`-targeted days that already exist) and submits it as a single `applyScheduleSourceToChildPlan` call — one transaction for the whole request |
| `POST /api/standard-library/schedules/:id/copy` | `copyCanonicalScheduleToFamily()`'s own `writeScheduleDays()` loop (identical shape to the above) | Same response contract (`message`, `filled_days`, `activities_created`, `schedule_canonical_id`); same single-plan-call mapping as the family-template route, sourceType `standard_schedule` |
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

## Authorization (§22, hardened per PR #1093 review §4)

Two independent layers, neither relying solely on the other:

1. **Route/actor layer** (unchanged): both rewritten routes still perform their own
   `getChildAccess`/`parent_child` check before calling the service — this is where actor/role
   authorization (does THIS parent have access to THIS child) belongs, matching the rest of the
   codebase's `src/middleware/authz.js` conventions.
2. **Domain-service layer** (new, `assertChildBelongsToFamily()`): `applyScheduleSourceToChildPlan`
   independently re-validates `child.family_id === familyId` **inside its own transaction**,
   before any other work — including before the idempotency ledger is even consulted — and
   before any schedule mutation. `resolveScheduleSource` separately re-validates `family_id`
   ownership of the source (`weekly_schedule.family_id = $familyId AND child_id IS NULL` for
   templates; `materializeStandardScheduleActivities` writes only under the caller's
   `familyId`). Together these mean the canonical service **cannot** perform a cross-family
   write even if a future caller's route-level authorization has a bug — family integrity does
   not depend exclusively on `getChildAccess` being called correctly upstream.

A mismatch throws `ScheduleApplyError('CHILD_NOT_IN_FAMILY', 403, ...)` before the transaction
does anything else, so nothing is ever written. Covered by
`test/schedule-apply-hardening.test.js`:
"canonical service denies cross-family child even if caller supplies familyId=A, source=A,
childId=B" (family_template), "standard_schedule cannot be applied cross-family through the
same mistake" (standard_schedule), and "applyScheduleSourceToChild (simple wrapper) also
enforces the invariant". The pre-existing revoked-parent/cross-family integration coverage in
`test/schedules-revoked-parent.integration.test.js` continues to pass unmodified.

## Deployment (post-merge verification, PR #1094 hotfix)

The `schedule_apply_operation` migrations are additive/schema-only (new table, new column;
no existing table's data touched), but the repo's deploy pipeline
(`scripts/vps-deploy-revision.sh` → `scripts/ops/lib/compare-snapshots.mjs`) requires **every**
migration applied during a deploy to declare a snapshot contract in
`scripts/ops/lib/migration-snapshot-manifest.mjs`, so it can fail-closed on unexpected
business-table drift. Both migrations were initially missing from that registry, which failed
the first post-merge deploy attempt at the **post-migrate snapshot compare** step —
`migration_contract_missing` for both. This did **not** cause an outage: the deploy tool applies
migrations before restarting the app service and stopped before restart, so the running app kept
serving the previous release the whole time (confirmed via `/health` `git_sha` during the
incident). Fixed in PR #1094 by registering both migrations as `{ backwardCompatible: true,
schemaOnly: true }` — the same shape already used for other new-table migrations like
`1810420000000_family_growth_intervention`. Locked with a regression test in
`test/ops-deploy-snapshot-gate.test.js`.

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

## Phase 1B — status: COMPLETE, merged and deployed (see "Phase 1B merge + deploy record" above). Phase 1C (legacy retirement) not started.

Phase 1B's product goal is a single "+ Lägg till" primary action on Weekly Schedule exposing
Aktivitet / Från mall / Kopiera dag, backed entirely by canonical Phase 1A/1B services, with no
backend jargon exposed to the parent. This section is deliberately explicit about what exists
today versus what remains, so this is not mistaken for a finished feature.

### What is implemented and tested

**New canonical commands** in `src/lib/schedule-apply.js` (all share the same hardened
transaction/idempotency/family-integrity skeleton via a new internal
`runIdempotentScheduleCommand()` helper — `applyScheduleSourceToChildPlan` was refactored onto
it too, with its full existing test suite re-run green to prove no regression):

- `applyActivityToChild()` — "Aktivitet" (§1B.1, §1B.20 decision record below).
- `copyScheduleDay()` — "Kopiera dag" (§1B.4, §1B.21) — reads a source child/day directly and
  applies via `applyScheduleItemsToDay`; never creates a temporary template; the source day is
  read-only and therefore never modified.
- `saveWeeklyDayAsFamilyTemplate()` — "Spara dagen som mall" (§1B.5, §1B.22) — creates a brand
  new `family_template` row (never repurposes the child's own `weekly_schedule` row); the
  created template is an explicit copy, never live-linked back to the source day (locked with a
  regression test that edits the saved template afterward and asserts the source day is
  unaffected).

**§1B.20 decision record — direct-activity source:** `activity_template` was **not** added to
`SOURCE_TYPES`. A "source" is a reusable, materializable collection resolved via
`resolveScheduleSource` (`family_template` / `standard_schedule`); a single already-existing
family activity needs no resolution/materialization, so `applyActivityToChild()` is a separate
command that calls `applyScheduleItemsToDay` directly. This keeps "reusable template content"
and "one activity, right now" as distinct, non-blurred concepts, per the explicit instruction not
to widen `SOURCE_TYPES` for convenience.

**§1B.21 decision record — copy-day source:** no temporary template is persisted. `copyScheduleDay()`
reads `weekly_schedule_item` rows for the source child/day directly (with the same family
ownership check as every other command) and writes through the same `applyScheduleItemsToDay`
primitive as every other command — one write path, still.

**New route** `src/routes/schedules/apply.js`, mounted into the existing `childRouter`
(`/api/children/:childId/schedules/...`):

| Route | Command | Notes |
|---|---|---|
| `POST .../apply-source` | `applyScheduleSourceToChildPlan` | `source: { type, id }` maps directly to `family_template`/`standard_schedule`; frontend never sends/sees those names — see "user-facing labels" below |
| `POST .../apply-activity` | `applyActivityToChild` | default `mode: 'merge'` |
| `POST .../copy-recurring-day` | `copyScheduleDay` | **not** named `/copy-day` — that legacy path already exists in `child-bulk.js` (always-replace, no idempotency) and is intentionally left untouched per the strangler pattern (§1B.13); this is a deliberately distinct path, not a collision |
| `POST .../save-as-template` | `saveWeeklyDayAsFamilyTemplate` | |

All four routes accept an optional `operation_id` and are protected by the SAME two-layer
authorization as every Phase 1A route (route-layer `getChildAccess` + in-service
`assertChildBelongsToFamily`). A conflicting `operation_id` reuse (different payload) returns
`409` with **no** mutation — proven end-to-end over HTTP in
`test/schedule-apply-routes.test.js`.

**Tests:** `test/schedule-apply-phase1b.test.js` (19 tests — direct-activity apply, copy-day
including cross-child-in-family and cross-family denial, save-as-template including the
copy-vs-live-link proof) and `test/schedule-apply-routes.test.js` (HTTP integration — all four
routes, operation_id replay + conflict, cross-family denial). Full existing Phase 1A suite
re-run green after the `runIdempotentScheduleCommand` extraction.

### Frontend (this pass) — new files

- `public/js/schedule-apply-client.js` — thin client adapter (§1B.18) owning request shaping
  and the `operation_id` lifecycle (`createOperationTracker()`: same id while a command's
  fingerprint is unchanged — safe retry; new id the instant any field changes — §1B.9/§12).
  Backend remains authoritative for merge/replace semantics, transactions, duplicate handling,
  and family/child integrity; this module never re-implements any of that.
- `public/js/schedule-add-menu.js` — the "+ Lägg till" entry button, the primary menu
  (Aktivitet / Från mall / Kopiera dag), all three step flows, the destructive `replace_day`
  confirmation, and "Spara dagen som mall". Reads `currentChildId`/`currentDay`/`allTemplates`/
  `loadTemplates`/`loadScheduleForDay` from `schedule.js`'s shared script-level scope — the same
  pattern already used by `schedule-special-days.js`/`schedule-activity-modals.js`. No schedule
  mutation SQL or merge/replace logic lives here.
- `config/i18n/schedule-sv-SE.json` / `schedule-en-GB.json` — new `addMenu` namespace with
  full sv-SE/en-GB parity (enforced by `test/i18n-schedule-surfaces.test.js`).
- `scripts/audit-hardcoded-swedish.js` — both new files added to the STRICT tier (0 hits).

### Frontend integration points (minimal, additive edits to existing files)

- `public/schedule.html`: added the `+ Lägg till` button next to the existing `Fyll vecka`
  button (same toolbar row, same visibility mechanism — see below); added the two new
  `<script>` tags, loaded after `schedule.js`/`schedule-views.js`.
- `public/js/schedule.js`: added one new button — "💾 Spara som mall" — into the **existing**
  per-day action row (alongside the legacy Kopiera dag / Kopiera till veckor / Kopiera till
  barn / Ta bort dag buttons), per §10 ("extend the existing day menu, don't create a second
  competing one"). No existing button, function, or behaviour was changed or removed.
- `+ Lägg till` button visibility is NOT reimplemented — a `MutationObserver` mirrors the
  `hidden` class of the existing `#fillWeekBtn` (already correctly wired to "is a single
  child's week editor currently open" across calendar-view changes, child switches, etc. in
  `schedule.js`/`schedule-cal-nav.js`), so no calendar/view-mode logic was touched.

### Apply-mode UX (§6/§7)

Three labelled options, never backend words, in every "Från mall" / "Kopiera dag" step:
`Lägg till` (merge, default) → `Ersätt berörda delar` (replace_sections) → `Ersätt hela dagen`
(replace_day, never preselected). Selecting `replace_day` and pressing save always routes
through an explicit confirmation screen (`confirmReplaceDay()`) with day-specific text, an
`Ersätt` action button and an `Avbryt` cancel — never a generic "OK", never colour-only.
Cancelling performs zero mutation (confirmed in `test/schedule-add-menu.test.js` and manual
verification).

### Multi-child decision (§1B.8/§15)

Every new flow operates on `currentChildId` only — the child already open in the editor.
`applyScheduleSourceToTargets` (multi-child) is **not** wired into any new UI: it still lacks a
promised true cross-child atomicity contract (each child is its own DB transaction — see
"Not exposed as a public route" earlier in this document), so exposing a multi-child "Alla
barn" option here would risk exactly the partial-success UX the task explicitly forbids. No
"Alla barn" control exists anywhere in this pass.

### Custody hardening (PR #1095 review) — active custody home propagation

New recurring schedule mutations inherit the active `custody_home_id` from the Weekly Schedule
editor; **what the parent sees is what the parent edits.** The four Phase 1B "+ Lägg till"
commands did not originally propagate the active custody/boendeschema context — a parent
editing "hos mamma" could have the mutation land on the generic (no-home) `weekly_schedule`
row instead of the visible custody variant. Fixed end-to-end:

- **Frontend accessor** — `ScheduleCustody.getActiveHomeId()` (new) returns the currently
  edited home's id, or `null` when custody is inactive; `ScheduleCustody.getWriteContext()`
  (new) is a canonically-named alias that reuses the existing `getCreateExtras()` state rather
  than a second custody model or query-string parsing. `schedule-add-menu.js` calls
  `activeCustodyHomeId()` (a thin local wrapper) once per submit and forwards the result to
  BOTH the operation-id fingerprint and the client call.
- **HTTP contract** — `public/js/schedule-apply-client.js`'s four methods (`applyActivity`,
  `applyTemplate`, `copyDay`, `saveDayAsTemplate`) accept `custodyHomeId` and only add
  `custody_home_id` to the request body when it is truthy — a non-custody child's request is
  byte-for-byte identical to before. The four routes in `src/routes/schedules/apply.js` shape
  `custody_home_id` into `custodyContext: { custodyHomeId }` before calling the canonical
  service; no custody SQL lives at the route layer.
- **operation_id fingerprint** — `custodyHomeId` is now part of every operation-tracker
  fingerprint (`schedule-add-menu.js`) and every server-side `fingerprintPayload`
  (`schedule-apply.js`). Switching from "hos mamma" to "hos pappa" between clicks produces a
  NEW `operation_id`/fingerprint — it can never silently replay against the wrong home.
- **Server-side validation** — `resolveCustodyWriteContext()` (new, `src/lib/schedule-apply.js`)
  runs inside `runIdempotentScheduleCommand`, immediately after the existing
  `assertChildBelongsToFamily` check and before any mutation or idempotency-ledger lookup. It
  reuses the SAME two helpers the legacy custody-aware create route already uses
  (`db/custody.getHomeInFamily` for family ownership, `src/lib/custody-schedule-write.
  resolveScheduleWriteFields` to resolve the paired `week_variant` from the child's own
  `custody_pattern`) — no second custody-ownership model. A foreign-family or unknown
  `custody_home_id` throws `ScheduleApplyError('CUSTODY_HOME_INVALID', 403, …)`, rolling back
  the transaction with zero writes.
- **Why `week_variant` matters too, not just `custody_home_id`** — `weekly_schedule` has a
  unique index on `(child_id, day_of_week, COALESCE(week_variant, 'legacy'))`. A row written
  with `custody_home_id` set but `week_variant` left `NULL` would collide with every OTHER
  home's row for the same child+day (they would all resolve to the same `'legacy'` index key).
  `resolveCustodyWriteContext()` resolves both columns together — exactly like the existing
  `POST /api/children/:childId/schedules` create route already does — so home A and home B can
  coexist as two separate rows for the same child+day. `findOrCreateWeeklyScheduleRow()` writes
  `week_variant` on INSERT only; all reads still match on `custody_home_id` alone, which already
  uniquely identifies the row.
- **Per-command custody scoping**: `applyActivityToChild`/`applyScheduleSourceToChildPlan` write
  only to the active home's row (never the generic row, never the other home). `copyScheduleDay`
  reads the source day AND writes the target day(s) using the SAME active home — "copy what I
  see" matches "what gets applied" (§10); cross-child copy still independently re-validates both
  the source and target child belong to the family. `saveWeeklyDayAsFamilyTemplate` reads the
  custody-scoped source day but the resulting `family_template` row is always custody-neutral
  (`custody_home_id`/`child_id` both `NULL`) — a template is a reusable copy, not tied to a home.
- **No-custody regression** — every code path above is a no-op when `custody_home_id` is
  omitted/falsy; a family without custody sees identical behaviour to before this pass.
- **Tests**: `test/schedule-apply-custody.test.js` (10 — per-command custody scoping incl.
  `replace_day` non-interference across homes, copy-day home isolation, save-as-template
  custody-neutral template, foreign-family/unknown `custody_home_id` denial with no writes,
  no-custody regression, cross-family copy-day target denial even with a valid home id);
  `test/schedule-apply-routes.test.js` (extended — HTTP-level custody_home_id forwarding for
  all four routes + foreign-family denial); `test/schedule-add-menu.test.js` /
  `test/schedule-custody.test.js` (extended — frontend accessor exists and is used by every
  submit path, fingerprint includes `custodyHomeId`, client only sends `custody_home_id` when
  truthy). All pre-existing custody test suites (`test/custody-*.test.js`,
  `test/schedule-custody.test.js`, `test/dashboard-custody.test.js`) re-run green — one
  pre-existing, unrelated failure in `test/custody-api-integration.test.js` (confirmed present
  on the branch before this change too) is a known flaky assertion in the legacy
  `child-crud.js` create-route test, untouched by this pass.

### Mobile / accessibility

Every interactive control in the new flow uses one shared `TOUCH_BTN` class
(`min-h-[44px] min-w-[44px]`) — weekday chips, mode radios, tab buttons, save/cancel, the
destructive confirmation buttons. No control depends on hover, drag, or long-press. Selection
state is conveyed via an explicit `✓`/`●` glyph and `aria-pressed`/`aria-checked`, not colour
alone. `Escape` closes the modal; `role="dialog"` + `aria-modal="true"` are set. Manually
verified at 375px width and desktop width — see "Manual UI verification" below.

### Known follow-up (not a blocker, minor rough edge found during manual verification)

The "Färdiga mallar" tab calls `GET /api/standard-library/schedules`, which is gated by the
pre-existing `requireFeature('standardbibliotek')` middleware (unchanged, unrelated to this
PR). For a family without that feature, the request 403s and the tab falls back to its
"no schedules found" empty state — functionally safe (no crash, no misleading data) but the
empty-state copy doesn't currently distinguish "feature not available" from "genuinely no
matches". Left as a Phase 1C-adjacent polish item since it doesn't affect any family that
already has standard-library access (the majority case) and does not violate any DoD item.

### Manual UI verification

Performed via the `computerUse` subagent against a local dev server (fresh test family/child,
no live/deployed data touched), at both desktop width and 375px mobile width. See the PR
description for the full step list and screenshots. Summary: `+ Lägg till` button discoverable
next to `Fyll vecka`; all three flows (Aktivitet, Från mall, Kopiera dag) work end to end
including weekday shortcuts and the mode selector; the `replace_day` destructive confirmation
appeared correctly before any mutation and `Avbryt` performed no mutation; "Spara dagen som
mall" saved successfully with a confirmation toast; at 375px every modal remained fully usable
with no horizontal overflow or clipping. No JavaScript errors were raised by the new code (the
one console error observed — the expected 403 above — is pre-existing backend gating, not a
bug introduced here).

## Phase 1C — retire legacy Weekly Schedule entry points (strangler, not deletion)

**Status: PHASE 1C COMPLETE — merged, deployed, and verified.**

- Merged via PR [#1098](https://github.com/pontusburman-papabravo/mystarday-vps/pull/1098) — <!-- pragma: allowlist secret -->
  ("Fas 1C — Retire legacy Weekly Schedule entry points"), final reviewed HEAD
  `9a15f3b959fe0a21b41268f6317ef7b10e912665` — merge commit
  `f82602cf7aebbab6ef9518ae08e4d7e4bf8032b8` on `main`.
- Deployed to the live app at `main` SHA `f82602cf7aebbab6ef9518ae08e4d7e4bf8032b8`
  (`Deploy to VPS` GitHub Actions run: success).
- Verified: `/health` green (`git_sha` matches, `cache_version: stjarndag-v889`), clean server
  restart with no startup errors, no new migration (none expected/introduced by Phase 1C).
- Live-app smoke test on an isolated, immediately-deleted sandbox family (never touched a real
  customer family): Weekly Schedule loads, "+ Lägg till" visible, "Fyll vecka" fully absent from
  the toolbar, Aktivitet/Från mall/Kopiera dag/Spara dagen som mall all work, day action row
  shows exactly one "Kopiera dag" control plus a working "Fler alternativ" disclosure, the
  day-tab "+" and section "+ Aktivitet" both open the canonical Aktivitet modal with
  day/section correctly preselected, two-home custody isolation holds (confirmed both in the UI
  and directly in the database — `custody_home_id`/`week_variant` correctly scoped, no leakage,
  persists across switches), Planering hub keeps Veckoschema/Kalender primary and Tilldela
  schema secondary-only, Library template management still works with demoted (secondary-style)
  apply CTAs, and `/assign-schedule` remains reachable (not a 404). Verified at desktop and
  375px. No drift observed in IAP/payment/market flags or auth behavior — this PR's diff touches
  only `public/js/schedule-*.js`, `public/js/library-*.js`, `public/schedule.html`, `public/sw.js`,
  `config/cache-version.json`, docs, and one test file.
- Retained legacy compatibility surfaces confirmed still present: `fill-week` backend route,
  `/assign-schedule` page + routes, `child-bulk.js` (`copy-day`, `copy-to-weeks`,
  `copy-to-child`, `swap-day`), `schedule-templates.js` apply, `standard-library.js` copy — none
  deleted.

**Explicit follow-ups (not Phase 1C blockers, tracked for a later phase):** custody hardening
for "Kopiera till veckor" / "Kopiera till barn" / the drag-and-drop Swap gesture; real
server-side Undo; multi-child atomic apply; Phase 4 "Visa ▾" chrome cleanup; physical deletion
of legacy endpoints.

Phase 1C is a **strangler/retirement** pass, not a new-feature pass. Its job: after Phase 1B
was verified live and deployed, remove or demote the old primary UI paths that compete with the
canonical model below, so a parent no longer faces multiple ways to do the same recurring-week
planning job. Backend endpoints are retained wherever removal was not proven safe — "the old
path disappears from normal user behaviour without requiring immediate physical deletion of
all old code" (per the task brief's own strangler rule).

**Canonical, protected, unchanged by this phase:**
`+ Lägg till` → `Aktivitet` / `Från mall` / `Kopiera dag`, plus the day action `Spara dagen som
mall`. `merge` default / `replace_sections` / `replace_day` + confirmation. Custody: active
`custody_home_id` continues to scope every canonical mutation (Phase 1B custody hardening,
above — unchanged).

### Legacy-retirement table

| Legacy path | Old user job | Canonical replacement | UI status | Backend status |
|---|---|---|---|---|
| `#fillWeekBtn` "📆 Fyll vecka" toolbar button (`public/schedule.html`) | Bulk-fill multiple weekdays from an activity category, or blank | `+ Lägg till → Från mall` (multi-day, merge/replace_sections/replace_day, custody-scoped) | **Retired** — element converted to an invisible `<span>` state marker (same `id`, no `onclick`, no label); nothing on the page can trigger it anymore | Retained — `POST /api/children/:id/schedules/fill-week` (`src/routes/schedules/fill-week.js`) and `openFillWeekModal()`/`submitFillWeek()` (`schedule-insert-fill.js`) untouched, now unreachable from normal navigation. `#fillWeekModal` markup left in place (harmless, unreachable) rather than risk a larger deletion in this pass |
| Day-row "📋 Kopiera dag" button (`public/js/schedule.js` day action row) | Copy the current day → other days, **always replacing** target content, no custody scoping | `+ Lägg till → Kopiera dag` | **Rewired** — `onclick` now calls `ScheduleAddMenu.openCopyDay()` (pre-fills the current day as source); the legacy `openCopyDayModal()`/`submitCopyDay()`/`#copyDayModal` remain ONLY as a defensive fallback if `ScheduleAddMenu` fails to load (never expected in practice) | Retained — `POST /api/children/:id/schedules/copy-day` (`child-bulk.js`) untouched; no longer called by this button in the normal path |
| Day-tab drag-and-drop "Copy" (`public/js/schedule-dnd.js` `doDayDndCopy`) | Same job as above, via a drag gesture | Same | **Rewired in place** — now calls `ScheduleApplyClient.copyDay(...)` (canonical, idempotent, custody-scoped) with `mode: 'replace_day'` explicitly, preserving the gesture's exact pre-existing always-replace behaviour (a drag-drop has no mode-picker step, so silently defaulting to `merge` would surprise users — see §6 "if legacy semantics differ, preserve them under the same button") | Retained but no longer called from this gesture |
| "📆 Kopiera till veckor" / "👶 Kopiera till barn" (day action row) | Copy one day across future weeks / to another child — genuinely distinct advanced jobs, no canonical equivalent (cross-child copy is explicitly Phase-1C-out-of-scope "multi-child atomic scheduling") | None (kept as advanced features) | **Demoted** — moved from two always-visible coloured buttons into a `<details>`/`<summary>` "⋯ Fler alternativ" disclosure in the day action row, so the primary row shows one clear copy-day control instead of three competing ones | Retained unmodified — `POST .../copy-to-weeks`, `POST .../copy-to-child` (`child-bulk.js`) |
| Day-tab drag-and-drop "Swap" (`schedule-dnd.js` `doDayDndSwap`) | Swap two weekdays' content — distinct job, no canonical equivalent | None | Unchanged (not in the smoke-tested "copy" risk path) | Retained — `POST .../swap-day` |
| Planning hub "Tilldela schema" card (`public/js/planning-hub.js`) → `/assign-schedule` | Category-based day-by-day schedule assignment, standalone page | `/schedule → + Lägg till → Från mall` | **Already non-primary** — confirmed via audit: it lives in the secondary `OTHER_LINKS`/"Övrigt" section, never in the primary `PLAN_LINKS`/"Planera vardagen" grid. No code change required; locked in with a regression test (`test/schedule-phase1c-retirement.test.js` "B5/B7") | Retained — `/assign-schedule` page + its routes (`POST .../schedules`, `POST .../apply-date-range`) untouched, reachable for deep links / manual QA access |
| Library "📥 Kopiera till barn" CTAs — family template card + standard schedule card (`public/js/library-schema.js`) | Apply a family/standard template directly to a child's week from the Bibliotek page | `/schedule → + Lägg till → Från mall` | **Demoted** — visual treatment changed from a primary gold CTA (`bg-gold`) to a secondary outline button (`bg-white border-2 border-lavender`); the dialog (`openScheduleCopyDialog`/`executeScheduleCopy`) and its routes are unchanged | Retained — `POST /api/schedule-templates/:id/apply`, `POST /api/standard-library/schedules/:id/copy`, `POST .../apply-date-range` all unchanged |
| Library "📥 Kopiera schema" detail CTA (`public/js/library-magic-schedules.js`, standard-library magic detail view) | Same job, from the "Färdiga mallar" magic detail screen | Same | **Demoted** — CSS class changed from `library-magic-btn-primary` to `library-magic-btn-secondary` | Same routes, unchanged |
| Library "📋 Kopiera från…" per-child button (`library-schema.js`) | Copy another child's/standard schedule onto a child, from Bibliotek | Same | Already secondary-styled (`bg-lavender`, not gold) before this phase — left unchanged | `POST .../copy-to-child`, `POST .../standard-library/schedules/:id/copy` unchanged |
| Per-day-tab small "+" quick-insert (`schedule.js` `insert-day-btn`) | "Lägg till en aktivitet på denna veckodag" (also offered apply-template/apply-standard/blank-day sub-options via `openInsertDayModal`) | `+ Lägg till → Aktivitet` | **Rewired** — `onclick` now calls `ScheduleAddMenu.openActivityForDay(dayOfWeek)` (new, minimal), which pre-selects the tapped day inside the EXISTING canonical Aktivitet modal without navigating the background view away from the day the parent was viewing. `openInsertDayModal()` retained ONLY as a defensive fallback if `ScheduleAddMenu` fails to load | Retained — `POST /api/schedule-templates/:id/apply`, `POST /api/standard-library/schedules/:id/copy`, `POST /api/children/:id/schedules` (blank-day path) all untouched; no longer called by this control in the normal path |
| Legacy per-section "+ Aktivitet" (`schedule-core.js`/`schedule-views.js` → `openAddModal(sectionKey)`, `schedule-activity-modals.js`) | "Lägg till aktivitet i den här delen av dagen" | `+ Lägg till → Aktivitet` | **Rewired** — the single shared `openAddModal(sectionKey)` definition now calls `ScheduleAddMenu.openActivityForDay(currentDay, sectionKey)` and returns immediately, retiring all three call sites (normal/list/timeline views) in one change. Legacy `#addActivityModal` + its recurrence flow retained ONLY as a defensive fallback | Retained — `POST /api/children/:id/schedules` (ensure-day-row) + recurrence-flow routes untouched; no longer reachable via this control in the normal path |

### Custody safety — final state

**All visible recurring Weekly Schedule mutation entry points are routed through custody-safe
canonical behavior.** Both remaining gaps from the previous pass (day-tab "+" quick-insert and
the legacy per-section "+ Aktivitet") are now fixed by converging on
`ScheduleAddMenu.openActivityForDay(dayOfWeek, section)` (new, minimal — added to
`public/js/schedule-add-menu.js`), which only ever prepares `activityState` (the requested day
and/or section) and then reuses the EXISTING `openActivity()` render path — the actual write
still happens exclusively through the pre-existing `submitActivity()`, which already calls
`activeCustodyHomeId()` and forwards `custody_home_id` on every save (Phase 1B custody
hardening, unchanged). No new mutation path, no new backend route, no duplicated activity-picker
code was introduced — exactly "canonical UI must own the write."

Legacy backend routes those two controls used to call directly (`schedule-templates.js` apply,
`standard-library.js` copy, the blank-day-create path in `child-crud.js`, and the recurrence-flow
routes behind `#addActivityModal`) remain retained, unmodified, compatibility-only — nothing was
deleted. `openInsertDayModal()` and the legacy body of `openAddModal()` are kept solely as
defensive fallbacks for the never-expected case `ScheduleAddMenu` fails to load.

**Still out of scope for this phase** (genuinely distinct advanced jobs with no canonical
equivalent, not "add an activity/apply a template" duplicates): "Kopiera till veckor" / "Kopiera
till barn" (demoted into the day-action-row "Fler alternativ" overflow above, but their backend
routes in `child-bulk.js` still have no `custodyContext` parameter) and the day-tab
drag-and-drop "Swap" gesture. Cross-child copy in particular maps to the explicitly-out-of-scope
"multi-child atomic scheduling" domain. These were reviewed and are NOT primary "add activity /
apply schedule" duplicates the way the two fixed controls were — they are deliberately kept as
advanced/secondary functionality pending a future phase's backend custody-context work.

The legacy day-row "Kopiera dag" button and the day-tab drag-and-drop copy gesture — the two
HIGH-RISK items explicitly flagged in Phase 1B's own live-deploy smoke verification — were fixed
in the previous pass (table above).

### Locked decisions carried forward from this phase

- `activity_category` remains legacy — never added to canonical `SOURCE_TYPES`
  (`['family_template', 'standard_schedule']`, unchanged).
- `family_template` and `standard_schedule` remain the only two canonical schedule sources —
  Phase 1C removes competing **UI**, never the domain source types themselves.
- Calendar, Special Days, Special Period, Daily Log, and the "Visa ▾" Phase 4 chrome cleanup are
  untouched — none of that domain was in scope for this phase.

### Tests

`test/schedule-phase1c-retirement.test.js` (33 tests, source-pattern characterization — same
style as `test/schedule-add-menu.test.js`): Fyll vecka retirement + fill-week backend/route
retention + no new `activity_category` source; assign-schedule secondary placement +
reachability; legacy copy-day button/DnD rewiring + custody propagation; day-action-row
de-duplication + touch targets; canonical `+ Lägg till` flow regression; custody safety of every
rewired path (day-row Kopiera dag, DnD copy, day-tab "+", section "+ Aktivitet" — all delegate to
canonical entry points, none introduce a second mutation path); legacy backend route retention
(`child-bulk.js`, `fill-week.js` still export routers); Library CTA demotion (styling only,
routes/dialogs unchanged) + content-management jobs preserved; i18n parity for the new
`schedule.editor.moreOptions` key (already present in both locales) + hardcoded-Swedish audit
still green.

Full Phase 1A/1B regression suites (`test/schedule-apply*.test.js`, `test/effective-schedule.
test.js`, `test/standard-library-schedule-copy.test.js`, `test/schedule-add-menu.test.js`,
`test/schedule-custody.test.js`) and Planning/Library suites (`test/planning-hub-10-10.test.js`,
`test/planning-back-nav.test.js`, `test/library-bottom-nav.test.js`,
`test/assign-schedule-date-range.test.js`) all re-run green after these edits. `npm run lint`,
`npm run lint:public`, and `npm run check:css` all green (SW cache bumped to `stjarndag-v888`
for the changed precached JS/HTML assets).

## Phase 2 — Calendar + first-class Special Period domain

**Status: PHASE 2 COMPLETE — merged, deployed, and verified.**

- Merged via PR [#1101](https://github.com/pontusburman-papabravo/[REDACTED]-vps/pull/1101) — <!-- pragma: allowlist secret -->
  ("Fas 2 — Calendar + first-class Special Period domain (architecture-corrected)"), final
  reviewed HEAD `f49c563ff041b4fc1d1423f7a57f90561832f4ad` — merge commit
  `5ecb8612e26054a74d644f3d4c287442c33b4e72` on `main`.
- Deployed to the live app at `main` SHA `5ecb8612e26054a74d644f3d4c287442c33b4e72`
  (`Deploy to VPS` GitHub Actions run: success; migration `1810440000000_schedule_period`
  applied, pre/post-migrate and post-deploy snapshot compares all reported "no unexpected
  drift").
- Verified: `/health` green (`git_sha` matches the deployed merge commit exactly,
  `cache_version: stjarndag-v891` — unchanged, no static assets touched by the hardening
  commit), clean server restart with no startup errors, no schedule/period-related error spike
  in `journalctl -u mystarday` (the few log lines observed post-deploy were pre-existing, <!-- pragma: allowlist secret -->
  unrelated issues — a push-registration constraint warning and a stale Android WebView client
  cache error — neither touches `schedule_period`, `effective-schedule.js`, or any Phase 2 file).
- Database verified directly on the deployed instance: `schedule_period` and
  `schedule_period_item` exist with the expected constraints (CASCADE FKs to `child`/`family`,
  `apply_mode`/`source_type`/date-range CHECKs) and indexes; `special_day_schedule.period_id`
  does **not** exist, confirming the corrected structural separation shipped as designed; no
  customer data was read or mutated during this check.
- Live-app smoke test on an isolated, immediately-deleted sandbox family (never touched a real
  customer family) on `https://mystarday.se`: Specialperioder list loads and starts empty, <!-- pragma: allowlist secret -->
  create period (name/dates/family-template source/merge mode with all three modes visible and
  explained) succeeds with a success toast and the period appears in the list, "Redigera"
  reopens the modal fully pre-filled by id (no re-entered dates), delete shows the explicit
  "Ta bort"/"Avbryt" confirmation (never a bare browser `confirm()`) and removes the period back
  to the empty-list state. No console/JS errors observed. Test family fully deleted afterward;
  verified zero remaining `schedule_period`/`schedule_period_item` rows repo-wide post-cleanup.

This section documents the **corrected** Phase 2 design. An earlier prototype pass materialized
periods as ordinary `special_day_schedule` rows; that approach was found to be architecturally
incorrect (see "What the first prototype got wrong" below) and was replaced before merge — none
of that earlier storage model shipped to `main`. A subsequent hardening pass then found and
fixed one remaining correctness gap in the corrected resolver: date exclusions were still being
applied to the weekly base BEFORE period composition, so a period-sourced item could never be
excluded "bara idag" — see "Date exclusion & once-task overlays under a period" below for the
fix. Both corrections shipped together in the merged PR.

Phase 2 introduces `schedule_period` as a first-class domain entity for date-range exceptions,
replacing the "N unrelated `special_day_schedule` rows with no shared identity" approach the
legacy `apply-date-range` route and old "Lovperiod" UI used. It does **not** reopen Phase
1A/1B/1C architecture, redesign Weekly Schedule, or create a second resolver — `resolveEffectiveSchedule()`
(Phase 1A) remains the single canonical read path, now extended.

Conceptual model (unchanged, now explicit):

| Surface | Owns |
|---|---|
| Bibliotek | what exists (content) |
| Veckoschema | the normal recurring week |
| Kalender | exceptions on specific dates/date ranges |
| Daglig logg | what actually happened |

### What the first prototype got wrong

1. **Period composition was broken.** Materializing a period's source into
   `special_day_schedule` rows made `resolveEffectiveSchedule()` treat each date as a **full**
   override — a `kvall`-only period source would silently drop the day's `morgon`/`dag` weekly
   items ("en kvällsmall får inte påverka morgonen" — a period must not be able to erase parts of
   the day it never touched). `merge` and `replace_sections` cannot be implemented correctly on
   top of "populated special day = complete replacement" semantics.
2. **Explicit Special Day was not independent.** Both concepts lived in the exact same
   `special_day_schedule` row (linked via `period_id`), so deleting/re-materializing a period
   could destroy a parent's later, unrelated explicit override for one date inside that period.
3. **Overlap rejection was raceable.** The application-level overlap `SELECT` had no lock, so two
   concurrent creates for overlapping ranges could both pass validation and both insert.
4. **No real period-management UI.** The old modal only supported "create with today+6d defaults"
   and a fragile date-matching lookup for delete — no way to list, or edit-by-id.

### Corrected storage model

Migration `1810440000000_schedule_period.js` (revised before merge; still additive/reversible,
still one migration file, snapshot-manifest entry updated to match):

```sql
CREATE TABLE schedule_period (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  source_type VARCHAR(32) NOT NULL,   -- 'family_template' | 'standard_schedule'
  source_id UUID NOT NULL,
  apply_mode VARCHAR(32) NOT NULL DEFAULT 'merge',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date),
  CHECK (source_type IN ('family_template', 'standard_schedule')),
  CHECK (apply_mode IN ('merge', 'replace_sections', 'replace_day'))
);

-- Resolved source items, stored ONCE per period (not once per date). No relationship at all to
-- special_day_schedule — a period never writes there.
CREATE TABLE schedule_period_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES schedule_period(id) ON DELETE CASCADE,
  activity_template_id UUID REFERENCES activity_template(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(64) DEFAULT '⭐',
  start_time VARCHAR(8),
  end_time VARCHAR(8),
  star_value INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  section VARCHAR(32) NOT NULL DEFAULT 'dag'
);
```

The revised design deliberately does **not** add a `special_day_schedule.period_id` column at
all — that was the mechanism causing problems 1 and 2 above. `schedule_period_item` is a
completely separate, period-owned table: a period is resolved into ONE set of "what does the
source contain" rows, kept for the life of the period, and **composed at read time** with the
custody-aware weekly base for whichever specific date is being resolved — not materialized per
date. This directly satisfies "no orphaned per-date metadata" and "explicit Special Day stays
independent" simultaneously, because the two tables never touch each other.

### Resolver — period is a real runtime layer, not a special-day alias

`src/lib/effective-schedule.js`'s `resolveEffectiveSchedule(childId, dateStr, options)` (Phase
1A) is **still the single resolver** — no second one was written. It gained two new internal
helpers (`loadPeriodForDate()`, `composePeriodWithWeekly()`) and its precedence is now:

1. **Explicit, non-empty `special_day_schedule` row** for the date → wins outright (unchanged
   from Phase 1A; an *empty* explicit special day still falls through, tested in
   `test/schedule-period.test.js` "G25"/"G25b" — including the new case of an empty explicit day
   falling through to an *active period*, not just to weekly).
2. Else, if a `schedule_period` covers the date → **compose** the period's stored items with the
   custody-aware weekly base according to the period's `apply_mode`, THEN apply date exclusions
   to that composed result (see "Date exclusion" below — exclusions run strictly after
   composition, never before it):
   - **`merge`** (default) — weekly items for every section are kept; period items are appended,
     subject to the same canonical duplicate-identity rule (`activity_template_id` + section +
     start/end time) every other canonical apply mode already uses.
   - **`replace_sections`** — only the sections present in the period's item set are fully
     replaced; every other section's weekly items pass through untouched.
   - **`replace_day`** — the period's items are the entire result; no weekly item survives.
3. Else → the existing custody-aware weekly base, with date exclusions applied, unchanged from
   Phase 1A.

`source.base_type` in the response is now one of `'special_day'` / `'special_period'` /
`'weekly'` / `'none'`; for `'special_period'` the response also carries `source.base_id`
(the period id) and `source.apply_mode`. This is intentionally the minimal shape extension Phase
2 needs — Phase 3 still owns finalizing the full public response-shape contract.

### Explicit Special Day independence — proven, not assumed

Because periods and explicit special days never share a row or a foreign key, independence is a
structural property, not a "same row gets overwritten" coincidence — and it is exercise-tested
end to end in `test/schedule-period.test.js` ("D17/D18/D19"): create a period spanning a week,
add an explicit Special Day for one date inside it, confirm the explicit day wins on that date
while neighboring dates stay period-governed, then **update** the period (re-resolving its
item set) and confirm the explicit day is untouched, then **delete** the period entirely and
confirm the explicit day still exists and still resolves correctly — only the dates that had no
explicit override fall back to weekly/custody.

### Period update / delete semantics

- **Name-only update** — pure metadata; `schedule_period_item` rows are never touched
  (`content_changed: false` in the response).
- **Dates/source/mode update** — re-validates the (possibly new) range against overlap, then
  fully replaces the `schedule_period_item` set (delete + re-insert inside the same transaction)
  from the (possibly new) source. This never touches `special_day_schedule`,
  `schedule_date_exclusion`, or `daily_log_item` — those domains are simply not written to by a
  period, so there is nothing there to accidentally destroy.
- **Delete** — removes the `schedule_period` row (its `schedule_period_item` rows cascade via
  `ON DELETE CASCADE`) and nothing else. After delete, `resolveEffectiveSchedule()` naturally
  falls back to weekly/custody for every date that has no independent explicit override — no
  separate "un-apply" step is needed because nothing outside these two tables was ever mutated.

### Overlap — a real, concurrency-safe invariant

All three mutating operations (`createSchedulePeriod()`, `updateSchedulePeriod()`,
`deleteSchedulePeriod()` — the last one needs the lock too, since a concurrent create could
otherwise slip in between the delete's read and its commit) now take a **child-scoped Postgres
transaction advisory lock** (`acquirePeriodChildLock()`, keyed on a hash of `'schedule_period'` +
`childId`) **before** the overlap check and any write, inside the same transaction the rest of
the command already runs in. This serializes all period mutations for one child without
introducing a new Postgres extension (no `btree_gist` exclusion constraint) and without touching
the unrelated `runIdempotentScheduleCommand()` advisory lock Phase 1A/1B already use for
operation-id replay (the two locks are independent and compose correctly — verified by
`test/schedule-period.test.js` "I31": the same `operation_id` retried concurrently still replays
exactly once).

Verified with real concurrency, not just sequential assertions
(`test/schedule-period.test.js` "I28"–"I31", using `Promise.allSettled`):

- Two concurrent overlapping creates for the same child → exactly one succeeds, the other gets a
  deterministic `PERIOD_OVERLAP` (409), and the database contains exactly one period.
- Two concurrent non-overlapping creates for the same child → both succeed.
- A concurrent update-into-overlap vs. a concurrent create-into-the-same-range → at most one of
  the two operations wins; the database never ends up with two periods covering the same date for
  that child.
- The same `operation_id` submitted concurrently twice → both calls resolve successfully, exactly
  one period is created (one executes, one replays the ledger row).

### Date exclusion & once-task overlays under a period

- **`schedule_date_exclusion`** — reused unchanged (no new exclusion model, no schema change).
  It is applied to the **composed effective result** — i.e. AFTER `composePeriodWithWeekly()`,
  not before it — so it can remove an item regardless of whether that item originated from
  weekly or from an active period. If an item present in the effective output is excluded for
  that date, it disappears from the result for that date only; the period definition
  (`schedule_period`/`schedule_period_item`) and the weekly schedule are never mutated by this —
  it is a pure date-specific read-side overlay (`test/schedule-period.test.js` "E20/E21",
  "E20b"–"E20f").
  - **Hardening note:** an earlier pass of this resolver applied exclusions to the weekly items
    BEFORE composing the period, which meant a period-sourced item could never be removed "bara
    idag" — this was corrected before merge; exclusions now run exactly once, strictly after
    composition, for every branch (weekly-only and period-composed).
  - Works correctly under every apply mode: `merge` (excluding a period item leaves the weekly
    item; excluding a weekly item leaves the period item), `replace_sections` (excluding the
    period's item for a replaced section does **not** resurrect the old weekly item for that
    section — the section was already replaced, the exclusion just removes what's left of it),
    `replace_day` (excluding the period's only item yields an **empty** effective result for
    that date — `source.base_type` stays `'special_period'`; weekly never leaks back in merely
    because the period's content was excluded).
  - A populated **explicit Special Day never has exclusions applied to it** — that precedence
    branch returns before this filter runs at all, exactly matching pre-Phase-2 behaviour
    (`test/schedule-period.test.js` "E20e").
  - `schedule_date_exclusion.activity_template_id` is `NOT NULL` in the schema, and the filter
    additionally guards `item.activity_template_id == null` defensively, so a denormalized item
    with no linked `activity_template_id` can never be accidentally excluded.
- **Once-tasks (`daily_log_item.is_once_task`)** — still a pure daily-log overlay, still
  intentionally outside `resolveEffectiveSchedule()`'s returned items (pre-existing, documented
  boundary from Phase 1A) — unchanged by Phase 2, verified still additive and non-interacting
  with an active period (`test/schedule-period.test.js` "E22"). No new date-addition table was
  introduced; this remains a known, pre-existing domain smell tracked as follow-up, not fixed
  here.

### Custody decision (kept, re-verified against the corrected model)

**A Special Period is child/date-scoped, not custody-home-scoped.** `schedule_period` has no
`custody_home_id` column (asserted directly in `test/schedule-period.test.js` "F23/F24"). A
period overrides whichever custody-aware weekly base would otherwise be effective for that
child on that date — parents never create the same period twice, once per home. After the
period is deleted, the correct custody-aware weekly base returns automatically, because the
composition step re-resolves the weekly base fresh on every call.

### API — unchanged surface, one addition

| Method | Path | Notes |
|---|---|---|
| GET | `/api/children/:childId/schedule-periods` | list, most recent `start_date` first |
| GET | `/api/children/:childId/schedule-periods/:periodId` | **new** — full detail by id (name/dates/source/apply_mode/items), for the edit UI to preload without re-entering dates |
| POST | `/api/children/:childId/schedule-periods` | `{ name, start_date, end_date, source: { type, id }, apply_mode?, operation_id? }` |
| PATCH | `/api/children/:childId/schedule-periods/:periodId` | any subset of the above; `name`-only changes never re-resolve items |
| DELETE | `/api/children/:childId/schedule-periods/:periodId` | removes the period AND its `schedule_period_item` rows only |

All mutating routes accept an optional `operation_id`, reusing the exact same
`schedule_apply_operation` ledger table Phase 1A/1B commands use — no new idempotency
infrastructure. `src/routes/schedules/periods.js` stays thin: authz + request shaping only, no
mutation SQL. Because a period never writes into `special_day_schedule`/`daily_log`, there is no
per-date resync step to perform here (unlike the legacy `apply-date-range` route) — any
already-generated `daily_log` for an affected date is picked up on next natural regeneration,
the same way a same-day weekly-schedule edit has always behaved.

### First-class period management UI

The existing "Lovperiod" modal (`public/js/schedule-period.js`, inside the `/schedule`
Specialdagar view — still no new page, no Weekly Schedule redesign) was rebuilt into a real
CRUD surface:

- **List** — a "Specialperioder" card in the Specialdagar view (`schedule-special-days.js`)
  renders every existing period for the selected child (name, date range, apply-mode label) with
  a "Redigera" action per card, and a primary "+ Ny specialperiod"/"📅 Lovperiod" entry point.
- **Create** — name, start/end date, source (Mina scheman / Färdiga scheman, same canonical
  `family_template`/`standard_schedule` distinction every other flow uses), and an explicit
  three-way apply-mode picker (Lägg till / Ersätt berörda delar / Ersätt hela dagen), each with an
  always-visible one-line explanation — the destructive effect of "Ersätt hela dagen" is never
  hidden behind a generic "Spara". Default mode is **`merge`** ("Lägg till"), not the legacy
  `replace_day` — evaluated explicitly against product safety and chosen because creating a period
  can never overwrite *existing* content the way Weekly Schedule's `replace_day` can (there is
  nothing to lose by merging), so there was no strong reason to keep the more destructive default.
- **Edit** — opens by period id (`GET .../schedule-periods/:periodId`), pre-filling every field
  from the actual stored values; saving `PATCH`es the same id. The parent never re-enters dates to
  locate a period.
- **Delete** — by period id, with the existing shared confirm modal
  (`openConfirmModal()` — "Ta bort" / "Avbryt" buttons, not a generic browser `confirm()`),
  showing: *"Ta bort specialperioden? Veckoschemat börjar gälla igen på dagar utan andra
  undantag."*

`applySchedulePeriod()`/`removeSchedulePeriod()`'s old "guess the period from re-entered dates"
fallback lookup is fully removed — every mutation is by explicit id now, so there is no longer any
path that can leave orphaned `schedule_period` metadata from normal UI use.

### Legacy `apply-date-range` — retained, untouched

`src/routes/schedules/child-bulk.js`'s `apply-date-range` route is kept exactly as-is for its
other existing callers (`assign-schedule.html`, `library-schema.js`'s period toggle). The new
Specialperiod UI never calls it — it exclusively uses the first-class `schedule_period` API.
Dates created via the legacy route (or any pre-Phase-2 date) remain unmanaged legacy
`special_day_schedule` overrides — the new period list only shows `schedule_period`-backed
periods, and no automatic conversion of old rows was performed (no safe migration path was
designed for that, and it was out of scope for this correction pass).

### Tests

- `test/schedule-period.test.js` — 35 tests: CRUD (create/list/update name-only/update
  dates/update source/update mode/delete/get-by-id), validation (invalid range, max range, cross-
  family child, foreign-family template, invalid source type, overlap + adjacent-non-overlap
  allowed), composition (merge/replace_sections/replace_day, each proving weekly sections outside
  the period's coverage survive untouched), Special Day independence (wins, survives update AND
  delete, neighboring dates unaffected), overlays — date exclusion under a period for BOTH a
  weekly-sourced item and a period-sourced item, exclusion behaviour under `replace_sections`
  (old weekly item does not resurrect) and `replace_day` (empty result, `base_type` stays
  `special_period`), a populated explicit Special Day ignoring a matching exclusion, exclusion
  behaviour unchanged with no active period, and the once-task boundary — custody (period
  overrides either home's weekly base; correct base returns after delete; no `custody_home_id`
  column exists), empty-special-day fallback (with and without an active period), range-boundary
  safety (day before/after unaffected), concurrency (overlapping creates, non-overlapping
  creates, update-vs-create race, concurrent same-`operation_id` replay), and
  legacy-route-still-loads compatibility.
- `test/schedule-period-routes.test.js` — HTTP integration: create → idempotent replay → list →
  get-by-id → patch (name-only) → overlap-reject (409) → delete → get-after-delete (404) →
  cross-family-deny (403) → missing-source (400) → end-to-end proof over HTTP that a `merge`
  period preserves weekly `morgon` alongside the period's own items.
- `test/schedule-period-frontend.test.js` — 14 source-pattern tests: period list mount +
  render call, create-mode entry point, POST/PATCH routing by `editingPeriodId`, edit loads by id
  (never by re-entered-date matching), delete keys off id + uses the shared confirm modal (never
  bare `confirm()`), no orphan-lookup fallback remains, template source tabs present, all three
  apply modes exposed with Swedish-facing labels only (never the raw backend mode strings) and
  always-visible hints, `merge` default, ≥44px touch targets, no drag-and-drop requirement, and
  legacy `apply-date-range` documented as retained but never called from this module.
- `test/i18n-schedule-surfaces.test.js` and `test/i18n-launch-polish.test.js` — full sv-SE/en-GB
  parity re-verified (one pre-existing glossary-lock assertion for
  `schedule.period.modalTitle` was intentionally updated to the new "New special period" wording,
  since that key's purpose changed from "the one period modal" to "the create-mode title of the
  create/edit modal" — not a terminology drift).
- Migration contract tests (`test/migration-destructive-contract.test.js`,
  `test/migration-files-immutable.test.js`, `test/ops-deploy-snapshot-gate.test.js`,
  `test/migration-rollback-gate.test.js`) green against the revised migration.
- `test/route-inventory.test.js` — snapshot regenerated for the one new `GET .../:periodId`
  route.
- Full Phase 1A/1B/1C regression suites and all custody suites re-run green, unaffected.
- `npm run lint`, `npm run lint:public`, and `npm run check:css` all green. Full `npm run
  test:gate` green (1000/1000 DB-backed tests, plus the full non-DB suite). SW cache bumped to
  `stjarndag-v891`.

### Manual verification

Isolated local test family (no custody), weekly Mon–Fri schedule with `morgon`/`dag`/`kvall`
items, family template with a `kvall`-only item, using the dev server against a local Postgres
instance:

1. Created period "Höstlov" (merge, family template) → calendar showed the period's `kvall` item
   ADDED alongside all three existing weekly items — `morgon`/`dag` untouched.
2. Edited the same period (by id, pre-filled form) to `replace_sections` → `kvall` was fully
   replaced by the period's item, `morgon`/`dag` still untouched.
3. Explicit Special Day created for one date inside the period → that date showed only the
   explicit content; neighboring dates still showed period-composed content.
4. Deleted the period via the "Ta bort"/"Avbryt" confirmation dialog → period removed from the
   list, affected dates (without an explicit override) reverted to normal weekly; the explicit
   Special Day from step 3 survived the deletion.

### Non-goals confirmed untouched

Calendar UI redesign beyond the period list/create/edit/delete surface, Weekly Schedule redesign,
widget/Meta/payment work, market flags, the once-task race, multi-child atomic scheduling, real
Undo, Phase 4 "Visa ▾" chrome cleanup, physical deletion of any legacy endpoint, and full Phase 3
final-precedence-contract locking.

## Phase 3 — resolver precedence contract + response-shape finalization

**Status: PHASE 3 COMPLETE — merged, deployed, and verified.**

- Merged via PR [#1105](https://github.com/pontusburman-papabravo/[REDACTED]-vps/pull/1105) — <!-- pragma: allowlist secret -->
  ("Fas 3 — Lock effective-schedule precedence contract"), final reviewed HEAD
  `eb8c09ce475f99054a7d184df4ad3ca7c68380de` — merge commit
  `60ea7a3bf97351ba4df4dd9f370c11457c25583e` on `main`.
- Deployed to the live app at `main` SHA `60ea7a3bf97351ba4df4dd9f370c11457c25583e`
  (`Deploy to VPS` GitHub Actions run: success; no schema migration — `pending_migrations=0`
  before the deploy's `migrate` step ran, post-migrate snapshot compare reported "no unexpected
  drift").
- Verified: `/health` green (`git_sha` matches the deployed merge commit exactly,
  `cache_version: stjarndag-v891` — unchanged, no static assets touched by Phase 3), clean
  server restart with no startup errors, no schedule/daily-log-related error spike in the
  live-app service journal.
- Live-app smoke test on an isolated, immediately-deleted sandbox family (never touched a real
  customer family), exercising the exact observable backend/runtime behavior
  Phase 3 changed (`resolveEffectiveSchedule()` and `syncDailyLogWithSchedule()`/
  `syncDailyLogForSpecialDay()`): (A) weekly-only mutation reconciles correctly; (B) period
  `merge` — mutating the weekly item updates it, the period item stays untouched, no duplicate
  (the exact scenario the first draft of the daily-log fix got wrong); (C)–(D) `replace_sections`
  / `replace_day` — the replaced/discarded weekly content never resurfaces after a weekly
  mutation; (E) a populated explicit Special Day is untouched by a weekly mutation, sync skips
  with `reason: 'explicit_special_day'`; (F) emptying an explicit Special Day falls through to
  the composed Period+Weekly result instead of leaving the log empty; (G) the generated log for a
  period date with an active exclusion matches `resolveEffectiveSchedule()` exactly; (H) a
  once-task on a period-backed log survives a weekly-triggered sync exactly once. All 8
  scenarios passed on the first run. Test family (and a second, incidentally-created one from an
  unrelated test-script bug in scenario H's seeding, unrelated to product code) fully deleted
  afterward; verified zero families/rows remaining.

Phase 3 characterizes and locks `resolveEffectiveSchedule()`'s existing behavior as a stable,
documented, tested public contract, and fixes two real duplicate-precedence bugs found by
auditing every live-code caller/reader of schedule state. It does **not** redesign Phase 2
semantics — every locked rule below matches what Phase 1A/1B/1C/2 already shipped and verified
in the live app; the only *behavior* changes are the two bug fixes in
"Duplicate-precedence audit", both of which are additive safety guards (they make the code skip
an incorrect action it was previously taking, never introduce a new precedence rule).

### Truth table (required before any code change — characterized against Phase 2's live code
first; all rows passed as-is, confirming the contract below matches shipped behavior)

| # | Weekly | Period | Mode | Special Day | Exclusion | Expected `base_type` | Expected items |
|---|---|---|---|---|---|---|---|
| 1 | A | — | — | — | — | `weekly` | `[A]` |
| 2 | — | — | — | — | — | `none` | `[]` |
| 3 | custody home A | — | — | — | — | `weekly` | home A's items |
| 4 | custody home B | — | — | — | — | `weekly` | home B's items |
| 5 | A | B | `merge` | — | — | `special_period` | `[A, B]` |
| 6 | morgon A, kväll B(old) | kväll C | `replace_sections` | — | — | `special_period` | `[A, C]` |
| 7 | A | B | `replace_day` | — | — | `special_period` | `[B]` |
| 8 | A | — | — | populated `[X]` | — | `special_day` | `[X]` |
| 9 | A | B | any | populated `[X]` | — | `special_day` | `[X]` |
| 10 | A | — | — | empty | — | `weekly` | `[A]` |
| 11 | A | B | `merge` | empty | — | `special_period` | `[A, B]` |
| 12 | A | — | — | — | excl A | `weekly` | `[]` |
| 13 | A | B | `merge` | — | excl B | `special_period` | `[A]` |
| 14 | morgon A, kväll B(old) | kväll C | `replace_sections` | — | excl C | `special_period` | `[A]` (B never resurrected) |
| 15 | A | B | `replace_day` | — | excl B | `special_period` | `[]` (no fallback to weekly) |
| 16 | A | — | — | populated `[X]` | excl X | `special_day` | `[X]` (exclusion ignored) |
| 17 | A | — | — (period ended) | — | — | `weekly` | `[A]` |
| 18 | A | (period deleted) | — | — | — | `weekly` | `[A]` |
| 19 | A | (period deleted) | — | populated `[X]` | — | `special_day` | `[X]` (survives delete) |

All 19 rows plus the merge-duplicate-identity rule, canonical section order, and the once-task
boundary are exercised as automated tests in `test/effective-schedule-truth-table.test.js`
(pass/fail per row, matching this table exactly) — see "Tests" below for the full list.

### Final precedence contract (locked)

```
resolveEffectiveSchedule(childId, dateStr, options?)

1. IF a populated (>=1 item) explicit special_day_schedule row exists for dateStr:
     → return it. base_type = 'special_day'. Weekly and Period are both ignored.
     → schedule_date_exclusion is NOT applied.
2. ELSE IF a schedule_period covers dateStr:
     → resolve custody-aware Weekly Schedule for dateStr
     → compose it with the period's items per apply_mode (merge / replace_sections / replace_day)
     → apply schedule_date_exclusion to the COMPOSED result
     → return it. base_type = 'special_period'.
3. ELSE:
     → resolve custody-aware Weekly Schedule for dateStr
     → apply schedule_date_exclusion to it
     → return it. base_type = 'weekly' (or 'none' if no weekly row exists for dateStr).
```

An empty (0-item) explicit `special_day_schedule` row is **not** step 1's "populated" case — it
falls through to step 2/3 exactly as if it didn't exist. This is a deliberate, locked product
rule (not "show an intentionally empty day" — that would be a distinct future concept, not
introduced here).

### Final response-shape contract (locked)

```
{
  child_id: string,
  date: string,          // YYYY-MM-DD, exactly the dateStr passed in
  day_of_week: number,   // 0-6, computed from dateStr + resolved timezone

  source: {
    base_type: 'none' | 'weekly' | 'special_period' | 'special_day',
    base_id: string | null,
    apply_mode?: 'merge' | 'replace_sections' | 'replace_day',  // present only when base_type === 'special_period'
  },

  items: object[],                          // canonical section order, stable within-section order

  excluded_activity_template_ids: string[], // raw schedule_date_exclusion rows for this date;
                                             // NOT filtered by whether they applied — see below

  metadata: { timezone: string },
}
```

No new fields were added in Phase 3 — the shape was already exactly this since Phase 2's
correction pass; Phase 3 only locks it as the permanent public contract. No caller was found
that special-cases `base_type` to a `special_day`/`weekly`-only set — `test/schedule-period.test.js`
and `test/effective-schedule-truth-table.test.js` exercise `special_period` end to end through
every live-code caller.

### `base_type` semantics (locked)

| `base_type` | `base_id` | `apply_mode` present? | Meaning |
|---|---|---|---|
| `weekly` | `weekly_schedule.id` | no | The custody-aware recurring weekly row is authoritative for this date. |
| `special_period` | `schedule_period.id` | yes | An active Special Period is composed with the weekly base for this date. |
| `special_day` | `special_day_schedule.id` | no | A populated explicit Special Day is the full, unfiltered override for this date. |
| `none` | `null` | no | No weekly row exists for this day-of-week/custody-home and no period/special day applies. |

No ambiguous combinations exist: exactly one `base_type` is returned per call, and `apply_mode`
is present if and only if `base_type === 'special_period'`. `period_id` was deliberately never
introduced as a separate field — `base_id` already means "the period's id" whenever
`base_type === 'special_period'`.

### `excluded_activity_template_ids` semantics

This field always reflects every `schedule_date_exclusion` row that exists for `(childId,
dateStr)`, regardless of whether it currently matches an item in the effective result (e.g. an
exclusion for an activity that isn't in this date's weekly/period set at all still appears here
— it is not filtered to "exclusions that actually removed something"). No caller was found that
depends on a different semantic; kept as-is per "do not introduce fields/behavior changes
without a current caller need."

### Item-level provenance — audited, not added

No current caller needs to know whether an individual item in `items` originated from Weekly or
from the active Period (Calendar's "Ta bort bara idag" always targets an `activity_template_id`
+ date via `schedule_date_exclusion`, which already works correctly regardless of origin — see
the exclusion contract above). Item shape is therefore left unchanged; no provenance field was
added, per "do not over-engineer."

### Custody contract (locked)

Custody determines **only** the Weekly Schedule base (`resolveWeeklyScheduleId()`, called
exclusively from `effective-schedule.js` since Phase 3 — see "Duplicate-precedence audit" below
for why `daily-log-generator.js` no longer imports it directly). Special Period, explicit
Special Day, and date exclusions are all
child/date-scoped, never custody-home-scoped — none of `schedule_period`,
`special_day_schedule`, or `schedule_date_exclusion` has a `custody_home_id` column, and none
should. Conceptually: resolve the custody-correct weekly base first, then apply the child/date
exception layers (period composition, explicit override, exclusions) on top — exactly the
precedence contract above. Both custody variants are exercised in
`test/effective-schedule-truth-table.test.js` ("Row 3/4") and `test/schedule-period.test.js`
("F23/F24").

### Once-task / date-addition boundary (locked, kept as-is)

`resolveEffectiveSchedule()` is a **planning-state resolver only** — it deliberately never
returns once-tasks (`daily_log_item.is_once_task = true`). The stable contract is:

```
effective planning state (resolveEffectiveSchedule)
  +
daily-log-owned once-task overlay (created/read directly against daily_log_item)
  =
execution/day state (what the child/parent actually sees for "today")
```

This boundary is kept exactly as-is in Phase 3 — folding once-task reads into the resolver would
require it to read `daily_log`, risking circular dependencies (the resolver is itself the input
to daily-log generation), regeneration duplication, and history/execution state leaking into a
pure planning-state read. `test/effective-schedule-truth-table.test.js`'s once-task-boundary test
proves both halves: the resolver never surfaces a once-task, and an existing once-task survives
a weekly daily-log sync untouched (never duplicated, never removed).

### Caller inventory (§15 — every reader of schedule state)

| Caller | Purpose | Uses `source`? | Uses `items`? | Reimplements precedence? | Safe? | Action |
|---|---|---|---|---|---|---|
| `daily-log-generator.js` `resolveBaseItemsForLog()` (→ `getOrGenerateDailyLog()`, all first-time daily-log generation) | First-ever generation of a day's log | yes (`base_type` decides `generated_from`) | yes | no — delegates fully | yes | none |
| `daily-log-generator.js` `syncDailyLogWithSchedule()` (15+ call sites: `schedules/apply.js`, `schedules/items.js`, `schedules/templates.js`, `schedules/fill-week.js`, `schedules/child-bulk.js`, `standard-library.js`, `special-day-schedules.js`, `onboarding.js`, `for-dig-activate.js`) | Re-sync an already-generated log, triggered by a WEEKLY mutation | yes (Phase 3 fix) | yes — reconciles the log against `resolveEffectiveSchedule().items` directly, for EVERY `base_type` except a populated `special_day` | no, since Phase 3 fix — canonical effective-items reconciliation, not a weekly-only guarded sync | yes, after fix | fixed (see below) |
| `daily-log-generator.js` `syncDailyLogForSpecialDay()` (`special-day-schedules.js`, `schedules/child-bulk.js`) | Re-sync an already-generated log after a SPECIAL DAY mutation | yes, only for the empty-day fallback case (Phase 3 fix) | yes | no, for the case that mattered — fixed in Phase 3 | yes, after fix | fixed (see below) |
| `daily-log-generator.js` `syncDailyLogsForTemplateChange()` (`activities.js`, `family-images.js`) | Re-sync when an activity_template's name/icon/star_value changes | no (delegates to `syncDailyLogWithSchedule`) | n/a | no | yes, transitively via the fix above | none |
| `daily-log-generator.js` `generateLogsForAllChildren()` (`midnight-scheduler.js`) | Nightly batch generation for all children | no (delegates to `getOrGenerateDailyLog`) | n/a | no | yes | none |
| `custody-handoff-scheduler.js`, `canonical-child-next-activity.js`, `first-star-starter.js`, `children.js`, `family/core.js`, `daily-logs/parent.js`, `daily-logs/child-self.js`, `schedules/child-crud.js` | Various — child dashboard, next-activity, handoff notifications, activation | no | yes | no — all call `getOrGenerateDailyLog()` | yes | none |
| `calendar.js` `GET /calendar-week` | Parent Calendar week grid (`public/calendar.html`) | no | yes, but from its **own independent read**, not the resolver | **yes — genuine duplicate precedence, and it predates/misses Special Period entirely** | **no for un-generated future dates with an active period** | **found, documented, NOT fixed this phase — see below** |
| `authz.js` `getSpecialDayAccess()` | Ownership check only (parent owns this `special_day_schedule` row via child) | no | no | no | yes | none |
| `special-day-schedules.js`, `schedules/child-bulk.js` direct `special_day_schedule` queries | Existence checks before a write (e.g. "does a special day already exist for this date") | no | no | no | yes (write-path only) | none |
| `family/account.js`, `family-export.js` | GDPR account deletion / data export | no | no (bulk delete/export, not "what's effective") | no | yes | none |
| Tests (`effective-schedule*.test.js`, `schedule-period*.test.js`) | Characterization/regression | yes | yes | no | yes | none |

### Duplicate-precedence audit (§16) — findings, decisions, and fixes

**Found and FIXED in this phase (both in `src/lib/daily-log-generator.js`):**

1. **`syncDailyLogWithSchedule()` did not check whether weekly was even the authoritative base
   for the date it was about to sync, AND independently re-derived its desired item set from raw
   `weekly_schedule`/`weekly_schedule_item`/`schedule_date_exclusion` queries rather than the
   canonical resolver.** It is called after a weekly-schedule mutation to keep an
   *already-generated* log fresh, but it blindly injected/updated weekly items into that date's
   log even if a populated explicit Special Day or an active Special Period was actually
   governing that date — silently corrupting a period/special-day-governed log with unrelated
   weekly content, or (in an earlier draft of this same fix) skipping every Special Period date
   entirely and leaving the Weekly *contribution* of a `merge`/`replace_sections` period stale.
   **Final fix:** the desired item set is now **always** `resolveEffectiveSchedule(childId,
   syncDate).items` — the one exception is a populated explicit `special_day`, which is skipped
   outright (`{ synced: false, reason: 'explicit_special_day' }`) because a weekly mutation must
   never rewrite a log that's fully overridden by an explicit Special Day. For every other
   `base_type` (`weekly`, `special_period` under any `apply_mode`, `none`), the function
   reconciles the existing `daily_log_item` rows against `effective.items` using the exact same
   add/remove/update loops it always used — it never re-implements custody, period composition,
   or exclusion filtering itself; `resolveWeeklyScheduleId()` and the direct
   `weekly_schedule_item`/`schedule_date_exclusion` queries were removed as now-dead duplicate
   reads. Classification: B (should delegate) — now fully does, for both the "which base is
   authoritative" question and the "what's the desired item set" question.
2. **`syncDailyLogForSpecialDay()` treated "the special day just became empty" as "clear
   everything from the log,"** instead of the locked contract's "an empty explicit Special Day
   falls through to Period/Weekly." Before the fix, deleting the last item of a special day that
   already had a generated log would incorrectly leave that log empty rather than reverting to
   the period/weekly content that should now be effective. **Fix:** when the special day's item
   set is empty, it now calls `resolveEffectiveSchedule()` for that date and reconciles the log
   against THAT result instead of an empty set. Classification: B (should delegate) — now does
   for the case that mattered; the non-empty case (the day has real content, which per precedence
   always wins outright) is unchanged and does not need to delegate.

**§9 identity audit:** `daily_log_item` has a unique index on `(daily_log_id,
activity_template_id) WHERE activity_template_id IS NOT NULL` — the execution/history layer
intentionally collapses to at most **one row per activity_template_id per log**, regardless of
section/start_time/end_time. This is a pre-existing execution-layer constraint (unchanged by
Phase 3), coarser than the canonical planning-side duplicate-identity rule
(`activity_template_id` + section + start/end time) used inside
`composePeriodWithWeekly()` — which is exactly why that composition step already de-duplicates
to that finer grain BEFORE `syncDailyLogWithSchedule()` ever sees the result. The reconciliation
correctly continues to key on `activity_template_id` alone, matching the storage-layer grain it
has always used; no identity semantics were changed.

Both fixes are proven by dedicated regression tests in
`test/effective-schedule-truth-table.test.js` (tests "A"–"I" plus the canonical-parity test) and
were verified not to regress any of the ~50 existing daily-log tests, all Phase 1A/1B/1C/2
suites, or the custody suites (see "Tests" below).

**Found, classified, and deliberately NOT fixed in this phase — flagged for a future pass:**

3. **`GET /calendar-week` (`src/routes/calendar.js`) independently re-decides special-day vs.
   weekly precedence, and has no awareness of Special Period at all.** Its per-day logic is:
   `daily_log` (if one has been generated) → else `special_day_schedule` (if populated) → else
   the raw custody-aware weekly template. For any date that has **not yet had a daily_log
   generated** (typically a future date, since logs are generated lazily on first
   view/midnight), an active Special Period is silently invisible in the Calendar week grid —
   it falls through to the raw weekly template instead. Once a log IS generated for that date
   (via any of the canonical paths above), the Calendar correctly shows the log's content,
   which already reflects the period. So the gap is specifically: **future/un-visited dates
   inside an active period, viewed via the Calendar week grid before their log exists.**
   Classification: **B (should delegate to `resolveEffectiveSchedule()`)**, but this was **not**
   fixed in Phase 3 because:
   - it lives entirely inside the parent Calendar UI-facing endpoint, which Phase 3 is
     explicitly scoped to leave untouched ("Phase 3 should not change: Calendar UI... unless a
     response-shape bug requires a tiny caller adaptation" — this is a functional gap, not a
     response-shape compatibility issue);
   - a correct fix must also integrate with `calendar.js`'s custody-UI-specific rendering
     (`loadCustodyContext`/`resolveCustodyDateSync`/`templateActivitiesForDay`, which produce
     richer UI metadata — home labels/colors/"isMyDay" banners — than
     `resolveEffectiveSchedule()` returns), making this a real, scoped piece of work rather than
     a one-line swap;
   - this gap predates Phase 3 (it existed the moment Phase 2 shipped Special Period, and was
     already flagged as a known limitation in this doc's Phase 2 section: "already displays
     special-day badges by checking `special_day_schedule` directly (not via
     `resolveEffectiveSchedule()`)") — Phase 3's job was to find and document it precisely, not
     to silently absorb an unbounded UI-adjacent fix into a contract-hardening phase.

   **Recommended follow-up (not started):** teach `calendar.js`'s per-day branch to check for an
   active Special Period (via `loadPeriodForDate`-equivalent or `resolveEffectiveSchedule()`
   itself) for un-generated dates, composing it with the existing custody-aware weekly lookup the
   same way the resolver does, while preserving the custody UI metadata (`custody`/`weekBanner`)
   this endpoint already returns. This is scoped, well-understood, and low-risk to implement —
   but is a Calendar UI-endpoint change and was intentionally left for a dedicated pass rather
   than folded into Phase 3's contract-locking scope.

**Everything else audited (`getSpecialDayAccess()`, legacy `apply-date-range`'s existence checks,
GDPR export/delete) is either category A (legitimate specialized read — authz/bulk-ops, never
answers "what's effective") or D (out of the precedence question entirely) — no changes needed.**

### Error behavior (§22 — hardened)

- **`loadDateExclusions()`** previously swallowed **every** query error (bare `catch`) into "no
  exclusions" — silently turning a real DB failure into an incorrect, over-inclusive schedule.
  `schedule_date_exclusion` is created in `migrate.js`'s core bootstrap (`CREATE TABLE IF NOT
  EXISTS`), which always completes before the app serves requests, so in a healthy deployment
  this table is guaranteed to exist for every live query. Hardened to only swallow Postgres
  `42P01` (`undefined_table`) — the one legitimate "still bootstrapping" case — and rethrow
  everything else.
- **`loadPeriodForDate()`** had no error handling at all (correct — a real query error should
  propagate, not be silently absorbed) but used an arbitrary `LIMIT 1` with no `ORDER BY`. §20
  hardened this to a deterministic `ORDER BY start_date ASC, id ASC`, and added a loud
  `console.error` if more than one candidate row is ever found (which the write-side child-scoped
  advisory-lock overlap invariant should make unreachable) — a live-app data anomaly is now
  visible instead of silently picking an unpredictable row.
- `resolveEffectiveSchedule()`'s unknown-child behavior (`CHILD_NOT_FOUND`) is unchanged from
  Phase 1A.

### Performance (§23 — audited, no changes)

Per date resolved, the query count is bounded and known: 1 (child timezone, skipped if
`options.timezone` is passed) + 1 (special day existence) + up to 1 (special day items, only if
the row exists) + 1 (custody-aware weekly schedule id resolution — itself a small bounded number
of queries inside `resolveWeeklyScheduleId()`, unchanged since Phase 1A/1B) + 1 (weekly items,
only if a schedule id was found) + 1 (date exclusions) + 1 (period existence) + up to 1 (period
items, only if a period covers the date) — no N+1 loop inside a single date resolution. Batch
callers (`generateLogsForAllChildren()`) already call this once per child per date sequentially,
which is the existing, accepted cost model since Phase 1A — no caching was added, per "do not
build caching unless measured need exists."

### Migration / backward compatibility (§21)

**No new migration.** Phase 3 is read-contract hardening, caller-fix, tests, and docs only — the
two `daily-log-generator.js` fixes add a read-only guard call and a fallback read, no schema
change.

### Static assets / cache (§37)

**No SW cache bump.** No `public/` files were touched — this phase is backend (`src/lib/`)
plus tests plus docs only.

### Tests

- `test/effective-schedule-truth-table.test.js` (25 sub-tests): all 19 truth-table rows,
  merge-duplicate-identity, canonical section order, the once-task boundary, the
  `syncDailyLogForSpecialDay()` empty-day-fallback regression, a `getOrGenerateDailyLog()`
  first-generation parity check, and the full required `syncDailyLogWithSchedule()` regression
  matrix (A–I) plus a canonical-parity test across weekly/merge/replace_sections/replace_day:
  - **A** weekly-only mutation still syncs correctly (pre-existing behavior preserved).
  - **B** period `merge` — mutating the weekly item updates it, the period item is untouched,
    no duplicate, nothing lost (the exact case the first draft of this fix got wrong).
  - **C** period `merge` — removing the weekly item removes it from the log (if not completed),
    period content preserved.
  - **D** `replace_sections` — mutating/removing the (already-replaced) weekly item never
    resurrects it; mutating the untouched section updates normally.
  - **E** `replace_day` — mutating the discarded weekly item never injects it into the log.
  - **F** an excluded period item is never re-added by a weekly-triggered sync.
  - **G** a populated explicit Special Day is untouched by a weekly mutation; sync skips with
    `reason: 'explicit_special_day'`.
  - **H** custody + period — generated log matches `resolveEffectiveSchedule()` exactly; a
    weekly mutation to the currently-effective custody home updates correctly, period content
    preserved.
  - **I** a once-task on a period-backed log survives a weekly-triggered sync exactly once.
  - **Canonical parity** — for weekly/merge/replace_sections/replace_day, the post-sync
    non-once-task daily-log items match `resolveEffectiveSchedule().items` exactly.
- `test/custody-feat1b.test.js` and `test/custody-schedule-resolve.test.js` updated: both
  previously asserted `daily-log-generator.js` directly imports `resolveWeeklyScheduleId()`
  (true before this fix); now assert it delegates custody-aware resolution to
  `resolveEffectiveSchedule()` instead, and no longer imports `resolveWeeklyScheduleId()`
  directly (the direct import/queries were dead duplicate reads, removed per §8).
- Full existing suites re-run green and unaffected: `test/effective-schedule.test.js`,
  `test/schedule-period.test.js`, `test/schedule-period-routes.test.js`,
  `test/schedule-period-frontend.test.js`, `test/daily-log-generator.test.js`,
  `test/daily-log-sync-once-task.test.js`, `test/daily-log-race-contract.test.js`,
  `test/custody-daily-log-resilience.test.js`, `test/child-daily-log-order*.test.js`,
  `test/daily-log-child-order.test.js`, `test/daily-log-reorder.test.js`,
  `test/daily-log-nav-fix.test.js`, `test/daily-logs-authz-contract.test.js`, all Phase
  1A/1B/1C suites (`schedule-apply*.test.js`, `schedule-custody.test.js`,
  `schedule-phase1c-retirement.test.js`), all custody suites (109 tests), and the i18n parity
  suites.
- `npm run lint`, `npm run lint:public`, `npm run check:css` all green (no diff produced by
  `check:css` — confirms no static asset drift). Full `npm run test:gate` green.

### Non-goals confirmed untouched

Weekly Schedule UI, Calendar UI (the one genuine gap found is documented above, not fixed),
Specialperiod UI, Library UI, Planering hub — no visual redesign. No new migration. No i18n
changes (no new user-facing strings). Widget/Meta/payment/RevenueCat/market flags, Android/iOS
release flows, real Undo, multi-child atomic scheduling, the once-task race, physical deletion
of legacy endpoints, Weekly Schedule redesign, and Phase 4 chrome — all untouched, per the
explicit out-of-scope list.

### Phase 4 boundary

Phase 4 owns final product/IA polish: `Visa ▾`, advanced controls, navigation cleanup, potential
Daily Log relocation, PDF placement, remaining visual simplification, accessibility/chrome
polish — **plus, as newly surfaced by this phase's caller audit, the Calendar week-grid Special
Period awareness gap documented above**, which is now a concrete, scoped, well-understood item
ready to be picked up whenever Calendar-adjacent work is next in scope.

## Phase 4 — final Planning IA + Calendar coherence + UX polish

**Status: PHASE 4 READY FOR MERGE** (PR #1106 — draft, not merged, not deployed).

Phase 4 is the final Planering phase: information architecture, navigation, Calendar coherence,
progressive disclosure, and legacy-chrome demotion. The backend/domain model is stable as of
Phase 3 — this phase introduces **no new scheduling architecture, no new resolver, no new
migration**.

Locked product model (unchanged, restated for this phase):

```
Planera vardagen
  Veckoschema  = hur vardagen brukar se ut
  Kalender     = specialdagar, lov och andra avvikelser
  Boendeschema = växelvis boende (conditional — only shown when custody is active)

Bygg innehåll
  Bibliotek    = aktiviteter, bilder och belöningar
```

### Calendar canonical integration (the Phase 3-documented critical gap — closed)

`GET /api/children/:childId/calendar-week` (`src/routes/calendar.js`) independently re-decided
special-day-vs-weekly precedence for any date without a generated `daily_log`, with **no Special
Period awareness at all** — an active period was invisible in the Calendar week grid until its
first `daily_log` was generated for that date.

**Fix:** added `resolveEffectiveScheduleRange(childId, fromDateStr, toDateStr, options?)` to
`src/lib/effective-schedule.js` — a thin wrapper that calls `resolveEffectiveSchedule()` once
per date in the range. It introduces **no second precedence implementation**: verified by a
dedicated test asserting the range helper never calls the resolver's internal primitives
(`loadWeeklyItems`/`loadPeriodForDate`/`loadSpecialDayItems`/`composePeriodWithWeekly`)
directly, only the public `resolveEffectiveSchedule()`.

`calendar.js`'s per-day activity list now **always** uses the canonical range result for **every**
date — with or without a generated `daily_log`. The old direct `weekly_schedule`/
`weekly_schedule_item` query + custody `week_variant`/`custody_home_id` template grouping +
`templateActivitiesForDay()` lookup is **removed entirely** (no dead code left behind). When a
`daily_log` exists, it supplies an **execution-metadata overlay only** (completion status,
day-level `isPaused`, and additive once-tasks) — never the planning item list itself.

**Custody UI metadata is completely unchanged and confirmed consistent.** `calendar.js`'s own
custody banner metadata (home label/color/handoff state) still comes from
`loadCustodyContext()`/`resolveCustodyDateSync()` (`src/lib/custody-schedule-engine/`) — this
was deliberately kept, per the task's explicit instruction not to break custody rendering.
Verified there is no risk of the banner and the shown activities disagreeing about which custody
home is active: `custody-schedule-resolve.js`'s `resolveWeeklyScheduleId()` (used inside
`resolveEffectiveSchedule()`) itself delegates to the exact same `custody-schedule-engine`
`loadCustodyContext()`/`resolveCustodyDateSync()` primitives calendar.js calls directly — they
are two entry points into one underlying system, not two competing ones.

**Query cost:** 7 `resolveEffectiveSchedule()` calls (one per visible day) replace what was 1
bulk query, for a page-view-frequency endpoint (a parent opening the Calendar page, not a
polled/hot path). Accepted per the Phase 3 performance-audit precedent — no caching or a
richer batch-query helper was built ahead of a measured need; `resolveEffectiveScheduleRange()`
is intentionally the described "Option A wrapped as Option B" (bounded per-date calls behind one
clean call site), not a genuinely batched query.

**Calendar now correctly displays, before any `daily_log` exists for the date:** weekly-only,
custody-aware weekly (home A/B), Special Period `merge`/`replace_sections`/`replace_day`,
explicit Special Day over an active period, empty-Special-Day fallthrough, and date exclusions
under a period — see `test/calendar-week-canonical.test.js`.

### Weekly Schedule chrome classification

Audited every control in the Weekly Schedule editor toolbar (`#calNavBar` + `#viewModeBar` in
`public/schedule.html`):

| Control | Classification | Outcome |
|---|---|---|
| `📋 Schema` (default view) | PRIMARY | kept inline |
| `➕ Lägg till` (canonical mutation entry) | PRIMARY | kept inline, unchanged (Phase 1B) |
| Dag / Vecka / Månad (`#calNavBar` segmented toggle) | SECONDARY | **kept inline** — already a compact 3-button segmented control, not sprawling "control room" clutter; not touched this phase |
| `📝 Listläge` | ADVANCED | moved under `Visa ▾` |
| `⏱ Tidsvy` | ADVANCED | moved under `Visa ▾` |
| `👥 Jämför barn` | ADVANCED | moved under `Visa ▾` |
| `🌟 Specialdagar` | ADVANCED / legacy path | moved under `Visa ▾` — no longer a competing always-visible schedule mode now that Kalender has full Special Period parity (see above) |
| `📄 Skapa PDF` | ADVANCED / export | moved under `Visa ▾` |
| `📆 Fyll vecka` | REMOVE/RELOCATE | **already done in Phase 1C** — remains an invisible state marker; unchanged this phase |
| Day-row `⋯ Fler alternativ` (Kopiera till veckor/barn) | ADVANCED | **already done in Phase 1C** — unchanged this phase |
| Drag-to-copy hint | SECONDARY | **demoted** — removed from the always-visible view-mode toolbar and the day-editor subtitle; the contextual day-tab selector hint (`schedule.chrome.daySelectorHint`) remains the sole drag guidance. Drag/drop itself is unchanged and optional. |

**Implementation:** the always-visible view-mode bar (previously 5 pills + a PDF link, all
inline) now shows only `📋 Schema` and a `Visa ▾` disclosure trigger. The four advanced view
modes plus the PDF link are inside the disclosure, reusing the **exact same** `<details>`/
`<summary>` pattern already established for the day row's `⋯ Fler alternativ` menu (Phase 1C) —
no new UI component was introduced, and no functional change was made to what any button does
(only where it lives in the DOM). All moved controls keep `min-h-[44px]` touch targets.

### Month view vs Kalender — audited, kept distinct

Weekly Schedule's `Månad` mode (`#calNavBar` → `btnViewMonth`) is a lightweight, edit-oriented
navigation aid: a month grid with dots marking which weekdays have recurring template content,
used to jump into the week editor for a given weekday. `/calendar` (Kalender) is the
read-oriented, resolved week view with actual planning content and special-day badges. These
serve genuinely distinct jobs (edit-navigation vs. read/exception surface) and were **not**
merged or removed this phase — the overlap is conceptual naming similarity ("month"/"calendar"),
not duplicated functionality, and resolving that naming overlap without misleading users about
which one edits vs. which one shows exceptions was judged lower-value than the Calendar
canonical-integration fix and chrome disclosure work actually completed. Left for a future pass
if product research confirms parents find the naming confusing in practice.

### Specialdagar placement

The Specialdagar view mode inside Weekly Schedule remains functionally available (demoted, not
deleted — see chrome classification table above) because it is still the only UI that hosts the
Specialperioder list/create/edit/delete surface (Phase 2). Migrating that CRUD surface itself to
live on the Kalender page is a larger, separately-scoped UI relocation (a real host-page move,
not a visibility/ordering change) and was intentionally not attempted in this pass — Calendar's
job in Phase 4 was to correctly **display** the resolved plan (done, see above), not to become
the new host for period/special-day management. Demoting the tab under `Visa ▾` already removes
it as a competing always-visible primary schedule mode, which was the concrete ask.

### Daily Log placement — audited, unchanged

Already correctly demoted: `Daglig logg` lives in the Planering hub's "Övrigt" (other) section,
not "Planera vardagen". It is more prominently reachable from Hem (dashbord) via a "📝 Fyll i i
efterhand" CTA — that is a dashboard/Hem IA decision, out of this phase's Planering-hub scope,
and was not touched.

### PDF placement — audited, unchanged

Already correctly secondary everywhere: "Skapa PDF — schema" lives in Planering's "Övrigt"
section (not primary), and within Weekly Schedule the PDF link is now inside the `Visa ▾`
disclosure (see chrome classification above) rather than an inline toolbar item. The dedicated
`/print-schema` page's own primary "Skapa PDF" button remains gold — that page's entire job is
producing a PDF, so a primary CTA there is correct and was not touched.

### Library (Bibliotek) CTA hierarchy

Audited every CTA on `/library`. Found one genuine gap: the **standard-library** schedule
application button (`openScheduleCopyDialog()`, "Kopiera till barn" on a global template card in
`public/js/library-standard.js`) was still a primary gold CTA — the equivalent **family**-
template button was already demoted to a secondary/outline style in Phase 1C
(`public/js/library-schema.js`), but this one was missed. **Fixed**: demoted to the identical
secondary/outline style (`bg-white border-2 border-lavender`), for the identical reason —
recurring-schedule application now primarily happens from Weekly Schedule's `+ Lägg till → Från
mall`, which offers `merge`/`replace_sections`/`replace_day` and custody scoping this dialog
lacks.

Activity-level content actions (`copyStandardActivity()`/`copyAllStandardActivities()` — adding
a standard activity into the family's own activity library) were deliberately **left primary
gold**: they are content management (Bibliotek's actual job — bringing library content into your
family), not schedule mutation, so they correctly stay visually prominent.

### Planering hub IA — audited, already matches the locked model

The Planering hub (`public/js/planning-hub.js`) was already correctly organized from prior
phases: `Veckoschema`/`Kalender` (and `Boendeschema`, conditionally, only when the family has
custody active) under "Planera vardagen"; `Bibliotek`/`Bildarkiv` under "Bygg innehåll";
`Daglig logg`/`Skapa PDF — schema`/`Tilldela schema` demoted into "Övrigt". No `Fyll vecka` entry
exists on the hub. No changes were needed — this is now locked with regression tests
(`test/phase4-planning-ia.test.js`) rather than left informally correct.

### Custody Calendar metadata — preserved

Confirmed via both the source-pattern test suite and manual verification (two-home custody
family, both a merge-period date and a non-period date) that the Calendar's custody home
label/color/handoff banner rendering is byte-for-byte unchanged by this phase's canonical
integration — only which activities are listed for a no-log-yet date changed, never how custody
is displayed.

### Mobile (375px) and accessibility

Manually verified at 375px width: Planering hub cards stack in a single column with no
horizontal overflow; the Weekly Schedule toolbar's `📋 Schema` / `Visa ▾` / `➕ Lägg till` group
fits without overflow and the `Visa ▾` dropdown stays within the viewport; the Calendar week view
remains usable (day columns stack, consistent with its existing pre-Phase-4 mobile behaviour —
not newly introduced or regressed by this phase). All moved/added controls use `min-h-[44px]`
touch targets. No critical action in this phase's changes requires drag-and-drop. No new
icon-only controls were introduced without a label (`Visa ▾` has a visible text label, unlike a
bare icon button).

### No new domain work (confirmed)

No new resolver, no new schedule source type, no new period model, no new custody semantics, no
new date-override concept, no schema migration. The only backend change this phase is the
purely-additive, zero-precedence-duplicating `resolveEffectiveScheduleRange()` wrapper.

### Legacy endpoints

No endpoint was physically deleted. `calendar.js`'s old direct-query code path was removed
because it was **dead application code being replaced by its correct canonical equivalent
within the same file** (a duplicate-precedence bug fix, following the exact same "don't leave
dead precedence logic behind" principle Phase 3 already applied to
`daily-log-generator.js`) — this is different from, and not a violation of, "do not physically
delete legacy *endpoints*": no route, no backend compatibility surface, and no other file's
behavior changed.

### Static assets / cache

SW cache bumped to `stjarndag-v895` — `public/calendar.html` (bridge link moved inside
`#calendarUI` so parent-magic chrome cannot hide it), `public/schedule.html` (drag-hint
demotion), `public/js/schedule.js`. No CSS source changes were needed (`check:css` reported no
diff beyond the cache-version comment).

### Tests

- `test/calendar-week-canonical.test.js` (new, 5 HTTP integration tests): the full Calendar
  matrix — weekly-only, custody A/B, custody+period+log overlay, period
  `merge`/`replace_sections`/`replace_day`, explicit Special Day over an active period,
  empty-Special-Day fallthrough, date exclusion under a period, plan/execution separation with
  stale-log guards, and once-task additive overlay — verified for both no-log and has-log dates.
- `test/custody-calendar.test.js` (rewritten): old source-pattern assertions characterizing the
  removed template-lookup implementation replaced with assertions for the new canonical-
  delegation architecture (`resolveEffectiveScheduleRange`, no
  `templateActivitiesForDay`/`templatesByVariant`/`templatesByHome`/direct `weekly_schedule`
  query); custody UI metadata preservation reconfirmed.
- `test/phase4-planning-ia.test.js` (new, 16 tests): Weekly Schedule chrome disclosure
  (advanced views under `Visa ▾`, exactly one primary add action, no duplicate mutation entry,
  touch targets), Library CTA hierarchy (standard-library demotion, family-template demotion
  regression, activity-level actions correctly still gold), and Planering hub IA (plan/content/
  other section membership, conditional Boendeschema, no `Fyll vecka`, no new top-level
  sections).
- `test/schedule-phase1c-retirement.test.js`: the toolbar-slice boundary in "A1" updated for the
  new nested `<details>` markup (the assertions themselves — no visible `Fyll vecka`, invisible
  state marker preserved — are unchanged).
- Full existing suites re-run green: all custody suites (109), effective-schedule/schedule-
  period suites (76+), all Phase 1A/1B/1C suites, i18n parity suites, hardcoded-Swedish audit,
  `lint`, `lint:public`, `check:css`. Full `npm run test:gate` green (1003/1003).

### Manual verification

Isolated local test family (no custody), weekly Mon–Fri schedule, family template with one
`kvall` item, plus a Special Period on a future date created directly via
`createSchedulePeriod()` **without ever visiting that date in the child dashboard** (so no
`daily_log` existed for it):

1. Planering hub shows the three expected sections with the expected cards.
2. Calendar, navigated forward to the period's date (never visited before): shows all four
   activities (three weekly + the period's) — proving the canonical integration works with zero
   `daily_log` dependency.
3. Weekly Schedule toolbar shows only `📋 Schema` / `Visa ▾` / `➕ Lägg till` inline.
4. `Visa ▾` opens a dropdown with Listläge/Tidsvy/Jämför barn/Specialdagar(/Skapa PDF);
   selecting Specialdagar correctly switches views and shows the created period in the
   Specialperioder list.
5. Library standard-schedule CTA styling — **not verified manually** (this local environment's
   global standard library is empty, a pre-existing, documented environment limitation — see
   AGENTS.md "Known caveats"); confirmed instead via the source-pattern test in item 5 above.
6. 375px: Planering hub, Weekly Schedule toolbar, and Calendar all verified usable with no
   horizontal overflow.
7. No JavaScript console errors observed (only pre-existing, unrelated CSP report-only warnings
   and 403/503 responses from unrelated analytics/journey-context endpoints).

Test family fully deleted afterward.

### Non-goals confirmed untouched (Phase 4)

Widget, Meta, payments, RevenueCat, market flags, Android/iOS release flow, real Undo, multi-
child atomicity, the once-task race, unrelated auth, growth automation, Weekly Schedule redesign
beyond the chrome disclosure described above, Daily Log functionality redesign, PDF removal,
Calendar visual redesign beyond the canonical-data fix, and the Month-view/Kalender naming
overlap (documented, not resolved).

### Calendar plan/execution separation (final Phase 4 contract)

Locked composition for every Calendar date:

```
canonical effective planning items   (resolveEffectiveScheduleRange)
+ completion/status overlay          (daily_log_item by activity_template_id, non-once-task only)
+ additive once-tasks                (daily_log_item where is_once_task = true)
+ day-level isPaused                 (daily_log.is_paused)
=
Calendar presentation
```

**Planning authority:** `resolveEffectiveSchedule()` / `resolveEffectiveScheduleRange()` — always,
for every date, regardless of whether a `daily_log` exists. If weekly/period/special-day
planning changes after a log was generated, Calendar immediately shows the **new** plan.

**Execution authority:** `daily_log` / `daily_log_item` — completion overlay and once-tasks only.
A stale log item for a removed/replaced planning slot **never** resurrects or replaces the current
plan. If no canonical plan exists (`base_type = none`), a stale non-once log item is **not**
treated as current planning.

**Completion overlay grain:** match by `activity_template_id` on non-once-task log rows only.
Once-task rows are excluded from the completion map (they can share an `activity_template_id`
with a recurring item). If no matching log row exists, `completed` stays `null` on the canonical
item (or `false` when the item was included in an earlier log generation — existing
`getOrGenerateDailyLog` behaviour).

**Once-task decision:** **preserved as additive execution-only items** appended after canonical
planned items (`source: 'once_task'`). They never influence `base_type` or resolver output.

**Stale removed items:** **not shown** on any date — Calendar is "planning with completion
indicators", not a full execution-history view. Full history remains in Daglig logg.

**Special Day badge:** `isSpecialDay` / `specialDayNote` reflect row existence (parent's note).
`isSpecialDayActive` is true only when the resolver used a **populated** explicit Special Day as
the planning base — an empty Special Day row does **not** get the active-override badge.

**Activity `source` field:** describes **planning origin** (`template`, `special_period`,
`special_day`, `once_task`) — not "this row came from daily_log". The legacy `source: 'log'`
value is **removed** from Calendar responses.

**Special Period presentation:** day-level `base_type` from the resolver drives exception
styling; parents see product language ("avvikelse"/note), never internal terms like
`merge`/`replace_sections`.
