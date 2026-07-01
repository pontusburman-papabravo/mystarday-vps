/**
 * Calendar routes — parent calendar view with weekly navigation.
 *
 * GET /api/children/:childId/calendar-week?weekOffset=0
 *   Returns 7 days of the target week with activities from
 *   daily_log (if generated) or weekly_schedule template (if not).
 *   weekOffset: 0 = current week, +1 = next week, -1 = previous week.
 */

const express = require('express');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');
const { getLocalDateStr, getDayOfWeek } = require('../lib/daily-log-generator');
const { addDaysIso, getWeekMondayIso } = require('../lib/date-utils');
const { legacyWeekVariant } = require('../lib/custody-context-api');
const {
  loadCustodyContext,
  resolveCustodyDateSync,
} = require('../lib/custody-schedule-engine');
const { weekVariantForHomeId } = require('../lib/custody-schedule-resolve');
const { isActivationFlagEnabled, FLAG_KEYS } = require('../lib/activation-flags');

const router = express.Router({ mergeParams: true });

router.use(requireParent);

const DAY_NAMES_SV = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];

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
 * Template lookup: week_variant → custody_home_id → legacy null (same order as resolve).
 */
function templateActivitiesForDay(templatesByVariant, templatesByHome, dow, resolved, schedule) {
  const homeId = resolved?.activeHome?.id;
  const variant = weekVariantForHomeId(schedule, homeId);
  if (variant) {
    const byVariant = templatesByVariant[`${dow}_${variant}`];
    if (byVariant) return byVariant;
  }
  if (homeId) {
    const byHome = templatesByHome[`${dow}_${homeId}`];
    if (byHome) return byHome;
  }
  return templatesByVariant[`${dow}_legacy`] || [];
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

    // Fetch all weekly schedule templates for this child
    const templatesResult = await db.query(
      `SELECT ws.day_of_week,
              ws.week_variant,
              ws.custody_home_id,
              wsi.id AS item_id,
              at.name,
              at.icon,
              at.star_value,
              wsi.start_time, wsi.end_time, wsi.sort_order, wsi.section
       FROM weekly_schedule ws
       LEFT JOIN weekly_schedule_item wsi ON wsi.weekly_schedule_id = ws.id
       LEFT JOIN activity_template at ON at.id = wsi.activity_template_id
       WHERE ws.child_id = $1
         AND (
           ($2::boolean = false AND ws.week_variant IS NULL)
           OR ($2::boolean = true AND ws.week_variant IN ('a', 'b'))
         )
       ORDER BY ws.day_of_week ASC, ws.week_variant ASC NULLS FIRST, wsi.sort_order ASC`,
      [childId, custodyActive]
    );

    // Group templates by day_of_week + week_variant, and by custody_home_id fallback
    const templatesByVariant = {};
    const templatesByHome = {};
    for (const row of templatesResult.rows) {
      const variantKey = row.week_variant || 'legacy';
      const variantMapKey = `${row.day_of_week}_${variantKey}`;
      if (!templatesByVariant[variantMapKey]) templatesByVariant[variantMapKey] = [];
      if (row.custody_home_id) {
        const homeMapKey = `${row.day_of_week}_${row.custody_home_id}`;
        if (!templatesByHome[homeMapKey]) templatesByHome[homeMapKey] = [];
      }
      if (row.item_id && row.name) {
        const item = {
          id: row.item_id,
          name: row.name,
          icon: row.icon || '',
          star_value: row.star_value || 1,
          start_time: row.start_time || null,
          end_time: row.end_time || null,
          sort_order: row.sort_order || 0,
          section: row.section || 'dag',
          completed: null,
          source: 'template',
          is_exception: false,
        };
        templatesByVariant[variantMapKey].push(item);
        if (row.custody_home_id) {
          templatesByHome[`${row.day_of_week}_${row.custody_home_id}`].push(item);
        }
      }
    }

    // Fetch special day schedules for this week
    const specialDaysResult = await db.query(
      `SELECT sds.id AS schedule_id, sds.date::text AS date, sds.note,
              sdsi.id AS item_id, sdsi.name, sdsi.icon, sdsi.star_value,
              sdsi.start_time, sdsi.end_time, sdsi.sort_order, sdsi.section
       FROM special_day_schedule sds
       LEFT JOIN special_day_schedule_item sdsi ON sdsi.special_day_schedule_id = sds.id
       WHERE sds.child_id = $1
         AND sds.date >= $2::date
         AND sds.date <= $3::date
       ORDER BY sds.date ASC, sdsi.sort_order ASC`,
      [childId, weekStart, weekEnd]
    );

    // Group special days by date
    const specialByDate = {};
    for (const row of specialDaysResult.rows) {
      const dateStr = row.date.slice(0, 10);
      if (!specialByDate[dateStr]) {
        specialByDate[dateStr] = { schedule_id: row.schedule_id, note: row.note, items: [] };
      }
      if (row.item_id && row.name) {
        specialByDate[dateStr].items.push({
          id: row.item_id,
          name: row.name,
          icon: row.icon || '',
          star_value: row.star_value || 1,
          start_time: row.start_time || null,
          end_time: row.end_time || null,
          sort_order: row.sort_order || 0,
          section: row.section || 'dag',
          completed: null,
          source: 'special_day',
          is_exception: true,
        });
      }
    }

    // Fetch daily logs for this week
    const logsResult = await db.query(
      `SELECT dl.id AS log_id,
              dl.date::text AS date,
              dl.is_paused,
              dli.id AS item_id,
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

    // Group logs by date string
    const logsByDate = {};
    for (const row of logsResult.rows) {
      const dateStr = row.date.slice(0, 10);
      if (!logsByDate[dateStr]) {
        logsByDate[dateStr] = {
          log_id: row.log_id,
          is_paused: row.is_paused,
          items: [],
        };
      }
      if (row.item_id && row.name) {
        logsByDate[dateStr].items.push({
          id: row.item_id,
          name: row.name,
          icon: row.icon || '',
          star_value: row.star_value || 1,
          start_time: row.start_time || null,
          end_time: row.end_time || null,
          sort_order: row.sort_order || 0,
          section: row.section || 'dag',
          completed: row.completed,
          source: 'log',
          is_exception: false,
        });
      }
    }

    // Build day objects (Mon=index 0, ..., Sun=index 6)
    // dates[0]=Mon(1), dates[1]=Tue(2), ..., dates[5]=Sat(6), dates[6]=Sun(0)
    const dowForIndex = [1, 2, 3, 4, 5, 6, 0]; // JS/DB dow for each date index

    const days = dates.map((dateStr, idx) => {
      const dow = dowForIndex[idx];
      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;

      let activities;
      let isPaused = false;
      let hasLog = false;
      const isSpecialDay = !!specialByDate[dateStr];
      const specialDayNote = isSpecialDay ? (specialByDate[dateStr].note || null) : null;

      if (logsByDate[dateStr]) {
        hasLog = true;
        isPaused = logsByDate[dateStr].is_paused || false;
        activities = logsByDate[dateStr].items;
      } else if (isSpecialDay) {
        // Use special day items when no log generated yet
        activities = specialByDate[dateStr].items;
      } else {
        const resolved = custodyByDate[dateStr];
        activities = custodyActive
          ? [...templateActivitiesForDay(
            templatesByVariant,
            templatesByHome,
            dow,
            resolved,
            engineCtx.schedule
          )]
          : [...(templatesByVariant[`${dow}_legacy`] || [])];
      }

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
        specialDayNote,
        activities,
        completedCount,
        totalCount,
        custody,
      };
    });

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
