'use strict';

/**
 * Canonical effective-schedule QUERY (read-side) service — Phase 1A, extended in Phase 2.
 *
 * Single authoritative place that answers: "given a child and a calendar date, what
 * planning state is effective for that date?" — centralizing the precedence that was
 * previously duplicated inline across src/lib/daily-log-generator.js (three near-identical
 * SQL blocks) and src/routes/schedules/items.js (its own exclusion filter).
 *
 * PRECEDENCE (current product semantics — see docs/schedule-canonical-architecture.md "Phase 2"):
 *   1. explicit special-day full override (special_day_schedule), IF it has >=1 items.
 *      An explicit special day with ZERO items falls through to step 2 (§8.1 — falling
 *      through to weekly specifically is preserved when no period is active; falling
 *      through to a period when one covers the date is new in Phase 2, matching "empty
 *      special day = the date's otherwise-normal effective content", not hardcoded to
 *      always mean weekly).
 *   2. otherwise, IF a schedule_period covers this date, COMPOSE it with the custody-aware
 *      weekly base according to its apply_mode (merge / replace_sections / replace_day —
 *      see composePeriodWithWeekly() below). A period is never represented to this resolver
 *      as an opaque full-day override — that was Phase 2's first-draft design and was wrong
 *      for merge/replace_sections (a "kväll" period must never erase "morgon"/"dag").
 *   3. otherwise, custody-aware recurring weekly schedule (resolveWeeklyScheduleId).
 *   4. date exclusions (schedule_date_exclusion) are applied to the COMPOSED EFFECTIVE RESULT
 *      of steps 2/3 — i.e. AFTER a Special Period (if any) has already been composed with the
 *      weekly base — never only to the weekly portion. "Ta bort den här aktiviteten bara idag"
 *      must be able to remove an item regardless of whether that item came from weekly or from
 *      an active period; the period/weekly source content itself is never mutated by an
 *      exclusion (§ "date exclusions" in docs). Exclusions never apply to an explicit special
 *      day (step 1), matching pre-Phase-2 behaviour — a populated Special Day remains a full,
 *      un-filtered explicit override.
 *
 * Deliberately deferred (§8.3): once-tasks (daily_log_item.is_once_task = true) are NOT
 * merged into `items` here. They are a daily_log-owned overlay with their own lifecycle
 * (created directly against daily_log_item, never regenerated from weekly_schedule).
 * Folding them into this resolver would require the resolver to read/write daily_log,
 * which risks duplicating once-tasks on every read — out of scope for Phase 1A/2. Once-task
 * boundary is documented here so a later phase can build a single merged read model on top.
 * A once-task write is unaffected by an active period: it is still created directly against
 * that date's daily_log, coexisting with whatever base (weekly or period-composed) this
 * resolver produces for that date — it does not "freeze" the day.
 */

const db = require('./db');
const { resolveWeeklyScheduleId } = require('./custody-schedule-resolve');
const { getDayOfWeek } = require('./schedule-date-utils');
const { normalizeSection, sortByCanonicalSection } = require('./schedule-sections');

const BASE_TYPES = Object.freeze({
  SPECIAL_DAY: 'special_day',
  SPECIAL_PERIOD: 'special_period',
  WEEKLY: 'weekly',
  NONE: 'none',
});

/** Same duplicate-identity rule schedule-apply.js's duplicateKey() uses (kept local here to
 * avoid a read-service → write-service dependency — effective-schedule.js has never required
 * schedule-apply.js and this keeps that boundary). */
function itemDuplicateKey(item) {
  return [item.activity_template_id, normalizeSection(item.section), item.start_time || '', item.end_time || ''].join('::');
}

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

/**
 * §20 — the write-side overlap invariant (child-scoped advisory lock in schedule-period.js)
 * guarantees at most one schedule_period can cover any given date for a child, so this query
 * should never see more than one candidate row. It is still made deterministic (rather than an
 * arbitrary LIMIT 1) and defensively logs — never silently picks an unpredictable row — if that
 * invariant is ever somehow violated (e.g. direct DB tampering, a future write-path bug), so a
 * live-app anomaly is visible instead of silently hidden.
 *
 * @param {import('pg').Pool|import('pg').PoolClient} q
 * @returns {Promise<{ periodId: string, name: string, applyMode: string, items: object[] }|null>}
 */
async function loadPeriodForDate(q, childId, dateStr) {
  const periodRes = await q.query(
    `SELECT id, name, apply_mode FROM schedule_period
     WHERE child_id = $1 AND start_date <= $2 AND end_date >= $2
     ORDER BY start_date ASC, id ASC`,
    [childId, dateStr]
  );
  if (periodRes.rows.length === 0) return null;

  if (periodRes.rows.length > 1) {
    // The write-side invariant should make this unreachable — surface it loudly rather than
    // silently picking one, since it means the overlap guarantee has somehow been violated.
    console.error(
      `[EFFECTIVE-SCHEDULE] INVARIANT VIOLATION: child ${childId} has ${periodRes.rows.length} overlapping schedule_period rows for ${dateStr} — expected at most 1. Using the earliest-starting period deterministically; overlap should be investigated.`
    );
  }

  const period = periodRes.rows[0];
  const itemsRes = await q.query(
    `SELECT spi.activity_template_id, spi.name, spi.icon, at.image_url,
            spi.start_time, spi.end_time, spi.star_value, spi.sort_order, spi.section
     FROM schedule_period_item spi
     LEFT JOIN activity_template at ON at.id = spi.activity_template_id
     WHERE spi.period_id = $1
     ORDER BY spi.sort_order ASC`,
    [period.id]
  );

  return {
    periodId: period.id,
    name: period.name,
    applyMode: period.apply_mode,
    items: itemsRes.rows.map((r) => ({ ...r, section: normalizeSection(r.section) })),
  };
}

/**
 * Compose a period's items with the (already exclusion-filtered) weekly base, per apply_mode.
 * Mirrors applyScheduleItemsToDay()/applyScheduleItemsToSpecialDay()'s three write-side modes,
 * but as a pure READ-side composition — nothing is written here. Date exclusions are applied
 * by the caller AFTER this composition, to the composed result — never to weeklyItems here —
 * so an exclusion can remove a period-sourced item, not only a weekly one.
 *
 * @param {object[]} weeklyItems
 * @param {object[]} periodItems
 * @param {'merge'|'replace_sections'|'replace_day'} applyMode
 */
function composePeriodWithWeekly(weeklyItems, periodItems, applyMode) {
  if (applyMode === 'replace_day') {
    // The period's whole product point for this mode is "the day is different" — the weekly
    // base (and therefore date exclusions, which only ever apply to it) is fully superseded.
    return [...periodItems];
  }

  if (applyMode === 'replace_sections') {
    const periodSections = new Set(periodItems.map((i) => normalizeSection(i.section)));
    const keptWeekly = weeklyItems.filter((i) => !periodSections.has(normalizeSection(i.section)));
    return [...keptWeekly, ...periodItems];
  }

  // 'merge' (default) — weekly items stay, period items are appended unless a duplicate
  // (same activity_template_id + section + times) already exists in the weekly result.
  const existingKeys = new Set(weeklyItems.map(itemDuplicateKey));
  const toAdd = [];
  for (const item of periodItems) {
    const key = itemDuplicateKey(item);
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    toAdd.push(item);
  }
  return [...weeklyItems, ...toAdd];
}

/**
 * §22 — schedule_date_exclusion is created in migrate.js's core bootstrap (CREATE TABLE IF NOT
 * EXISTS), which always runs before the app starts serving requests, so in a healthy deployment
 * this table is guaranteed to exist for every live query. The only legitimate "missing table"
 * case is Postgres error 42P01 (undefined_table) during an exceptionally narrow bootstrap
 * window; any other error (connection failure, permissions, a real query bug) must NOT be
 * silently swallowed into "no exclusions" — that would turn a real DB failure into an
 * incorrect (over-inclusive) schedule without anyone noticing.
 */
async function loadDateExclusions(q, childId, dateStr) {
  try {
    const res = await q.query(
      `SELECT activity_template_id FROM schedule_date_exclusion WHERE child_id = $1 AND date = $2`,
      [childId, dateStr]
    );
    return new Set(res.rows.map((r) => r.activity_template_id));
  } catch (err) {
    if (err && err.code === '42P01') return new Set(); // undefined_table — pre-bootstrap window only
    throw err;
  }
}

/**
 * Apply date exclusions to the already-composed effective item list (weekly alone, or
 * weekly+period composed). schedule_date_exclusion keys on a non-null activity_template_id
 * (§6) — a denormalized item with a null activity_template_id (e.g. some explicit
 * special-day/period items) can never match an exclusion row, so it is never accidentally
 * dropped by this filter.
 */
function applyDateExclusions(items, excluded) {
  if (excluded.size === 0) return items;
  return items.filter((item) => item.activity_template_id == null || !excluded.has(item.activity_template_id));
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

  // Step 1 — explicit Special Day (non-empty) wins outright, unconditionally. It lives in its
  // own table (special_day_schedule) and is never written to by a Special Period (Phase 2) —
  // so this check, and its precedence over everything below, is completely unaffected by
  // whether a period also covers this date.
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

  // Step 2/3 — custody-aware weekly base, optionally composed with an active Special Period,
  // THEN date exclusions are applied to that already-composed effective result exactly once
  // (§ "date exclusions" in docs) — never only to the weekly portion, so an exclusion can
  // remove an item regardless of whether it originated from weekly or from the period. Neither
  // the weekly schedule nor the period's own definition (schedule_period / schedule_period_item)
  // is ever mutated by this — the exclusion is a pure date-specific overlay on the read result.
  const weekly = await loadWeeklyItems(q, childId, dateStr, timezone);
  const excluded = await loadDateExclusions(q, childId, dateStr);

  const period = await loadPeriodForDate(q, childId, dateStr);
  if (period) {
    const composed = composePeriodWithWeekly(weekly.items, period.items, period.applyMode);
    return {
      child_id: childId,
      date: dateStr,
      day_of_week: dayOfWeek,
      source: { base_type: BASE_TYPES.SPECIAL_PERIOD, base_id: period.periodId, apply_mode: period.applyMode },
      items: sortByCanonicalSection(applyDateExclusions(composed, excluded)),
      excluded_activity_template_ids: [...excluded],
      metadata: { timezone },
    };
  }

  return {
    child_id: childId,
    date: dateStr,
    day_of_week: dayOfWeek,
    source: {
      base_type: weekly.scheduleId ? BASE_TYPES.WEEKLY : BASE_TYPES.NONE,
      base_id: weekly.scheduleId,
    },
    items: sortByCanonicalSection(applyDateExclusions(weekly.items, excluded)),
    excluded_activity_template_ids: [...excluded],
    metadata: { timezone },
  };
}

module.exports = {
  BASE_TYPES,
  resolveEffectiveSchedule,
};
