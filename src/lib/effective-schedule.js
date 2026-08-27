'use strict';

/**
 * Canonical effective-schedule QUERY (read-side) service — Phase 1A.
 *
 * Single authoritative place that answers: "given a child and a calendar date, what
 * planning state is effective for that date?" — centralizing the precedence that was
 * previously duplicated inline across src/lib/daily-log-generator.js (three near-identical
 * SQL blocks) and src/routes/schedules/items.js (its own exclusion filter).
 *
 * PRECEDENCE (current product semantics — see docs/schedule-canonical-architecture.md):
 *   1. explicit special-day full override (special_day_schedule), IF it has >=1 items.
 *      An explicit special day with ZERO items falls back to weekly (§8.1 — this is
 *      current live behaviour and is preserved, not changed).
 *   2. otherwise custody-aware recurring weekly schedule (resolveWeeklyScheduleId).
 *   3. date exclusions (schedule_date_exclusion) are applied ONLY to the weekly base
 *      (§16) — they do not apply to an explicit special day, matching current behaviour.
 *
 * Deliberately deferred (§8.3): once-tasks (daily_log_item.is_once_task = true) are NOT
 * merged into `items` here. They are a daily_log-owned overlay with their own lifecycle
 * (created directly against daily_log_item, never regenerated from weekly_schedule).
 * Folding them into this resolver would require the resolver to read/write daily_log,
 * which risks duplicating once-tasks on every read — out of scope for Phase 1A. Once-task
 * boundary is documented here so Phase 1B can build a single merged read model on top.
 */

const db = require('./db');
const { resolveWeeklyScheduleId } = require('./custody-schedule-resolve');
const { getDayOfWeek } = require('./schedule-date-utils');
const { normalizeSection, sortByCanonicalSection } = require('./schedule-sections');

const BASE_TYPES = Object.freeze({ SPECIAL_DAY: 'special_day', WEEKLY: 'weekly', NONE: 'none' });

/**
 * @param {import('pg').Pool|import('pg').PoolClient} q
 * @param {string} childId
 */
async function loadSpecialDayItems(q, childId, dateStr) {
  const sdRes = await q.query(
    `SELECT id FROM special_day_schedule WHERE child_id = $1 AND date = $2`,
    [childId, dateStr]
  );
  if (sdRes.rows.length === 0) return null;

  const specialDayId = sdRes.rows[0].id;
  const itemsRes = await q.query(
    `SELECT sdsi.activity_template_id, sdsi.name, sdsi.icon, at.image_url,
            sdsi.start_time, sdsi.end_time, sdsi.star_value, sdsi.sort_order, sdsi.section
     FROM special_day_schedule_item sdsi
     LEFT JOIN activity_template at ON at.id = sdsi.activity_template_id
     WHERE sdsi.special_day_schedule_id = $1
     ORDER BY sdsi.sort_order ASC`,
    [specialDayId]
  );

  // §8.1 — an explicit special day with zero items falls back to weekly (current
  // live behaviour, preserved). Signal "empty" via null so the caller falls through.
  if (itemsRes.rows.length === 0) return { specialDayId, items: [], empty: true };

  return {
    specialDayId,
    empty: false,
    items: itemsRes.rows.map((r) => ({ ...r, section: normalizeSection(r.section) })),
  };
}

/**
 * @param {import('pg').Pool|import('pg').PoolClient} q
 */
async function loadWeeklyItems(q, childId, dateStr, timezone) {
  const scheduleId = await resolveWeeklyScheduleId(q, childId, dateStr, timezone);
  if (!scheduleId) return { scheduleId: null, items: [] };

  const itemsRes = await q.query(
    `SELECT wsi.activity_template_id, wsi.start_time, wsi.end_time, wsi.sort_order, wsi.section,
            at.name, at.icon, at.image_url, at.star_value
     FROM weekly_schedule_item wsi
     JOIN activity_template at ON at.id = wsi.activity_template_id
     WHERE wsi.weekly_schedule_id = $1
     ORDER BY wsi.sort_order ASC`,
    [scheduleId]
  );

  return {
    scheduleId,
    items: itemsRes.rows.map((r) => ({ ...r, section: normalizeSection(r.section) })),
  };
}

async function loadDateExclusions(q, childId, dateStr) {
  try {
    const res = await q.query(
      `SELECT activity_template_id FROM schedule_date_exclusion WHERE child_id = $1 AND date = $2`,
      [childId, dateStr]
    );
    return new Set(res.rows.map((r) => r.activity_template_id));
  } catch {
    // Table may not exist yet during a migration window — never fail the read path for this.
    return new Set();
  }
}

/**
 * Canonical effective-schedule resolver (§35 `resolveEffectiveSchedule`).
 *
 * @param {string} childId
 * @param {string} dateStr YYYY-MM-DD
 * @param {{ client?: import('pg').PoolClient, timezone?: string }} [options]
 * @returns {Promise<{
 *   child_id: string, date: string, day_of_week: number,
 *   source: { base_type: 'special_day'|'weekly'|'none', base_id: string|null },
 *   items: object[],
 *   excluded_activity_template_ids: string[],
 *   metadata: { timezone: string }
 * }>}
 */
async function resolveEffectiveSchedule(childId, dateStr, options = {}) {
  const q = options.client || db;

  let timezone = options.timezone;
  if (!timezone) {
    const childRes = await q.query('SELECT timezone FROM child WHERE id = $1', [childId]);
    if (childRes.rows.length === 0) {
      throw Object.assign(new Error('Child not found'), { code: 'CHILD_NOT_FOUND' });
    }
    timezone = childRes.rows[0].timezone || 'Europe/Stockholm';
  }

  const dayOfWeek = getDayOfWeek(dateStr, timezone);

  const special = await loadSpecialDayItems(q, childId, dateStr);
  if (special && !special.empty) {
    return {
      child_id: childId,
      date: dateStr,
      day_of_week: dayOfWeek,
      source: { base_type: BASE_TYPES.SPECIAL_DAY, base_id: special.specialDayId },
      items: sortByCanonicalSection(special.items),
      // Exclusions only apply to the weekly base, never to an explicit special day (§16).
      excluded_activity_template_ids: [],
      metadata: { timezone },
    };
  }

  const weekly = await loadWeeklyItems(q, childId, dateStr, timezone);
  const excluded = await loadDateExclusions(q, childId, dateStr);
  const items = weekly.items.filter((item) => !excluded.has(item.activity_template_id));

  return {
    child_id: childId,
    date: dateStr,
    day_of_week: dayOfWeek,
    source: {
      base_type: weekly.scheduleId ? BASE_TYPES.WEEKLY : BASE_TYPES.NONE,
      base_id: weekly.scheduleId,
    },
    items: sortByCanonicalSection(items),
    excluded_activity_template_ids: [...excluded],
    metadata: { timezone },
  };
}

module.exports = {
  BASE_TYPES,
  resolveEffectiveSchedule,
};
