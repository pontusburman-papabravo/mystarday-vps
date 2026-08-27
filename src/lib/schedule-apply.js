'use strict';

/**
 * Canonical schedule APPLY (command-side) service — Phase 1A.
 *
 * Single authoritative place that mutates a child's recurring weekly_schedule from a
 * reusable schedule source (family_template or standard_schedule). Replaces the two
 * previously-duplicated day-write loops that lived in:
 *   - src/routes/schedules/templates.js (`POST /api/schedule-templates/:id/apply`)
 *   - src/lib/canonical-library-copy.js `copyCanonicalScheduleToFamily()` (writeScheduleDays)
 *
 * See docs/schedule-canonical-architecture.md for the full design note (precedence,
 * duplicate-identity rule, idempotency, transaction boundaries, and what is intentionally
 * deferred to Phase 1B/2).
 *
 * Does NOT own: activity_category / fill-week legacy semantics (src/routes/schedules/fill-week.js
 * remains an isolated legacy path, see docs note), special_day_schedule / apply-date-range
 * (src/routes/schedules/child-bulk.js — untouched full-day snapshot domain), once-tasks
 * (daily_log_item.is_once_task — untouched, see docs note on the read-side boundary).
 */

const db = require('./db');
const { CANONICAL_SECTIONS, normalizeSection } = require('./schedule-sections');
const {
  materializeStandardScheduleActivities,
} = require('./canonical-library-runtime');

const SOURCE_TYPES = Object.freeze(['family_template', 'standard_schedule']);
const APPLY_MODES = Object.freeze(['merge', 'replace_sections', 'replace_day']);
const IDEMPOTENCY_RETENTION_DAYS = 30;

class ScheduleApplyError extends Error {
  /**
   * @param {string} code
   * @param {number} httpStatus
   * @param {string} message
   * @param {object} [details]
   */
  constructor(code, httpStatus, message, details) {
    super(message);
    this.name = 'ScheduleApplyError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details || null;
  }
}

/** Deterministic duplicate identity for a schedule item within one day (§5.2). */
function duplicateKey(item) {
  return [
    item.activity_template_id,
    normalizeSection(item.section),
    item.start_time || '',
    item.end_time || '',
  ].join('::');
}

/**
 * Validate + normalize the `days` input: integers only, range 0–6, de-duplicated,
 * deterministically ordered (§5.6).
 * @param {unknown} days
 * @returns {number[]}
 */
function normalizeDays(days) {
  if (!Array.isArray(days) || days.length === 0) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'days[] krävs (t.ex. [1,2,3,4,5])');
  }
  const valid = new Set();
  for (const raw of days) {
    const d = Number(raw);
    if (!Number.isInteger(d) || d < 0 || d > 6) {
      throw new ScheduleApplyError('VALIDATION_ERROR', 400, `Ogiltig veckodag: ${raw} (giltigt intervall 0–6)`);
    }
    valid.add(d);
  }
  return [...valid].sort((a, b) => a - b);
}

function assertValidMode(mode) {
  if (!APPLY_MODES.includes(mode)) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, `Ogiltigt läge: ${mode} (merge | replace_sections | replace_day)`);
  }
}

/**
 * Resolve a reusable schedule source into a flat, ordered list of schedule items.
 * Caller owns the transaction (client is already inside BEGIN/COMMIT).
 *
 * @param {import('pg').PoolClient} client
 * @param {{ familyId: string, sourceType: 'family_template'|'standard_schedule', sourceId: string,
 *           locale?: string, variants?: object|null, optionalSelections?: object|null }} options
 * @returns {Promise<{ items: object[], sourceMeta: object }>}
 */
async function resolveScheduleSource(client, options) {
  const { familyId, sourceType, sourceId, locale = 'sv-SE', variants = null, optionalSelections = null } = options;

  if (!SOURCE_TYPES.includes(sourceType)) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, `Ogiltig källtyp: ${sourceType}`);
  }
  if (!sourceId) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'sourceId krävs');
  }

  if (sourceType === 'family_template') {
    // Family templates are weekly_schedule rows with child_id IS NULL (§2 TEMPLATE).
    // family_id ownership check prevents cross-family source use (§22).
    const template = await client.query(
      `SELECT id, name FROM weekly_schedule WHERE id = $1 AND family_id = $2 AND child_id IS NULL`,
      [sourceId, familyId]
    );
    if (template.rows.length === 0) {
      throw new ScheduleApplyError('SOURCE_NOT_FOUND', 404, 'Schemamallen hittades inte');
    }

    const itemsRes = await client.query(
      `SELECT wsi.activity_template_id, wsi.start_time, wsi.end_time, wsi.sort_order, wsi.section
       FROM weekly_schedule_item wsi
       WHERE wsi.weekly_schedule_id = $1
       ORDER BY wsi.sort_order ASC`,
      [sourceId]
    );

    return {
      items: itemsRes.rows.map((r) => ({ ...r, section: normalizeSection(r.section) })),
      sourceMeta: { source_type: sourceType, source_id: sourceId, name: template.rows[0].name },
    };
  }

  // standard_schedule — reuse the canonical library materializer (§10). This is the SAME
  // helper src/routes/schedules/templates.js already uses for "create template from standard";
  // we must not introduce a second materializer.
  const prepared = await materializeStandardScheduleActivities(client, {
    familyId,
    defaultScheduleId: sourceId,
    locale,
    callerVariants: variants,
    optionalSelections,
  });

  const items = [];
  for (const item of prepared.filteredItems) {
    const templateId = prepared.templateIdForItem(item);
    if (!templateId) continue; // e.g. variant-filtered item — matches existing behaviour
    items.push({
      activity_template_id: templateId,
      start_time: item.start_time || null,
      end_time: item.end_time || null,
      sort_order: item.sort_order || 0,
      section: normalizeSection(item.section),
    });
  }

  return {
    items,
    sourceMeta: {
      source_type: sourceType,
      source_id: sourceId,
      name: prepared.scheduleName,
      canonical_id: prepared.scheduleCanonicalId,
      activities_created: prepared.activitiesCreated,
    },
  };
}

/**
 * Find (or create) the weekly_schedule row for one child/day. When `custodyHomeId` is
 * given, the row is scoped to that home (§5.7); otherwise this preserves the exact
 * pre-Phase-1A query used by both legacy write loops (child_id + day_of_week only —
 * custody columns are ignored, matching current live behaviour for these callers).
 */
async function findOrCreateWeeklyScheduleRow(client, { childId, dayOfWeek, custodyHomeId }) {
  const selectSql = custodyHomeId
    ? `SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2 AND custody_home_id = $3`
    : `SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2`;
  const selectParams = custodyHomeId ? [childId, dayOfWeek, custodyHomeId] : [childId, dayOfWeek];

  const existing = await client.query(selectSql, selectParams);
  if (existing.rows.length > 0) {
    return { scheduleId: existing.rows[0].id, created: false };
  }

  const insertSql = custodyHomeId
    ? `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order, custody_home_id) VALUES ($1, $2, $3, $4) RETURNING id`
    : `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2, $3) RETURNING id`;
  const insertParams = custodyHomeId ? [childId, dayOfWeek, dayOfWeek, custodyHomeId] : [childId, dayOfWeek, dayOfWeek];

  const inserted = await client.query(insertSql, insertParams);
  return { scheduleId: inserted.rows[0].id, created: true };
}

/**
 * Canonical single-day mutation primitive (§35 `applyScheduleItemsToDay`).
 * All three apply modes are implemented here — this is the ONLY place that writes
 * weekly_schedule_item rows for a canonical apply command.
 *
 * @param {import('pg').PoolClient} client
 * @param {{ childId: string, dayOfWeek: number, items: object[], mode: string, custodyHomeId?: string|null }} params
 */
async function applyScheduleItemsToDay(client, { childId, dayOfWeek, items, mode, custodyHomeId = null }) {
  if (!Array.isArray(items) || items.length === 0) {
    // §5.5 — never silently turn a malformed/empty source into a day wipe.
    throw new ScheduleApplyError('EMPTY_SOURCE', 400, 'Källan innehöll inga aktiviteter — inget tillämpat.');
  }

  const { scheduleId, created } = await findOrCreateWeeklyScheduleRow(client, { childId, dayOfWeek, custodyHomeId });

  if (mode === 'replace_day') {
    await client.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [scheduleId]);
    const inserted = await insertItems(client, scheduleId, items);
    return { scheduleId, created, action: 'replace_day', itemsAdded: inserted, itemsSkippedDuplicate: 0, sectionsReplaced: [...new Set(items.map((i) => normalizeSection(i.section)))] };
  }

  if (mode === 'replace_sections') {
    const sourceSections = [...new Set(items.map((i) => normalizeSection(i.section)))];
    await client.query(
      `DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1 AND COALESCE(section, 'dag') = ANY($2::text[])`,
      [scheduleId, sourceSections]
    );
    const inserted = await insertItems(client, scheduleId, items);
    return { scheduleId, created, action: 'replace_sections', itemsAdded: inserted, itemsSkippedDuplicate: 0, sectionsReplaced: sourceSections };
  }

  // mode === 'merge' (default, non-destructive — §5.1)
  const existingRes = await client.query(
    `SELECT activity_template_id, start_time, end_time, section FROM weekly_schedule_item WHERE weekly_schedule_id = $1`,
    [scheduleId]
  );
  const existingKeys = new Set(existingRes.rows.map(duplicateKey));

  const toInsert = [];
  let skipped = 0;
  for (const item of items) {
    const key = duplicateKey(item);
    if (existingKeys.has(key)) { skipped++; continue; }
    existingKeys.add(key); // also de-dupe duplicates within the source itself
    toInsert.push(item);
  }

  const inserted = await insertItems(client, scheduleId, toInsert);
  return { scheduleId, created, action: 'merge', itemsAdded: inserted, itemsSkippedDuplicate: skipped, sectionsReplaced: [] };
}

async function insertItems(client, scheduleId, items) {
  let count = 0;
  for (const item of items) {
    await client.query(
      `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [scheduleId, item.activity_template_id, item.start_time || null, item.end_time || null, item.sort_order || 0, normalizeSection(item.section)]
    );
    count++;
  }
  return count;
}

async function loadIdempotentResult(client, { operationId, childId }) {
  if (!operationId) return null;
  const res = await client.query(
    `SELECT result_json FROM schedule_apply_operation WHERE operation_id = $1 AND child_id = $2`,
    [operationId, childId]
  );
  return res.rows[0]?.result_json || null;
}

async function storeIdempotentResult(client, { operationId, childId, familyId, result }) {
  if (!operationId) return;
  await client.query(
    `INSERT INTO schedule_apply_operation (operation_id, child_id, family_id, result_json)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (operation_id, child_id) DO NOTHING`,
    [operationId, childId, familyId, JSON.stringify(result)]
  );
}

/**
 * Delete idempotency records older than the retention window. Best-effort, safe to call
 * opportunistically (e.g. from the existing midnight scheduler) — never required for
 * correctness of a single apply call.
 */
async function cleanupExpiredScheduleApplyOperations(retentionDays = IDEMPOTENCY_RETENTION_DAYS) {
  const result = await db.query(
    `DELETE FROM schedule_apply_operation WHERE created_at < NOW() - ($1 || ' days')::interval`,
    [retentionDays]
  );
  return { deleted: result.rowCount || 0 };
}

/**
 * Canonical single-child schedule application command (§35 `applyScheduleSourceToChild`).
 *
 * Transactionally atomic across all requested days (§5.6/§23): if any day fails, the
 * whole command rolls back. Idempotent when `operationId` is supplied (§7): a retried
 * call with the same operationId + childId returns the stored result without re-mutating
 * the database. Post-commit side effects (daily-log sync, SSE broadcast) are best-effort
 * and documented as such (§23/§24).
 *
 * @param {object} params
 * @param {{ id: string }} params.actor
 * @param {string} params.familyId
 * @param {string} params.childId
 * @param {'family_template'|'standard_schedule'} params.sourceType
 * @param {string} params.sourceId
 * @param {number[]} params.days
 * @param {'merge'|'replace_sections'|'replace_day'} [params.mode]
 * @param {string} [params.operationId]
 * @param {{ custodyHomeId?: string }} [params.custodyContext]
 * @param {string} [params.locale]
 * @param {object|null} [params.variants]
 * @param {object|null} [params.optionalSelections]
 */
async function applyScheduleSourceToChild(params) {
  const {
    familyId,
    childId,
    sourceType,
    sourceId,
    days,
    mode = 'merge',
    operationId = null,
    custodyContext = null,
    locale = 'sv-SE',
    variants = null,
    optionalSelections = null,
  } = params;

  if (!familyId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'familyId krävs');
  if (!childId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'childId krävs');
  assertValidMode(mode);
  const validDays = normalizeDays(days);
  const custodyHomeId = custodyContext?.custodyHomeId || null;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const cached = await loadIdempotentResult(client, { operationId, childId });
    if (cached) {
      await client.query('COMMIT');
      return { ...cached, replayed: true };
    }

    const { items: sourceItems, sourceMeta } = await resolveScheduleSource(client, {
      familyId, sourceType, sourceId, locale, variants, optionalSelections,
    });

    if (sourceItems.length === 0) {
      throw new ScheduleApplyError('EMPTY_SOURCE', 400, 'Källan innehöll inga aktiviteter — inget tillämpat.');
    }

    const perDay = [];
    for (const dayOfWeek of validDays) {
      const dayResult = await applyScheduleItemsToDay(client, {
        childId, dayOfWeek, items: sourceItems, mode, custodyHomeId,
      });
      perDay.push({ day_of_week: dayOfWeek, ...dayResult });
    }

    const result = {
      operation_id: operationId,
      child_id: childId,
      family_id: familyId,
      source: sourceMeta,
      mode,
      applied_days: perDay.map((d) => d.day_of_week),
      changed_days: perDay.filter((d) => d.itemsAdded > 0).map((d) => d.day_of_week),
      skipped_days: [],
      duplicate_items_skipped: perDay.reduce((sum, d) => sum + d.itemsSkippedDuplicate, 0),
      replaced_sections: Object.fromEntries(perDay.map((d) => [d.day_of_week, d.sectionsReplaced])),
      replayed: false,
    };

    await storeIdempotentResult(client, { operationId, childId, familyId, result });

    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Thin batch orchestrator (§6 `applyScheduleSourceToTargets`) around the single-child
 * primitive. NOT exposed as a public route in Phase 1A — see docs/schedule-canonical-architecture.md
 * for why cross-child atomicity is intentionally NOT promised (each child is its own DB
 * transaction; the pool has max 5 connections and holding N open transactions for one
 * HTTP request is unsafe at that pool size).
 *
 * Preflight (authorization + validation) runs for ALL targets BEFORE any mutation, so an
 * unauthorized child in the batch causes NOTHING to be written for ANY child (§6).
 *
 * @param {object} params
 * @param {Array<{ childId: string, days: number[] }>} params.targets
 * @param {(childId: string) => Promise<{ family_id: string }|null>} params.authorizeChild
 *   Caller-supplied authorization check (e.g. authz.getChildAccess bound to the acting parent).
 */
async function applyScheduleSourceToTargets(params) {
  const { targets, authorizeChild, familyId, sourceType, sourceId, mode = 'merge', operationId, locale, variants, optionalSelections, custodyContext } = params;

  if (!Array.isArray(targets) || targets.length === 0) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'targets[] krävs');
  }

  // Preflight: authorize + validate every target before the first write (§6, §22).
  for (const target of targets) {
    if (!target.childId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'childId krävs för varje mål');
    normalizeDays(target.days); // throws on invalid days
    const access = await authorizeChild(target.childId);
    if (!access || access.family_id !== familyId) {
      throw new ScheduleApplyError('AUTHORIZATION_ERROR', 403, 'Du har inte åtkomst till ett eller flera valda barn');
    }
  }

  const results = [];
  for (const target of targets) {
    const perChildOperationId = operationId ? `${operationId}:${target.childId}` : null;
    const result = await applyScheduleSourceToChild({
      familyId, childId: target.childId, sourceType, sourceId, days: target.days,
      mode, operationId: perChildOperationId, locale, variants, optionalSelections, custodyContext,
    });
    results.push(result);
  }

  return { operation_id: operationId, targets: results };
}

module.exports = {
  ScheduleApplyError,
  SOURCE_TYPES,
  APPLY_MODES,
  CANONICAL_SECTIONS,
  duplicateKey,
  normalizeDays,
  resolveScheduleSource,
  applyScheduleItemsToDay,
  applyScheduleSourceToChild,
  applyScheduleSourceToTargets,
  cleanupExpiredScheduleApplyOperations,
  IDEMPOTENCY_RETENTION_DAYS,
};
