/**
 * Calendar routes — parent calendar view with weekly navigation.
 *
 * GET /api/children/:childId/calendar-week?weekOffset=0
 *   Returns 7 days of the target week. Locked Phase 4 contract
 *   (docs/schedule-canonical-architecture.md "Phase 4 — Calendar plan/execution separation"):
 *
 *     Calendar's planning content = resolveEffectiveSchedule()/resolveEffectiveScheduleRange(),
 *     for EVERY date — never daily_log, never conditional on whether a log happens to exist.
 *     daily_log only supplies an EXECUTION-METADATA OVERLAY (completion status, day-level
 *     isPaused) on top of that canonical list, plus once-tasks as an ADDITIVE execution-only
 *     append. daily_log is never an alternate planning authority: if the weekly schedule or an
 *     active Special Period changes after a log already exists, Calendar immediately reflects
 *     the new plan — a stale, no-longer-canonical log item can never resurrect/replace it.
 *
 *   This route does NOT independently decide weekly/period/special-day precedence itself (the
 *   Phase 3-documented gap, closed in Phase 4) — it only computes its own custody-specific UI
 *   metadata (home label/color/handoff banner), which is unrelated to which activities are shown
 *   and is preserved unchanged.
 *   weekOffset: 0 = current week, +1 = next week, -1 = previous week.
 */

const express = require('express');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');
const { getLocalDateStr, getDayOfWeek } = require('../lib/daily-log-generator');
const { addDaysIso, getWeekMondayIso } = require('../lib/date-utils');
const { legacyWeekVariant } = require('../lib/custody-context-api');
const { getFamilyPreferredLocale } = require('../lib/family-locale');
const { localizeActivityItems } = require('../lib/family-content-display');
const { normalizeLocale } = require('../lib/locale');
const {
  loadCustodyContext,
  resolveCustodyDateSync,
} = require('../lib/custody-schedule-engine');
const { isActivationFlagEnabled, FLAG_KEYS } = require('../lib/activation-flags');
const { resolveEffectiveScheduleRange, BASE_TYPES } = require('../lib/effective-schedule');

const router = express.Router({ mergeParams: true });

router.use(requireParent);

const DAY_NAMES_SV = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];

function localizedDayName(locale, dateStr, dow) {
  const loc = normalizeLocale(locale) || 'sv-SE';
  try {
    return new Intl.DateTimeFormat(loc, { weekday: 'long' }).format(new Date(`${dateStr}T12:00:00`));
  } catch (_) {
    return DAY_NAMES_SV[dow] || '';
  }
}

/**
 * @deprecated Phase 4 UI — legacy calendar day shape until schedule UI migrates
 * @param {import('../lib/custody-schedule-engine/types').CustodyContext} resolved
 * @param {object} schedule
 * @param {string|null} parentHomeId
 */
function calendarDayCustodyPayload(resolved, schedule, parentHomeId) {
  if (!resolved?.activeHome) return null;
  const home = resolved.activeHome;
  return {
    variant: legacyWeekVariant(schedule, home),
    homeId: home.id,
    label: home.label,
    color: home.color,
    isMyDay: parentHomeId ? resolved.isParentDay : null,
  };
}

/**
 * Phase 4 — shapes one resolveEffectiveSchedule() item into the Calendar activity item shape.
 * `id` uses activity_template_id (a stable, well-known identifier) — used unconditionally now,
 * even on a date that has a generated daily_log, since Calendar's item list always comes from
 * the canonical planning state, never from daily_log_item rows directly. No current frontend
 * code reads `id` for canonical/template-sourced calendar activities (verified: only `section`,
 * `completed`, `name`/`icon`, and count/grouping fields are read — see
 * public/js/calendar-page.js, public/js/print-schema-core.js, public/js/child-week-overview.js).
 * `completed` defaults to null here; §"completion overlay" below fills it in from a matching
 * daily_log_item when one exists.
 */
function effectiveItemToCalendarActivity(item, baseType) {
  return {
    id: item.activity_template_id,
    name: item.name,
    icon: item.icon || '',
    star_value: item.star_value || 1,
    start_time: item.start_time || null,
    end_time: item.end_time || null,
    sort_order: item.sort_order || 0,
    section: item.section || 'dag',
    completed: null,
    source: baseType === BASE_TYPES.SPECIAL_DAY ? 'special_day' : (baseType === BASE_TYPES.SPECIAL_PERIOD ? 'special_period' : 'template'),
    is_exception: baseType === BASE_TYPES.SPECIAL_DAY || baseType === BASE_TYPES.SPECIAL_PERIOD,
  };
}

/**
 * Phase 4 — shapes one once-task daily_log_item row into the Calendar activity item shape.
 * Once-tasks are an execution-only, ADDITIVE overlay: appended after the canonical planning
 * items, never merged/deduped against them, and never allowed to influence which canonical item
 * is shown or its completion (see "identity audit" below for why matching by
 * activity_template_id would be unsafe for once-tasks specifically).
 */
function onceTaskLogItemToCalendarActivity(row) {
  return {
    id: row.item_id,
    name: row.name,
    icon: row.icon || '',
    star_value: row.star_value || 1,
    start_time: row.start_time || null,
    end_time: row.end_time || null,
    sort_order: row.sort_order || 0,
    section: row.section || 'dag',
    completed: row.completed,
    source: 'once_task',
    is_exception: false,
  };
}

/**
 * GET /api/children/:childId/calendar-week?weekOffset=0
 */
router.get('/calendar-week', async (req, res) => {
  try {
    const parentId = req.user.id;
    const { childId } = req.params;
    const weekOffset = parseInt(req.query.weekOffset || '0', 10);

    if (isNaN(weekOffset) || weekOffset < -52 || weekOffset > 52) {
      return res.status(400).json({ error: 'Ogiltig veckoförskjutning' });
    }

    // Verify parent-child access
    const childResult = await db.query(
      `SELECT c.id, c.name, c.emoji, c.family_id
       FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1 AND c.id = $2`,
      [parentId, childId]
    );

    if (!childResult.rows[0]) {
      return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
    }

    const child = childResult.rows[0];

    // Get child's timezone (fallback to Europe/Stockholm)
    const childTzResult = await db.query('SELECT timezone FROM child WHERE id = $1', [childId]);
    const tz = childTzResult.rows[0]?.timezone || 'Europe/Stockholm';

    // Calculate "today" in child's local timezone
    const todayStr = getLocalDateStr(new Date(), tz);
    const todayDow = getDayOfWeek(todayStr, tz); // 0=Sun, 1=Mon, ..., 6=Sat

    // Calculate Monday for the target week (in child's timezone) using UTC arithmetic
    const daysFromMonday = todayDow === 0 ? 6 : todayDow - 1;
    const weekStart = addDaysIso(todayStr, -daysFromMonday + weekOffset * 7);

    // Build 7 dates: Mon–Sun
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDaysIso(weekStart, i));
    }

    const weekEnd = dates[6];

    const myDaysOnly = req.query.myDays === '1' || req.query.myDays === 'true';

    let custodyActive = false;
    let engineCtx = null;
    const custodyByDate = {};
    const custodyFlag = await isActivationFlagEnabled(FLAG_KEYS.custodySchedule, child.family_id);
    if (custodyFlag) {
      engineCtx = await loadCustodyContext({
        childId,
        familyId: child.family_id,
        parentId,
      });
      custodyActive = Boolean(engineCtx.schedule);
      if (custodyActive) {
        for (const dateStr of dates) {
          custodyByDate[dateStr] = resolveCustodyDateSync(engineCtx, dateStr);
        }
      }
    }

    // Phase 4 — canonical planning state for every date in the visible window, for dates that
    // don't yet have a generated daily_log (see file header comment). This single call replaces
    // the previous direct weekly_schedule/weekly_schedule_item query + custody-variant grouping
    // + template lookup, which independently re-decided special-day-vs-weekly precedence and had
    // no Special Period awareness at all (the gap documented in Phase 3's "Duplicate-precedence
    // audit"). resolveEffectiveScheduleRange() is a thin wrapper that calls the exact same
    // resolveEffectiveSchedule() used everywhere else in the codebase — no second precedence
    // implementation was introduced here.
    const effectiveByDate = await resolveEffectiveScheduleRange(childId, weekStart, weekEnd, { client: db, timezone: tz });

    // Fetch special day schedules for this week — existence + note only. This is a badge/note
    // annotation orthogonal to item selection: which activities are actually shown for a date is
    // decided exclusively by resolveEffectiveScheduleRange() above (which already correctly
    // treats an empty explicit Special Day as falling through to Period/Weekly), never by this
    // query.
    const specialDaysResult = await db.query(
      `SELECT sds.id AS schedule_id, sds.date::text AS date, sds.note
       FROM special_day_schedule sds
       WHERE sds.child_id = $1
         AND sds.date >= $2::date
         AND sds.date <= $3::date
       ORDER BY sds.date ASC`,
      [childId, weekStart, weekEnd]
    );

    // Group special days by date
    const specialByDate = {};
    for (const row of specialDaysResult.rows) {
      const dateStr = row.date.slice(0, 10);
      specialByDate[dateStr] = { schedule_id: row.schedule_id, note: row.note };
    }

    // Fetch daily logs for this week — Phase 4: this is now an EXECUTION-METADATA source only
    // (completion overlay + once-task additive overlay + day-level is_paused), never the
    // planning item list itself (that always comes from resolveEffectiveScheduleRange() below).
    //
    // §"identity audit" — daily_log_item.is_once_task rows can carry a non-null
    // activity_template_id (a parent can pick an existing activity as a one-off "just today"
    // extra occurrence — see src/routes/schedules/items.js). Matching completion by
    // activity_template_id alone would therefore be unsafe for once-task rows: it could
    // accidentally overlay a one-off's completion onto the recurring canonical item that
    // happens to share the same activity_template_id, or silently absorb the once-task into the
    // canonical row instead of showing it as the additional, separate occurrence it actually is.
    // Completion overlay therefore only ever reads NON-once-task log rows; once-task rows are
    // always kept as a wholly separate, additive list, regardless of activity_template_id.
    const logsResult = await db.query(
      `SELECT dl.id AS log_id,
              dl.date::text AS date,
              dl.is_paused,
              dli.id AS item_id,
              dli.activity_template_id,
              dli.is_once_task,
              dli.name,
              dli.icon,
              dli.star_value,
              dli.start_time,
              dli.end_time,
              dli.sort_order,
              dli.section,
              dli.completed
       FROM daily_log dl
       LEFT JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       WHERE dl.child_id = $1
         AND dl.date >= $2::date
         AND dl.date <= $3::date
       ORDER BY dl.date ASC, dli.sort_order ASC`,
      [childId, weekStart, weekEnd]
    );

    // Group logs by date string: a completion-by-template-id map for the overlay, plus a
    // separate additive once-task list.
    const logsByDate = {};
    for (const row of logsResult.rows) {
      const dateStr = row.date.slice(0, 10);
      if (!logsByDate[dateStr]) {
        logsByDate[dateStr] = {
          log_id: row.log_id,
          is_paused: row.is_paused,
          completionByTemplateId: new Map(),
          onceTasks: [],
        };
      }
      if (!row.item_id) continue;
      if (row.is_once_task) {
        if (row.name) logsByDate[dateStr].onceTasks.push(onceTaskLogItemToCalendarActivity(row));
      } else if (row.activity_template_id) {
        logsByDate[dateStr].completionByTemplateId.set(row.activity_template_id, row.completed);
      }
    }

    // Build day objects (Mon=index 0, ..., Sun=index 6)
    // dates[0]=Mon(1), dates[1]=Tue(2), ..., dates[5]=Sat(6), dates[6]=Sun(0)
    const dowForIndex = [1, 2, 3, 4, 5, 6, 0]; // JS/DB dow for each date index

    const days = dates.map((dateStr, idx) => {
      const dow = dowForIndex[idx];
      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;

      // Phase 4 — the planning item list ALWAYS comes from the canonical resolver, for every
      // date, regardless of whether a daily_log exists. A populated explicit Special Day, an
      // active Special Period under any apply_mode, or custody-aware weekly (with date
      // exclusions already applied) are all handled identically by the resolver — an empty
      // explicit Special Day is intentionally NOT special-cased here, since the resolver already
      // falls through to Period/Weekly for that case. If the plan changes after a log exists
      // (weekly edited, a period starts/ends/changes), Calendar reflects the NEW plan
      // immediately — a stale log item for a since-removed/replaced planning slot can never
      // resurrect or replace the current plan; only a matching CURRENT canonical item can be
      // overlaid with completion status.
      const effective = effectiveByDate.get(dateStr);
      const baseType = effective ? effective.source.base_type : BASE_TYPES.NONE;
      const log = logsByDate[dateStr];

      let activities = (effective ? effective.items : []).map((item) => {
        const activity = effectiveItemToCalendarActivity(item, baseType);
        // Completion overlay: only ever matches against non-once-task log rows (see the query
        // comment above on why once-tasks are excluded from this map).
        if (log && item.activity_template_id != null && log.completionByTemplateId.has(item.activity_template_id)) {
          activity.completed = log.completionByTemplateId.get(item.activity_template_id);
        }
        return activity;
      });
      // Once-tasks are additive execution-only items — appended after the canonical planning
      // items, never replacing or being deduped against them, and never influencing base_type.
      if (log && log.onceTasks.length > 0) activities.push(...log.onceTasks);

      const hasLog = !!log;
      const isPaused = log ? (log.is_paused || false) : false;
      const isSpecialDay = !!specialByDate[dateStr];
      const specialDayNote = isSpecialDay ? (specialByDate[dateStr].note || null) : null;
      // §"Special Day badge" — isSpecialDay/specialDayNote are existence/note metadata ONLY
      // (a parent's note on the date, worth surfacing even if the row is empty and therefore
      // falls through to Period/Weekly for actual planned items — see docs "Phase 4"). They must
      // never be read as "this date's plan came from a full override": isSpecialDayActive is the
      // authoritative signal for that (true only when the resolver actually used a populated
      // Special Day as the base for this date).
      const isSpecialDayActive = baseType === BASE_TYPES.SPECIAL_DAY;

      let custody = null;
      if (custodyActive) {
        const resolved = custodyByDate[dateStr];
        custody = calendarDayCustodyPayload(
          resolved,
          engineCtx.schedule,
          engineCtx.parentHomeId
        );
        if (myDaysOnly && engineCtx.parentHomeId && custody && custody.isMyDay === false) {
          activities = [];
        }
      }

      const totalCount = activities.length;
      const completedCount = activities.filter(a => a.completed === true).length;

      return {
        date: dateStr,
        dayOfWeek: dow,
        dayName: DAY_NAMES_SV[dow],
        isToday,
        isPast,
        hasLog,
        isPaused,
        isSpecialDay,
        isSpecialDayActive,
        specialDayNote,
        activities,
        completedCount,
        totalCount,
        custody,
      };
    });

    const locale = await getFamilyPreferredLocale(child.family_id);
    for (const day of days) {
      day.activities = await localizeActivityItems(day.activities, locale);
      day.dayName = localizedDayName(locale, day.date, day.dayOfWeek);
    }

    const weekBanner = custodyActive
      ? (() => {
        const weekResolved = resolveCustodyDateSync(engineCtx, getWeekMondayIso(todayStr));
        if (!weekResolved.activeHome) return null;
        return {
          label: weekResolved.activeHome.label,
          color: weekResolved.activeHome.color,
          variant: legacyWeekVariant(engineCtx.schedule, weekResolved.activeHome),
        };
      })()
      : null;

    res.json({
      child: { id: child.id, name: child.name, emoji: child.emoji },
      weekStart,
      weekEnd,
      today: todayStr,
      custody: custodyActive
        ? {
            active: true,
            weekBanner: weekBanner
              ? { label: weekBanner.label, color: weekBanner.color, variant: weekBanner.variant }
              : null,
            myDaysFilter: myDaysOnly,
          }
        : { active: false },
      days,
    });
  } catch (err) {
    console.error('[CALENDAR] Week error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
