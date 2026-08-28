'use strict';

/**
 * Canonical Special Period command service — Phase 2 (revised after architecture review).
 *
 * Special Period is a first-class domain entity (`schedule_period`). Its resolved source
 * items are stored ONCE per period, in `schedule_period_item` — every date in
 * [start_date, end_date] shares the identical item set, so there is no per-date materialization
 * step and nothing written into `special_day_schedule` at all. `resolveEffectiveSchedule()`
 * (src/lib/effective-schedule.js) composes a period with the custody-aware weekly base at READ
 * time, according to `apply_mode` (merge / replace_sections / replace_day) — see that file's
 * `composePeriodWithWeekly()`. This is the design correction from the first draft, which wrote
 * one `special_day_schedule` row per date and represented a period to the resolver as an opaque
 * full-day override; that broke merge/replace_sections (a period covering only "kväll" would
 * have erased "morgon"/"dag") and made an explicit Special Day and a period-generated day share
 * the same row, so deleting a period could delete a parent's explicit override.
 *
 * Because a period never touches `special_day_schedule`, an explicit Special Day is always a
 * genuinely separate row in a genuinely separate table — there is nothing to "detach": the two
 * concepts were never the same row to begin with. `resolveEffectiveSchedule()`'s precedence
 * (explicit Special Day > Special Period > custody-aware Weekly) already makes an explicit
 * override win for that one date without this service doing anything special, and
 * `deleteSchedulePeriod()` can never delete an explicit Special Day because it only ever
 * touches `schedule_period`/`schedule_period_item`.
 *
 * Reuses (does not duplicate) canonical Phase 1A/1B logic:
 *   - resolveScheduleSource() — same family_template/standard_schedule resolution
 *     applyScheduleSourceToChildPlan() already uses. activity_category is intentionally NOT a
 *     period source (Phase 2 non-goal).
 *   - runIdempotentScheduleCommand() — same transaction/advisory-lock/fingerprint/family-check
 *     skeleton every Phase 1A/1B command uses (custodyHomeId is always null here — see
 *     "Custody" below — so its custody-resolution step is a guaranteed no-op).
 *   - duplicateKey()/normalizeSection() — same merge/duplicate-identity rule as weekly apply.
 *
 * Custody decision (see docs/schedule-canonical-architecture.md "Phase 2 — custody"): a period
 * is NOT custody-home-scoped, matching the existing, unmodified `special_day_schedule` /
 * `schedule_date_exclusion` semantics — a date-specific exception follows the child+date and
 * overrides whichever custody home would otherwise be effective on that date.
 *
 * Overlap invariant (Blocker 3): forbidding overlapping periods for the same child is enforced
 * with a CHILD-SCOPED transaction advisory lock (`acquirePeriodChildLock()`) taken BEFORE the
 * overlap SELECT, for every create/update/delete — not just the operation_id idempotency lock
 * `runIdempotentScheduleCommand()` already takes (which only serializes retries of the SAME
 * logical command, not two different concurrent commands for the same child). This makes the
 * overlap check a real invariant: two concurrent creates for the same child are now strictly
 * ordered by Postgres, so only one can ever see the range as free.
 */

const db = require('./db');
const { normalizeSection } = require('./schedule-sections');
const {
  ScheduleApplyError,
  SOURCE_TYPES,
  APPLY_MODES,
  resolveScheduleSource,
  runIdempotentScheduleCommand,
  assertChildBelongsToFamily,
} = require('./schedule-apply');

const MAX_PERIOD_DAYS = 93; // same bound as the legacy apply-date-range route (child-bulk.js)
const PERIOD_LOCK_NAMESPACE = 'schedule_period_child';

function assertValidMode(mode) {
  if (!APPLY_MODES.includes(mode)) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, `Ogiltigt läge: ${mode}`);
  }
}

function assertValidSourceType(sourceType) {
  if (!SOURCE_TYPES.includes(sourceType)) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, `Ogiltig källtyp: ${sourceType}`);
  }
}

function isValidDateStr(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Inclusive day-count from start to end (UTC-noon anchored to avoid DST edge issues) — used
 * only for the MAX_PERIOD_DAYS bound; the period is stored as start/end, never expanded into a
 * date list (there is no per-date materialization to expand into any more). */
function inclusiveDayCount(startStr, endStr) {
  const start = new Date(`${startStr}T12:00:00Z`);
  const end = new Date(`${endStr}T12:00:00Z`);
  return Math.round((end - start) / 86400000) + 1;
}

function assertValidDateRange(startDate, endDate) {
  if (!isValidDateStr(startDate) || !isValidDateStr(endDate)) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'start_date/end_date krävs (YYYY-MM-DD)');
  }
  if (endDate < startDate) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'end_date måste vara samma dag som eller efter start_date');
  }
  const dayCount = inclusiveDayCount(startDate, endDate);
  if (dayCount > MAX_PERIOD_DAYS) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, `Max ${MAX_PERIOD_DAYS} dagar per specialperiod`);
  }
}

/**
 * §Blocker 3 — a transaction-scoped Postgres advisory lock keyed on (namespace, childId) ONLY
 * (never on operationId — that is a different, narrower lock `runIdempotentScheduleCommand`
 * already takes for idempotent-retry serialization). Every create/update/delete for a given
 * child is strictly ordered by this lock before the overlap SELECT runs, so two concurrent
 * commands with two DIFFERENT operation_ids can no longer both observe the range as free.
 */
async function acquirePeriodChildLock(client, childId) {
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, [PERIOD_LOCK_NAMESPACE, childId]);
}

/**
 * Deterministic overlap validation, no hidden precedence. Must be called AFTER
 * acquirePeriodChildLock() in the same transaction for the guarantee above to hold.
 */
async function assertNoOverlap(client, { childId, startDate, endDate, excludePeriodId = null }) {
  const params = [childId, startDate, endDate];
  let sql = `
    SELECT id, name, start_date::text AS start_date, end_date::text AS end_date
    FROM schedule_period
    WHERE child_id = $1 AND start_date <= $3 AND end_date >= $2
  `;
  if (excludePeriodId) {
    params.push(excludePeriodId);
    sql += ` AND id != $4`;
  }
  const overlap = await client.query(sql, params);
  if (overlap.rows.length > 0) {
    throw new ScheduleApplyError(
      'PERIOD_OVERLAP', 409,
      `Perioden överlappar med en befintlig period: "${overlap.rows[0].name}"`,
      { conflicting_period_id: overlap.rows[0].id }
    );
  }
}

async function insertPeriodItems(client, periodId, items) {
  let count = 0;
  for (const item of items) {
    await client.query(
      `INSERT INTO schedule_period_item
         (period_id, activity_template_id, name, icon, start_time, end_time, star_value, sort_order, section)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        periodId, item.activity_template_id, item.name || 'Aktivitet', item.icon || '⭐',
        item.start_time || null, item.end_time || null, item.star_value || 1,
        item.sort_order || 0, normalizeSection(item.section),
      ]
    );
    count++;
  }
  return count;
}

/**
 * Create a Special Period: validates the date range, takes the child-scoped advisory lock,
 * rejects overlap with an existing period for the same child, resolves the reusable source
 * (family_template/standard_schedule — same resolver every other canonical command uses),
 * inserts the `schedule_period` row, then stores its resolved item set ONCE in
 * `schedule_period_item`. One transaction.
 *
 * @param {object} params
 * @param {string} params.familyId
 * @param {string} params.childId
 * @param {string} params.name
 * @param {string} params.startDate — 'YYYY-MM-DD'
 * @param {string} params.endDate — 'YYYY-MM-DD'
 * @param {'family_template'|'standard_schedule'} params.sourceType
 * @param {string} params.sourceId
 * @param {'merge'|'replace_sections'|'replace_day'} [params.applyMode] — defaults to 'merge',
 *   the SAME safe default every other Phase 1B/1C canonical command uses. The legacy
 *   apply-date-range route this replaces always overwrote the day, but inheriting that
 *   destructive default blindly would make Special Period the one canonical command in the
 *   whole domain that silently defaults to a destructive write — the UI presents an explicit
 *   mode picker (Lägg till / Ersätt berörda delar / Ersätt hela dagen) exactly like every other
 *   canonical flow, with the same confirmation step before `replace_day`.
 * @param {string} [params.operationId]
 * @param {string} [params.locale]
 * @param {object|null} [params.variants]
 * @param {object|null} [params.optionalSelections]
 */
async function createSchedulePeriod(params) {
  const {
    familyId, childId, name, startDate, endDate, sourceType, sourceId,
    applyMode = 'merge', operationId = null, locale = 'sv-SE', variants = null, optionalSelections = null,
  } = params;

  if (!familyId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'familyId krävs');
  if (!childId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'childId krävs');
  if (!name || !String(name).trim()) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'Periodens namn krävs');
  assertValidSourceType(sourceType);
  assertValidMode(applyMode);
  assertValidDateRange(startDate, endDate);

  return runIdempotentScheduleCommand({
    familyId,
    childId,
    operationId,
    fingerprintPayload: {
      command: 'create_schedule_period', familyId, childId, name: name.trim(), startDate, endDate,
      sourceType, sourceId, applyMode, locale, variants, optionalSelections,
    },
    execute: async (client) => {
      await acquirePeriodChildLock(client, childId);
      await assertNoOverlap(client, { childId, startDate, endDate });

      const { items: sourceItems, sourceMeta } = await resolveScheduleSource(client, {
        familyId, sourceType, sourceId, locale, variants, optionalSelections,
      });
      if (sourceItems.length === 0) {
        throw new ScheduleApplyError('EMPTY_SOURCE', 400, 'Källan innehöll inga aktiviteter — inget tillämpat.');
      }

      const periodRes = await client.query(
        `INSERT INTO schedule_period (family_id, child_id, name, start_date, end_date, source_type, source_id, apply_mode)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, name, start_date::text AS start_date, end_date::text AS end_date, source_type, source_id, apply_mode, created_at`,
        [familyId, childId, name.trim(), startDate, endDate, sourceType, sourceId, applyMode]
      );
      const period = periodRes.rows[0];
      const itemsAdded = await insertPeriodItems(client, period.id, sourceItems);

      return {
        period_id: period.id,
        name: period.name,
        start_date: period.start_date,
        end_date: period.end_date,
        source: sourceMeta,
        apply_mode: period.apply_mode,
        items_added: itemsAdded,
      };
    },
  });
}

/**
 * Update a Special Period. `name` is pure metadata (never touches item storage). Any of
 * start_date/end_date/source_type/source_id/apply_mode changing means the stored item set no
 * longer reflects the period's definition, so it is atomically replaced (delete + re-insert)
 * inside the SAME transaction as the schedule_period UPDATE — never a partial/hidden merge of
 * old and new content. Explicit Special Days for any date (inside or outside the new range)
 * are completely unaffected — this function never touches special_day_schedule.
 */
async function updateSchedulePeriod(params) {
  const {
    familyId, childId, periodId, name, startDate, endDate, sourceType, sourceId, applyMode,
    operationId = null, locale = 'sv-SE', variants = null, optionalSelections = null,
  } = params;

  if (!familyId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'familyId krävs');
  if (!childId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'childId krävs');
  if (!periodId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'periodId krävs');

  return runIdempotentScheduleCommand({
    familyId,
    childId,
    operationId,
    fingerprintPayload: {
      command: 'update_schedule_period', familyId, childId, periodId, name, startDate, endDate,
      sourceType, sourceId, applyMode, locale, variants, optionalSelections,
    },
    execute: async (client) => {
      await acquirePeriodChildLock(client, childId);

      const existing = await client.query(
        `SELECT id, family_id, child_id, name, start_date::text AS start_date, end_date::text AS end_date,
                source_type, source_id, apply_mode
         FROM schedule_period WHERE id = $1`,
        [periodId]
      );
      if (existing.rows.length === 0 || existing.rows[0].family_id !== familyId || existing.rows[0].child_id !== childId) {
        throw new ScheduleApplyError('PERIOD_NOT_FOUND', 404, 'Perioden hittades inte');
      }
      const current = existing.rows[0];

      const nextName = name !== undefined ? String(name).trim() : current.name;
      if (!nextName) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'Periodens namn krävs');
      const nextStart = startDate !== undefined ? startDate : current.start_date;
      const nextEnd = endDate !== undefined ? endDate : current.end_date;
      const nextSourceType = sourceType !== undefined ? sourceType : current.source_type;
      const nextSourceId = sourceId !== undefined ? sourceId : current.source_id;
      const nextApplyMode = applyMode !== undefined ? applyMode : current.apply_mode;
      assertValidSourceType(nextSourceType);
      assertValidMode(nextApplyMode);
      assertValidDateRange(nextStart, nextEnd);

      const contentChanged = nextStart !== current.start_date || nextEnd !== current.end_date
        || nextSourceType !== current.source_type || nextSourceId !== current.source_id
        || nextApplyMode !== current.apply_mode;

      if (contentChanged && (nextStart !== current.start_date || nextEnd !== current.end_date)) {
        await assertNoOverlap(client, { childId, startDate: nextStart, endDate: nextEnd, excludePeriodId: periodId });
      }

      await client.query(
        `UPDATE schedule_period SET name = $1, start_date = $2, end_date = $3, source_type = $4, source_id = $5, apply_mode = $6, updated_at = NOW() WHERE id = $7`,
        [nextName, nextStart, nextEnd, nextSourceType, nextSourceId, nextApplyMode, periodId]
      );

      let itemsAdded = 0;
      if (contentChanged) {
        const { items: sourceItems } = await resolveScheduleSource(client, {
          familyId, sourceType: nextSourceType, sourceId: nextSourceId, locale, variants, optionalSelections,
        });
        if (sourceItems.length === 0) {
          throw new ScheduleApplyError('EMPTY_SOURCE', 400, 'Källan innehöll inga aktiviteter — inget tillämpat.');
        }
        await client.query('DELETE FROM schedule_period_item WHERE period_id = $1', [periodId]);
        itemsAdded = await insertPeriodItems(client, periodId, sourceItems);
      }

      return {
        period_id: periodId, name: nextName, start_date: nextStart, end_date: nextEnd,
        source_type: nextSourceType, source_id: nextSourceId, apply_mode: nextApplyMode,
        content_changed: contentChanged, items_added: itemsAdded,
      };
    },
  });
}

/**
 * Delete a Special Period. Only ever touches `schedule_period` (and `schedule_period_item` via
 * ON DELETE CASCADE) — never `special_day_schedule`. An explicit Special Day a parent created
 * for a date inside this period's range is a completely separate row in a completely separate
 * table and is therefore always unaffected by this call, by construction (Blocker 2 fix).
 */
async function deleteSchedulePeriod({ familyId, childId, periodId, operationId = null }) {
  if (!familyId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'familyId krävs');
  if (!childId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'childId krävs');
  if (!periodId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'periodId krävs');

  return runIdempotentScheduleCommand({
    familyId,
    childId,
    operationId,
    fingerprintPayload: { command: 'delete_schedule_period', familyId, childId, periodId },
    execute: async (client) => {
      await acquirePeriodChildLock(client, childId);

      const existing = await client.query(
        `SELECT id, family_id, child_id, start_date::text AS start_date, end_date::text AS end_date
         FROM schedule_period WHERE id = $1`,
        [periodId]
      );
      if (existing.rows.length === 0 || existing.rows[0].family_id !== familyId || existing.rows[0].child_id !== childId) {
        throw new ScheduleApplyError('PERIOD_NOT_FOUND', 404, 'Perioden hittades inte');
      }
      const removed = existing.rows[0];
      await client.query('DELETE FROM schedule_period WHERE id = $1', [periodId]); // cascades to schedule_period_item

      return { period_id: periodId, start_date: removed.start_date, end_date: removed.end_date };
    },
  });
}

/** Fetch one period by id (family/child-scoped), including its stored item set — used by the
 * "edit period" UI to preselect current values without the parent re-entering anything. */
async function getSchedulePeriod({ familyId, childId, periodId }, client = db) {
  await assertChildBelongsToFamily(client, { childId, familyId });
  const res = await client.query(
    `SELECT id, name, start_date::text AS start_date, end_date::text AS end_date,
            source_type, source_id, apply_mode, created_at, updated_at
     FROM schedule_period WHERE id = $1 AND child_id = $2`,
    [periodId, childId]
  );
  if (res.rows.length === 0) {
    throw new ScheduleApplyError('PERIOD_NOT_FOUND', 404, 'Perioden hittades inte');
  }
  const period = res.rows[0];
  const itemsRes = await client.query(
    `SELECT activity_template_id, name, icon, start_time, end_time, star_value, sort_order, section
     FROM schedule_period_item WHERE period_id = $1 ORDER BY sort_order ASC`,
    [periodId]
  );
  return { ...period, items: itemsRes.rows };
}

/** List periods for a child, most recent start_date first. Read-only, no transaction needed. */
async function listSchedulePeriods({ familyId, childId }, client = db) {
  await assertChildBelongsToFamily(client, { childId, familyId });
  const res = await client.query(
    `SELECT id, name, start_date::text AS start_date, end_date::text AS end_date,
            source_type, source_id, apply_mode, created_at, updated_at
     FROM schedule_period WHERE child_id = $1 ORDER BY start_date DESC`,
    [childId]
  );
  return res.rows;
}

module.exports = {
  MAX_PERIOD_DAYS,
  createSchedulePeriod,
  updateSchedulePeriod,
  deleteSchedulePeriod,
  getSchedulePeriod,
  listSchedulePeriods,
};
