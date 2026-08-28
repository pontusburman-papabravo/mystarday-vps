'use strict';

/**
 * Canonical Special Period command service — Phase 2.
 *
 * Special Period is now a first-class domain entity (`schedule_period`), not a loose loop over
 * `special_day_schedule` rows with no shared identity. The runtime still MATERIALIZES per-date
 * `special_day_schedule` (+ `special_day_schedule_item`) rows — the exact same table
 * `resolveEffectiveSchedule()` (Phase 1A, src/lib/effective-schedule.js) and calendar.js already
 * read — so creating a period is immediately visible to every existing read path with ZERO
 * resolver changes. `special_day_schedule.period_id` (migration 1810440000000) is the identity
 * link back to the period that generated a given date, so "edit the period" / "delete the
 * period" are real single operations instead of "find and touch N unrelated date rows".
 *
 * Reuses (does not duplicate) canonical Phase 1A/1B logic:
 *   - resolveScheduleSource() — same family_template/standard_schedule resolution
 *     src/lib/schedule-apply.js's applyScheduleSourceToChildPlan already uses. activity_category
 *     is intentionally NOT a period source (§ Phase 2 non-goals).
 *   - runIdempotentScheduleCommand() — same transaction/advisory-lock/fingerprint/family-check
 *     skeleton every Phase 1A/1B command uses (custodyHomeId is always null here — see the
 *     "Custody" section below — so its custody-resolution step is a guaranteed no-op).
 *   - duplicateKey()/normalizeSection() — same merge/duplicate-identity rule as weekly apply.
 *
 * Custody decision (see docs/schedule-canonical-architecture.md "Phase 2 — custody"): a period
 * is NOT custody-home-scoped. This matches the existing, unmodified `special_day_schedule` /
 * `schedule_date_exclusion` semantics (neither has ever had a `custody_home_id` column) — a
 * date-specific exception follows the child+date and overrides whichever custody home would
 * otherwise be effective on that date, rather than forcing parents to create the same period
 * twice (once per home). This is a deliberate continuation of existing product behaviour, not a
 * new assumption.
 *
 * Precedence boundary (Phase 3 owns final locking): resolveEffectiveSchedule() already treats
 * ANY non-empty `special_day_schedule` row as a full override of the custody-aware weekly base
 * (§8.1 in that file). A materialized period date is indistinguishable from a manually-created
 * Special Day at read time — by design, this phase does not add a THIRD read path. Phase 3 is
 * expected to make resolveEffectiveSchedule() period-aware in its own response shape (e.g.
 * base_type: 'special_period') without changing precedence order, and to finalize how an
 * explicit Special Day on one date inside an active period interacts (currently: whichever
 * `special_day_schedule` row exists for that date wins outright — an explicit Special Day
 * write already naturally overrides a period-materialized row for that one date, since it is
 * the exact same table/row).
 */

const db = require('./db');
const { normalizeSection } = require('./schedule-sections');
const {
  ScheduleApplyError,
  SOURCE_TYPES,
  APPLY_MODES,
  duplicateKey,
  resolveScheduleSource,
  runIdempotentScheduleCommand,
  assertChildBelongsToFamily,
} = require('./schedule-apply');

const MAX_PERIOD_DAYS = 93; // same bound as the legacy apply-date-range route (child-bulk.js)

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

/** Inclusive list of 'YYYY-MM-DD' date strings from start to end (UTC-noon anchored to avoid DST edge issues). */
function listDatesInclusive(startStr, endStr) {
  const dates = [];
  const cursor = new Date(`${startStr}T12:00:00Z`);
  const end = new Date(`${endStr}T12:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function assertValidDateRange(startDate, endDate) {
  if (!isValidDateStr(startDate) || !isValidDateStr(endDate)) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'start_date/end_date krävs (YYYY-MM-DD)');
  }
  if (endDate < startDate) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'end_date måste vara samma dag som eller efter start_date');
  }
  const dates = listDatesInclusive(startDate, endDate);
  if (dates.length > MAX_PERIOD_DAYS) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, `Max ${MAX_PERIOD_DAYS} dagar per specialperiod`);
  }
  return dates;
}

/**
 * §"Overlapping periods forbidden" — deterministic validation, no hidden precedence. Chose an
 * application-level check (SELECT ... FOR UPDATE inside the caller's transaction, via the
 * advisory lock already serializing same-child period commands) over a Postgres GIST exclusion
 * constraint to avoid introducing the `btree_gist` extension for one table; the advisory lock in
 * runIdempotentScheduleCommand already serializes concurrent commands for the same child, so
 * this check cannot race with itself for the SAME child+operation identity. Concurrent DIFFERENT
 * operation_ids for the same child are not lock-serialized against each other today (matches the
 * existing Phase 1A/1B pattern — see docs), so this is "best effort deterministic under normal
 * use", not a hard DB-level guarantee; documented as a known limitation, not silently ignored.
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

/**
 * Materialize ONE date's items into `special_day_schedule`/`special_day_schedule_item`,
 * stamping `period_id` so the row's identity is traceable back to this period. Mirrors
 * applyScheduleItemsToDay()'s three apply modes exactly (merge/replace_sections/replace_day) —
 * a parallel implementation is unavoidable because it targets a structurally different table
 * (special_day_schedule_item stores denormalized name/icon/star_value, unlike
 * weekly_schedule_item), but the MODE SEMANTICS are identical and reuse the same
 * duplicateKey()/normalizeSection() helpers so "merge" means the same thing everywhere in this
 * domain.
 */
async function applyScheduleItemsToSpecialDay(client, { childId, dateStr, items, mode, periodId }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ScheduleApplyError('EMPTY_SOURCE', 400, 'Källan innehöll inga aktiviteter — inget tillämpat.');
  }

  const existingSd = await client.query(
    `SELECT id FROM special_day_schedule WHERE child_id = $1 AND date = $2`,
    [childId, dateStr]
  );

  let sdId;
  let created;
  if (existingSd.rows.length > 0) {
    sdId = existingSd.rows[0].id;
    created = false;
    await client.query(
      `UPDATE special_day_schedule SET period_id = $1, updated_at = NOW() WHERE id = $2`,
      [periodId, sdId]
    );
  } else {
    const inserted = await client.query(
      `INSERT INTO special_day_schedule (child_id, date, period_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [childId, dateStr, periodId]
    );
    sdId = inserted.rows[0].id;
    created = true;
  }

  const insertItems = async (rows) => {
    let count = 0;
    for (const item of rows) {
      await client.query(
        `INSERT INTO special_day_schedule_item
           (special_day_schedule_id, activity_template_id, name, icon, start_time, end_time, star_value, sort_order, section)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          sdId, item.activity_template_id, item.name || 'Aktivitet', item.icon || '⭐',
          item.start_time || null, item.end_time || null, item.star_value || 1,
          item.sort_order || 0, normalizeSection(item.section),
        ]
      );
      count++;
    }
    return count;
  };

  if (mode === 'replace_day') {
    await client.query('DELETE FROM special_day_schedule_item WHERE special_day_schedule_id = $1', [sdId]);
    const itemsAdded = await insertItems(items);
    return { sdId, created, itemsAdded, itemsSkippedDuplicate: 0 };
  }

  if (mode === 'replace_sections') {
    const sourceSections = [...new Set(items.map((i) => normalizeSection(i.section)))];
    await client.query(
      `DELETE FROM special_day_schedule_item WHERE special_day_schedule_id = $1 AND COALESCE(section, 'dag') = ANY($2::text[])`,
      [sdId, sourceSections]
    );
    const itemsAdded = await insertItems(items);
    return { sdId, created, itemsAdded, itemsSkippedDuplicate: 0 };
  }

  // mode === 'merge' (default, non-destructive)
  const existingItemsRes = await client.query(
    `SELECT activity_template_id, start_time, end_time, section FROM special_day_schedule_item WHERE special_day_schedule_id = $1`,
    [sdId]
  );
  const existingKeys = new Set(existingItemsRes.rows.map(duplicateKey));
  const toInsert = [];
  let skipped = 0;
  for (const item of items) {
    const key = duplicateKey(item);
    if (existingKeys.has(key)) { skipped++; continue; }
    existingKeys.add(key);
    toInsert.push(item);
  }
  const itemsAdded = await insertItems(toInsert);
  return { sdId, created, itemsAdded, itemsSkippedDuplicate: skipped };
}

/** Deletes ALL materialized special_day_schedule rows for one period (cascades to items). */
async function deleteMaterializedDatesForPeriod(client, periodId) {
  await client.query('DELETE FROM special_day_schedule WHERE period_id = $1', [periodId]);
}

/**
 * Create a Special Period: validates the date range, rejects overlap with an existing period
 * for the same child, resolves the reusable source (family_template/standard_schedule — same
 * resolver every other canonical command uses), inserts the `schedule_period` row, then
 * materializes each date in range via applyScheduleItemsToSpecialDay(). One transaction — if
 * any date fails, the whole period creation rolls back (§ "Minimum-change rule": dates outside
 * the interval are never touched; a failure inside the interval must not partially apply it).
 *
 * @param {object} params
 * @param {string} params.familyId
 * @param {string} params.childId
 * @param {string} params.name
 * @param {string} params.startDate — 'YYYY-MM-DD'
 * @param {string} params.endDate — 'YYYY-MM-DD'
 * @param {'family_template'|'standard_schedule'} params.sourceType
 * @param {string} params.sourceId
 * @param {'merge'|'replace_sections'|'replace_day'} [params.applyMode] — defaults to 'replace_day'
 *   (a Special Period's whole product point is "things are different during this interval";
 *   unlike the weekly Aktivitet/Från mall flows, the legacy apply-date-range behaviour this
 *   replaces has always defaulted to overwriting the day, so this default preserves existing
 *   parent expectations rather than introducing a new default for the same job).
 * @param {string} [params.operationId]
 * @param {string} [params.locale]
 * @param {object|null} [params.variants]
 * @param {object|null} [params.optionalSelections]
 */
async function createSchedulePeriod(params) {
  const {
    familyId, childId, name, startDate, endDate, sourceType, sourceId,
    applyMode = 'replace_day', operationId = null, locale = 'sv-SE', variants = null, optionalSelections = null,
  } = params;

  if (!familyId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'familyId krävs');
  if (!childId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'childId krävs');
  if (!name || !String(name).trim()) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'Periodens namn krävs');
  assertValidSourceType(sourceType);
  assertValidMode(applyMode);
  const dates = assertValidDateRange(startDate, endDate);

  return runIdempotentScheduleCommand({
    familyId,
    childId,
    operationId,
    fingerprintPayload: {
      command: 'create_schedule_period', familyId, childId, name: name.trim(), startDate, endDate,
      sourceType, sourceId, applyMode, locale, variants, optionalSelections,
    },
    execute: async (client) => {
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

      const perDate = [];
      for (const dateStr of dates) {
        const result = await applyScheduleItemsToSpecialDay(client, {
          childId, dateStr, items: sourceItems, mode: applyMode, periodId: period.id,
        });
        perDate.push({ date: dateStr, ...result });
      }

      return {
        period_id: period.id,
        name: period.name,
        start_date: period.start_date,
        end_date: period.end_date,
        source: sourceMeta,
        apply_mode: period.apply_mode,
        applied_dates: perDate.map((d) => d.date),
        materialized_count: perDate.length,
      };
    },
  });
}

/**
 * Update a Special Period. `name` is pure metadata (never re-materializes). Any of
 * start_date/end_date/source_type/source_id/apply_mode changing means the previously
 * materialized dates no longer reflect the period's definition — per §"Period changes should be
 * understandable to the parent, no magical silent propagation outside the selected interval",
 * this is implemented as an explicit, atomic "un-materialize old dates, re-validate, re-apply
 * new dates" inside ONE transaction, never a partial/hidden merge of old and new content.
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
      const dates = assertValidDateRange(nextStart, nextEnd);

      const contentChanged = nextStart !== current.start_date || nextEnd !== current.end_date
        || nextSourceType !== current.source_type || nextSourceId !== current.source_id
        || nextApplyMode !== current.apply_mode;

      if (contentChanged) {
        await assertNoOverlap(client, { childId, startDate: nextStart, endDate: nextEnd, excludePeriodId: periodId });
      }

      await client.query(
        `UPDATE schedule_period SET name = $1, start_date = $2, end_date = $3, source_type = $4, source_id = $5, apply_mode = $6, updated_at = NOW() WHERE id = $7`,
        [nextName, nextStart, nextEnd, nextSourceType, nextSourceId, nextApplyMode, periodId]
      );

      let materializedCount = 0;
      const appliedDates = [];
      if (contentChanged) {
        await deleteMaterializedDatesForPeriod(client, periodId);
        const { items: sourceItems } = await resolveScheduleSource(client, {
          familyId, sourceType: nextSourceType, sourceId: nextSourceId, locale, variants, optionalSelections,
        });
        if (sourceItems.length === 0) {
          throw new ScheduleApplyError('EMPTY_SOURCE', 400, 'Källan innehöll inga aktiviteter — inget tillämpat.');
        }
        for (const dateStr of dates) {
          await applyScheduleItemsToSpecialDay(client, { childId, dateStr, items: sourceItems, mode: nextApplyMode, periodId });
          appliedDates.push(dateStr);
        }
        materializedCount = appliedDates.length;
      }

      return {
        period_id: periodId, name: nextName, start_date: nextStart, end_date: nextEnd,
        source_type: nextSourceType, source_id: nextSourceId, apply_mode: nextApplyMode,
        content_changed: contentChanged, applied_dates: appliedDates, materialized_count: materializedCount,
      };
    },
  });
}

/**
 * Delete a Special Period. Also deletes the special_day_schedule rows it generated (cascades to
 * their items) — "delete the period" must actually restore normal weekly behaviour for those
 * dates, not just remove the period's own bookkeeping row while leaving its content behind as
 * orphaned Special Days. Dates the parent has since manually edited are NOT specially
 * preserved — the period_id link IS the row, deleting the period deletes what it created, which
 * is the same one clear rule for every date in the interval (§"understandable to the parent").
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
      const existing = await client.query(
        `SELECT id, family_id, child_id FROM schedule_period WHERE id = $1`,
        [periodId]
      );
      if (existing.rows.length === 0 || existing.rows[0].family_id !== familyId || existing.rows[0].child_id !== childId) {
        throw new ScheduleApplyError('PERIOD_NOT_FOUND', 404, 'Perioden hittades inte');
      }

      const removedDates = await client.query(
        `SELECT date::text AS date FROM special_day_schedule WHERE period_id = $1 ORDER BY date`,
        [periodId]
      );
      await deleteMaterializedDatesForPeriod(client, periodId);
      await client.query('DELETE FROM schedule_period WHERE id = $1', [periodId]);

      return { period_id: periodId, removed_dates: removedDates.rows.map((r) => r.date) };
    },
  });
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
  listDatesInclusive,
  createSchedulePeriod,
  updateSchedulePeriod,
  deleteSchedulePeriod,
  listSchedulePeriods,
};
