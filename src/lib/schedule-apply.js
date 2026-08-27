'use strict';

/**
 * Canonical schedule APPLY (command-side) service — Phase 1A (hardened per PR #1093 review).
 *
 * Single authoritative place that mutates a child's recurring weekly_schedule from a
 * reusable schedule source (family_template or standard_schedule). Replaces the two
 * previously-duplicated day-write loops that lived in:
 *   - src/routes/schedules/templates.js (`POST /api/schedule-templates/:id/apply`)
 *   - src/lib/canonical-library-copy.js `copyCanonicalScheduleToFamily()` (writeScheduleDays)
 *
 * See docs/schedule-canonical-architecture.md for the full design note (precedence,
 * duplicate-identity rule, idempotency + concurrency, transaction boundaries, and what is
 * intentionally deferred to Phase 1B/2).
 *
 * Does NOT own: activity_category / fill-week legacy semantics (src/routes/schedules/fill-week.js
 * remains an isolated legacy path, see docs note), special_day_schedule / apply-date-range
 * (src/routes/schedules/child-bulk.js — untouched full-day snapshot domain), once-tasks
 * (daily_log_item.is_once_task — untouched, see docs note on the read-side boundary).
 */

const crypto = require('crypto');
const db = require('./db');
const { CANONICAL_SECTIONS, normalizeSection } = require('./schedule-sections');
const {
  materializeStandardScheduleActivities,
} = require('./canonical-library-runtime');

const SOURCE_TYPES = Object.freeze(['family_template', 'standard_schedule']);
const APPLY_MODES = Object.freeze(['merge', 'replace_sections', 'replace_day']);
const IDEMPOTENCY_RETENTION_DAYS = 30;
// Advisory-lock namespace hash — keeps this domain's locks isolated from any other
// pg_advisory_xact_lock user in the codebase (two-int form: namespace + identity hash).
const ADVISORY_LOCK_NAMESPACE = 'schedule_apply_operation';

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
 * Deterministic, key-sorted JSON serialization (stable regardless of property insertion order).
 * Used only for command-fingerprint hashing — never for storage/transport of the value itself.
 */
function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Command fingerprint (§3A) — a deterministic hash of every input that materially defines
 * what a canonical command will materialize. Two requests with the same operationId + childId
 * but a DIFFERENT fingerprint are a client bug (reused idempotency key for a different command)
 * and must be rejected, never silently replayed. Callers pass a plain payload object containing
 * every field that affects the command's output; this function only hashes it deterministically.
 */
function computeCommandFingerprint(payload) {
  return crypto.createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function sortedTargets(targets) {
  return [...targets].map((t) => ({ dayOfWeek: t.dayOfWeek, mode: t.mode })).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
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
 * Normalize + validate a per-day application plan: unique days, valid mode per day,
 * deterministically ordered by day_of_week (§5.6, and required for the fingerprint to be
 * stable regardless of caller-supplied ordering).
 * @param {Array<{ dayOfWeek: number, mode?: string }>} targets
 */
function normalizePlanTargets(targets) {
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'targets[] krävs (minst en dag)');
  }
  const byDay = new Map();
  for (const target of targets) {
    const dayOfWeek = Number(target?.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new ScheduleApplyError('VALIDATION_ERROR', 400, `Ogiltig veckodag: ${target?.dayOfWeek} (giltigt intervall 0–6)`);
    }
    const mode = target?.mode || 'merge';
    assertValidMode(mode);
    if (byDay.has(dayOfWeek)) {
      throw new ScheduleApplyError('VALIDATION_ERROR', 400, `Veckodag ${dayOfWeek} förekommer flera gånger i planen`);
    }
    byDay.set(dayOfWeek, { dayOfWeek, mode });
  }
  return [...byDay.values()].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

/**
 * §4 — family/child integrity invariant enforced INSIDE the canonical transaction.
 * The domain service must never be capable of a cross-family write even if a future
 * caller's route-level authz has a bug; this is the last line of defense, not the only one.
 */
async function assertChildBelongsToFamily(client, { childId, familyId }) {
  const res = await client.query('SELECT family_id FROM child WHERE id = $1', [childId]);
  if (res.rows.length === 0 || res.rows[0].family_id !== familyId) {
    throw new ScheduleApplyError('CHILD_NOT_IN_FAMILY', 403, 'Barnet tillhör inte den angivna familjen', { childId });
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

/**
 * §3B — acquire a transaction-scoped Postgres advisory lock on the (operationId, childId)
 * identity. Blocks until any other in-flight transaction holding the same lock has
 * committed or rolled back (the lock auto-releases at end of transaction — no manual
 * unlock needed, no risk of a leaked lock on crash). This turns "SELECT ledger; mutate;
 * INSERT ... ON CONFLICT DO NOTHING" (racy: two concurrent transactions can both miss the
 * row) into "acquire lock; SELECT ledger (now safe — no concurrent writer can be mid-flight);
 * mutate or replay; INSERT ledger; COMMIT (release lock)".
 *
 * No external infrastructure — this is pure Postgres, and the lock is automatically
 * scoped/released by the surrounding BEGIN/COMMIT/ROLLBACK.
 */
async function acquireIdempotencyLock(client, { operationId, childId }) {
  if (!operationId) return;
  await client.query(
    `SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`,
    [ADVISORY_LOCK_NAMESPACE, `${operationId}:${childId}`]
  );
}

async function loadIdempotencyRecord(client, { operationId, childId }) {
  if (!operationId) return null;
  const res = await client.query(
    `SELECT command_fingerprint, result_json FROM schedule_apply_operation WHERE operation_id = $1 AND child_id = $2`,
    [operationId, childId]
  );
  return res.rows[0] || null;
}

async function storeIdempotentResult(client, { operationId, childId, familyId, fingerprint, result }) {
  if (!operationId) return;
  await client.query(
    `INSERT INTO schedule_apply_operation (operation_id, child_id, family_id, command_fingerprint, result_json)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (operation_id, child_id) DO NOTHING`,
    [operationId, childId, familyId, fingerprint, JSON.stringify(result)]
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
 * Shared transaction skeleton for every canonical single-child command in this module
 * (§4 family/child integrity, §3 idempotency + concurrency). ONE place implements:
 *   BEGIN → assert child belongs to family → acquire advisory lock on (operationId, childId)
 *   → replay-or-execute → store ledger → COMMIT (or ROLLBACK on any failure).
 *
 * `execute(client)` performs the actual mutation and returns the result object to store/return.
 * Extracted in the Phase 1B hardening pass so applyScheduleSourceToChildPlan, applyActivityToChild,
 * and copyScheduleDay all share one hardened implementation instead of three copies.
 *
 * @param {object} params
 * @param {string} params.familyId
 * @param {string} params.childId
 * @param {string|null} params.operationId
 * @param {object} params.fingerprintPayload — every input that materially defines the command
 * @param {(client: import('pg').PoolClient) => Promise<object>} params.execute
 */
async function runIdempotentScheduleCommand({ familyId, childId, operationId = null, fingerprintPayload, execute }) {
  const fingerprint = computeCommandFingerprint(fingerprintPayload);
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // §4 — family/child integrity, enforced before ANY other work, including idempotency
    // replay: even a replay must never happen against a child that is not (or is no longer)
    // in the caller's family.
    await assertChildBelongsToFamily(client, { childId, familyId });

    // §3B — serialize concurrent identical requests via a transaction-scoped advisory lock.
    await acquireIdempotencyLock(client, { operationId, childId });

    const existingRecord = await loadIdempotencyRecord(client, { operationId, childId });
    if (existingRecord) {
      if (existingRecord.command_fingerprint !== fingerprint) {
        throw new ScheduleApplyError(
          'IDEMPOTENCY_KEY_REUSED', 409,
          'operation_id har redan använts för ett annat kommando',
          { operation_id: operationId }
        );
      }
      await client.query('COMMIT');
      return { ...existingRecord.result_json, replayed: true };
    }

    const result = await execute(client);
    await storeIdempotentResult(client, { operationId, childId, familyId, fingerprint, result });

    await client.query('COMMIT');
    return { ...result, replayed: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Canonical single-child schedule application command — PLAN form (§2 of the hardening
 * review). Accepts a per-day mode plan and executes it as ONE transaction, so a legacy
 * route request that mixes "fill empty days" (merge) and "overwrite populated days"
 * (replace_day) in a single user gesture remains atomic end to end: if any target day
 * fails, EVERY target day (including previously-succeeded ones in this same call) rolls
 * back — there is no intermediate commit.
 *
 * Idempotent + concurrency-safe when `operationId` is supplied (§3): the transaction takes
 * a Postgres advisory lock scoped to (operationId, childId) before touching the ledger, so
 * two concurrent identical requests execute strictly one-after-the-other, never both
 * mutating. A replay is only honoured when the stored command fingerprint matches this
 * call's fingerprint exactly; a mismatched fingerprint under the same operationId is a
 * deterministic 409 IDEMPOTENCY_KEY_REUSED with NO mutation.
 *
 * Family/child integrity (§4) is validated inside this transaction — `assertChildBelongsToFamily`
 * — so this service cannot perform a cross-family write even if a future caller's
 * route-level authorization has a bug.
 *
 * @param {object} params
 * @param {string} params.familyId
 * @param {string} params.childId
 * @param {'family_template'|'standard_schedule'} params.sourceType
 * @param {string} params.sourceId
 * @param {Array<{ dayOfWeek: number, mode?: 'merge'|'replace_sections'|'replace_day' }>} params.targets
 * @param {string} [params.operationId]
 * @param {{ custodyHomeId?: string }} [params.custodyContext]
 * @param {string} [params.locale]
 * @param {object|null} [params.variants]
 * @param {object|null} [params.optionalSelections]
 */
async function applyScheduleSourceToChildPlan(params) {
  const {
    familyId,
    childId,
    sourceType,
    sourceId,
    targets,
    operationId = null,
    custodyContext = null,
    locale = 'sv-SE',
    variants = null,
    optionalSelections = null,
  } = params;

  if (!familyId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'familyId krävs');
  if (!childId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'childId krävs');
  const planTargets = normalizePlanTargets(targets);
  const custodyHomeId = custodyContext?.custodyHomeId || null;

  return runIdempotentScheduleCommand({
    familyId,
    childId,
    operationId,
    fingerprintPayload: {
      command: 'apply_schedule_source', childId, familyId, sourceType, sourceId,
      targets: sortedTargets(planTargets), custodyHomeId, locale, variants, optionalSelections,
    },
    execute: async (client) => {
      const { items: sourceItems, sourceMeta } = await resolveScheduleSource(client, {
        familyId, sourceType, sourceId, locale, variants, optionalSelections,
      });

      if (sourceItems.length === 0) {
        throw new ScheduleApplyError('EMPTY_SOURCE', 400, 'Källan innehöll inga aktiviteter — inget tillämpat.');
      }

      const perDay = [];
      for (const { dayOfWeek, mode } of planTargets) {
        const dayResult = await applyScheduleItemsToDay(client, {
          childId, dayOfWeek, items: sourceItems, mode, custodyHomeId,
        });
        perDay.push({ day_of_week: dayOfWeek, mode, ...dayResult });
      }

      return {
        operation_id: operationId,
        child_id: childId,
        family_id: familyId,
        source: sourceMeta,
        applied_days: perDay.map((d) => d.day_of_week),
        changed_days: perDay.filter((d) => d.itemsAdded > 0).map((d) => d.day_of_week),
        skipped_days: [],
        duplicate_items_skipped: perDay.reduce((sum, d) => sum + d.itemsSkippedDuplicate, 0),
        replaced_sections: Object.fromEntries(perDay.map((d) => [d.day_of_week, d.sectionsReplaced])),
        day_modes: Object.fromEntries(perDay.map((d) => [d.day_of_week, d.mode])),
      };
    },
  });
}

/**
 * Direct-activity command (Phase 1B §1B.20). Adds ONE existing family activity to one or more
 * weekdays on a child's recurring schedule.
 *
 * Decision record (§1B.20): `activity_template` was deliberately NOT added to `SOURCE_TYPES`.
 * A schedule "source" (§10) is a reusable, materializable collection of items resolved via
 * `resolveScheduleSource` (family_template / standard_schedule); a single already-existing
 * family activity needs no resolution or materialization — it is applied directly through the
 * same `applyScheduleItemsToDay` primitive every other command uses, via the same
 * `runIdempotentScheduleCommand` transaction/idempotency/family-integrity skeleton. Modelling it
 * as a separate command (rather than stretching the source-type concept) keeps "reusable
 * template/standard content" and "one activity, right now" as distinct, non-blurred concepts.
 *
 * @param {object} params
 * @param {string} params.familyId
 * @param {string} params.childId
 * @param {string} params.activityTemplateId — must belong to `familyId`
 * @param {number[]} params.days
 * @param {string} [params.section] — one of CANONICAL_SECTIONS, defaults to 'dag'
 * @param {string|null} [params.startTime]
 * @param {string|null} [params.endTime]
 * @param {'merge'|'replace_sections'|'replace_day'} [params.mode] — defaults to 'merge' (§1B.1)
 * @param {string} [params.operationId]
 * @param {{ custodyHomeId?: string }} [params.custodyContext]
 */
async function applyActivityToChild(params) {
  const {
    familyId, childId, activityTemplateId, days, section = 'dag',
    startTime = null, endTime = null, mode = 'merge', operationId = null, custodyContext = null,
  } = params;

  if (!familyId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'familyId krävs');
  if (!childId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'childId krävs');
  if (!activityTemplateId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'activityTemplateId krävs');
  assertValidMode(mode);
  const validDays = normalizeDays(days);
  const normalizedSection = normalizeSection(section);
  const custodyHomeId = custodyContext?.custodyHomeId || null;

  return runIdempotentScheduleCommand({
    familyId,
    childId,
    operationId,
    fingerprintPayload: {
      command: 'apply_activity', childId, familyId, activityTemplateId,
      days: validDays, section: normalizedSection, startTime, endTime, mode, custodyHomeId,
    },
    execute: async (client) => {
      const activity = await client.query(
        'SELECT id FROM activity_template WHERE id = $1 AND family_id = $2',
        [activityTemplateId, familyId]
      );
      if (activity.rows.length === 0) {
        throw new ScheduleApplyError('SOURCE_NOT_FOUND', 404, 'Aktiviteten hittades inte');
      }

      const items = [{
        activity_template_id: activityTemplateId, section: normalizedSection,
        start_time: startTime, end_time: endTime, sort_order: 0,
      }];

      const perDay = [];
      for (const dayOfWeek of validDays) {
        const dayResult = await applyScheduleItemsToDay(client, { childId, dayOfWeek, items, mode, custodyHomeId });
        perDay.push({ day_of_week: dayOfWeek, ...dayResult });
      }

      return {
        operation_id: operationId,
        child_id: childId,
        family_id: familyId,
        source: { source_type: 'direct_activity', activity_template_id: activityTemplateId },
        applied_days: perDay.map((d) => d.day_of_week),
        changed_days: perDay.filter((d) => d.itemsAdded > 0).map((d) => d.day_of_week),
        duplicate_items_skipped: perDay.reduce((sum, d) => sum + d.itemsSkippedDuplicate, 0),
        replaced_sections: Object.fromEntries(perDay.map((d) => [d.day_of_week, d.sectionsReplaced])),
      };
    },
  });
}

/**
 * Copy-day command (Phase 1B §1B.21). Reads one source child/day's recurring items and applies
 * them to one or more target days — for the same child or a different child in the same family.
 * Does NOT create a temporary template (§1B.21) — reads `weekly_schedule_item` directly and
 * writes through `applyScheduleItemsToDay`, the same primitive every other command uses.
 *
 * The source day is read-only here and therefore never modified by this command, regardless of
 * mode or outcome (§1B.4 "source day itself is not modified").
 *
 * Single target child per call, matching the locked single-child atomicity contract (§1B.8) —
 * copying one source day to multiple children is a separate, not-yet-built multi-child
 * operation (see `applyScheduleSourceToTargets` follow-up note).
 *
 * @param {object} params
 * @param {string} params.familyId
 * @param {string} params.sourceChildId — must belong to `familyId`
 * @param {number} params.sourceDayOfWeek
 * @param {string} params.targetChildId — must belong to `familyId` (may equal sourceChildId)
 * @param {number[]} params.targetDays
 * @param {'merge'|'replace_sections'|'replace_day'} [params.mode]
 * @param {string} [params.operationId]
 * @param {{ custodyHomeId?: string }} [params.custodyContext] — applies to the TARGET side only;
 *   the source day is read using the same custody scoping so "copy what I see" matches "what
 *   gets applied".
 */
async function copyScheduleDay(params) {
  const {
    familyId, sourceChildId, sourceDayOfWeek, targetChildId, targetDays,
    mode = 'merge', operationId = null, custodyContext = null,
  } = params;

  if (!familyId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'familyId krävs');
  if (!sourceChildId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'sourceChildId krävs');
  if (!targetChildId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'targetChildId krävs');
  if (!Number.isInteger(sourceDayOfWeek) || sourceDayOfWeek < 0 || sourceDayOfWeek > 6) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'Ogiltig källdag');
  }
  assertValidMode(mode);
  const validTargetDays = normalizeDays(targetDays);
  const custodyHomeId = custodyContext?.custodyHomeId || null;

  return runIdempotentScheduleCommand({
    familyId,
    childId: targetChildId,
    operationId,
    fingerprintPayload: {
      command: 'copy_schedule_day', familyId, sourceChildId, sourceDayOfWeek, targetChildId,
      targetDays: validTargetDays, mode, custodyHomeId,
    },
    execute: async (client) => {
      // Source child may differ from the target child — validate it belongs to the same
      // family too (§4/§22: never trust a bare id, even for a read).
      if (sourceChildId !== targetChildId) {
        await assertChildBelongsToFamily(client, { childId: sourceChildId, familyId });
      }

      const selectSql = custodyHomeId
        ? `SELECT wsi.activity_template_id, wsi.start_time, wsi.end_time, wsi.sort_order, wsi.section
           FROM weekly_schedule_item wsi JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
           WHERE ws.child_id = $1 AND ws.day_of_week = $2 AND ws.custody_home_id = $3
           ORDER BY wsi.sort_order ASC`
        : `SELECT wsi.activity_template_id, wsi.start_time, wsi.end_time, wsi.sort_order, wsi.section
           FROM weekly_schedule_item wsi JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
           WHERE ws.child_id = $1 AND ws.day_of_week = $2
           ORDER BY wsi.sort_order ASC`;
      const selectParams = custodyHomeId ? [sourceChildId, sourceDayOfWeek, custodyHomeId] : [sourceChildId, sourceDayOfWeek];
      const sourceItemsRes = await client.query(selectSql, selectParams);
      const sourceItems = sourceItemsRes.rows.map((r) => ({ ...r, section: normalizeSection(r.section) }));

      if (sourceItems.length === 0) {
        throw new ScheduleApplyError('EMPTY_SOURCE', 400, 'Källdagen är tom — inget att kopiera.');
      }

      const perDay = [];
      for (const dayOfWeek of validTargetDays) {
        const dayResult = await applyScheduleItemsToDay(client, {
          childId: targetChildId, dayOfWeek, items: sourceItems, mode, custodyHomeId,
        });
        perDay.push({ day_of_week: dayOfWeek, ...dayResult });
      }

      return {
        operation_id: operationId,
        child_id: targetChildId,
        family_id: familyId,
        source: { source_type: 'copy_day', source_child_id: sourceChildId, source_day_of_week: sourceDayOfWeek },
        applied_days: perDay.map((d) => d.day_of_week),
        changed_days: perDay.filter((d) => d.itemsAdded > 0).map((d) => d.day_of_week),
        duplicate_items_skipped: perDay.reduce((sum, d) => sum + d.itemsSkippedDuplicate, 0),
        replaced_sections: Object.fromEntries(perDay.map((d) => [d.day_of_week, d.sectionsReplaced])),
      };
    },
  });
}

/**
 * Save-day-as-template command (Phase 1B §1B.22). Copies one child's recurring day into a NEW
 * family template (a `weekly_schedule` row with `child_id IS NULL`, per §2 TEMPLATE). This is an
 * explicit, one-time COPY — the created template is never live-linked back to the source day:
 * editing the template later (via the existing template item CRUD) does not touch the child's
 * weekly schedule, and vice versa, because they are two independent sets of
 * `weekly_schedule_item` rows from the moment of creation onward. Section, time, and order are
 * preserved exactly. No child-specific `weekly_schedule` row is repurposed as a template — a
 * brand-new row is always created.
 *
 * @param {object} params
 * @param {string} params.familyId
 * @param {string} params.childId — the day's owner; must belong to `familyId`
 * @param {number} params.dayOfWeek
 * @param {string} params.templateName
 * @param {string} [params.operationId]
 * @param {{ custodyHomeId?: string }} [params.custodyContext]
 */
async function saveWeeklyDayAsFamilyTemplate(params) {
  const { familyId, childId, dayOfWeek, templateName, operationId = null, custodyContext = null } = params;

  if (!familyId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'familyId krävs');
  if (!childId) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'childId krävs');
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'Ogiltig veckodag');
  }
  const name = (templateName || '').trim();
  if (!name) throw new ScheduleApplyError('VALIDATION_ERROR', 400, 'Mallens namn krävs');
  const custodyHomeId = custodyContext?.custodyHomeId || null;

  return runIdempotentScheduleCommand({
    familyId,
    childId,
    operationId,
    fingerprintPayload: { command: 'save_day_as_template', familyId, childId, dayOfWeek, name, custodyHomeId },
    execute: async (client) => {
      const selectSql = custodyHomeId
        ? `SELECT wsi.activity_template_id, wsi.start_time, wsi.end_time, wsi.sort_order, wsi.section
           FROM weekly_schedule_item wsi JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
           WHERE ws.child_id = $1 AND ws.day_of_week = $2 AND ws.custody_home_id = $3
           ORDER BY wsi.sort_order ASC`
        : `SELECT wsi.activity_template_id, wsi.start_time, wsi.end_time, wsi.sort_order, wsi.section
           FROM weekly_schedule_item wsi JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
           WHERE ws.child_id = $1 AND ws.day_of_week = $2
           ORDER BY wsi.sort_order ASC`;
      const selectParams = custodyHomeId ? [childId, dayOfWeek, custodyHomeId] : [childId, dayOfWeek];
      const sourceItemsRes = await client.query(selectSql, selectParams);

      if (sourceItemsRes.rows.length === 0) {
        throw new ScheduleApplyError('EMPTY_SOURCE', 400, 'Dagen är tom — inget att spara som mall.');
      }

      const maxSort = await client.query(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort FROM weekly_schedule WHERE family_id = $1 AND child_id IS NULL`,
        [familyId]
      );
      const templateRes = await client.query(
        `INSERT INTO weekly_schedule (family_id, name, sort_order, day_of_week, child_id)
         VALUES ($1, $2, $3, 0, NULL) RETURNING id, name, created_at`,
        [familyId, name, parseInt(maxSort.rows[0].next_sort, 10)]
      );
      const templateId = templateRes.rows[0].id;

      let itemCount = 0;
      for (const item of sourceItemsRes.rows) {
        await client.query(
          `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [templateId, item.activity_template_id, item.start_time, item.end_time, item.sort_order, normalizeSection(item.section)]
        );
        itemCount++;
      }

      return {
        operation_id: operationId,
        template_id: templateId,
        template_name: templateRes.rows[0].name,
        family_id: familyId,
        source_child_id: childId,
        source_day_of_week: dayOfWeek,
        item_count: itemCount,
      };
    },
  });
}

/**
 * Simple same-mode-for-all-days wrapper around `applyScheduleSourceToChildPlan` (§35
 * `applyScheduleSourceToChild`). Prefer `applyScheduleSourceToChildPlan` directly when a
 * single legacy route request needs different modes for different days in one atomic
 * transaction (e.g. "fill empty days, overwrite populated days" in one user gesture).
 *
 * @param {object} params
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
  const { days, mode = 'merge', ...rest } = params;
  assertValidMode(mode);
  const validDays = normalizeDays(days);
  const result = await applyScheduleSourceToChildPlan({
    ...rest,
    targets: validDays.map((dayOfWeek) => ({ dayOfWeek, mode })),
  });
  return { ...result, mode };
}

/**
 * Thin batch orchestrator (§6 `applyScheduleSourceToTargets`) around the single-child
 * primitive. NOT exposed as a public route in Phase 1A — see docs/schedule-canonical-architecture.md
 * for why cross-child atomicity is intentionally NOT promised (each child is its own DB
 * transaction; the pool has max 5 connections and holding N open transactions for one
 * HTTP request is unsafe at that pool size).
 *
 * Preflight (authorization + validation) runs for ALL targets BEFORE any mutation, so an
 * unauthorized child in the batch causes NOTHING to be written for ANY child (§6). The
 * canonical service ALSO re-validates family/child integrity per-child (§4, defense in depth).
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
  computeCommandFingerprint,
  normalizeDays,
  normalizePlanTargets,
  resolveScheduleSource,
  applyScheduleItemsToDay,
  applyScheduleSourceToChild,
  applyScheduleSourceToChildPlan,
  applyScheduleSourceToTargets,
  applyActivityToChild,
  copyScheduleDay,
  saveWeeklyDayAsFamilyTemplate,
  cleanupExpiredScheduleApplyOperations,
  IDEMPOTENCY_RETENTION_DAYS,
};
