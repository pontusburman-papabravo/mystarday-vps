# Schedule domain — canonical command/query architecture (Phase 1A)

**Status: PHASE 1A COMPLETE — merged, deployed, and verified.**

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

## Phase 1B — status: BACKEND + FRONTEND + CUSTODY HARDENING COMPLETE (this pass), Phase 1C retires legacy paths

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
