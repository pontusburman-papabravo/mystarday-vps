'use strict';

const { DateTime } = require('luxon');
const db = require('../db');
const { deriveFirstWeekDay } = require('./first-week');

const FIRST_MONTH_MIN_DAY = 8;
const FIRST_MONTH_MAX_DAY = 30;
const VACATION_GAP_DAYS = 5;
const CALM_WEEK_COMPLETION_DAYS = 5;
const MORNING_FLOW_DAYS = 3;
const TRADITION_WEEK_COUNT = 3;

/**
 * Calendar days since first_success (same anchor as first week).
 * @returns {number|null} 8–30 during first month window, else null
 */
function effectiveFirstMonthDay(firstSuccessAt, now = new Date(), timezone = 'Europe/Stockholm', celebrationShown = false) {
  if (!firstSuccessAt || !celebrationShown) return null;
  const raw = deriveFirstWeekDay(firstSuccessAt, now, timezone);
  if (raw < FIRST_MONTH_MIN_DAY || raw > FIRST_MONTH_MAX_DAY) return null;
  return raw;
}

function monthWeek(day) {
  if (!day || day < FIRST_MONTH_MIN_DAY) return null;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

function isMomentDismissed(milestones, momentKey) {
  return Boolean(milestones[`fm_dismissed_${momentKey}`]);
}

/**
 * Pick first-month product moment (pure). Most days silent — product says less.
 * @returns {{ experience: string|null, priority: string, reason: string, silent?: boolean, week?: number }}
 */
function pickFirstMonthExperience(input) {
  const {
    day,
    signals = {},
    milestones = {},
    now = new Date(),
    timezone = 'Europe/Stockholm',
  } = input;

  if (!day || day < FIRST_MONTH_MIN_DAY || day > FIRST_MONTH_MAX_DAY) {
    return { experience: null, priority: 'none', reason: 'outside_first_month' };
  }

  if (milestones.month_reflection_completed) {
    return { experience: null, priority: 'none', reason: 'month_complete' };
  }

  const week = monthWeek(day);

  // Return after vacation — once per gap, any day in month
  if (signals.returnedFromGap && !isMomentDismissed(milestones, 'fm_welcome_back')) {
    return { experience: 'fm_welcome_back', priority: 'affirmation', reason: 'returned_from_gap', week };
  }

  // Day 30 — month affirmation (confirm, don't celebrate)
  if (day === FIRST_MONTH_MAX_DAY) {
    return { experience: 'fm_month_affirmation', priority: 'reflection', reason: 'day_30_affirmation', week: 4 };
  }

  // Week 2 — family creates own routines; product whispers
  if (week === 2) {
    if (day === 10 && signals.hasCustomActivity && !isMomentDismissed(milestones, 'fm_own_initiative')) {
      return { experience: 'fm_own_initiative', priority: 'affirmation', reason: 'own_initiative', week };
    }
    if (day === 13 && signals.calmWeek && !isMomentDismissed(milestones, 'fm_calm_week')) {
      return { experience: 'fm_calm_week', priority: 'affirmation', reason: 'calm_week', week };
    }
    if (day === 14 && signals.coparentJoined && !isMomentDismissed(milestones, 'fm_coparent_roots')) {
      return { experience: 'fm_coparent_roots', priority: 'affirmation', reason: 'coparent_roots', week };
    }
    return { experience: null, priority: 'none', reason: `week_2_day_${day}_silent`, silent: true, week };
  }

  // Week 3 — child explores; parent needs less support
  if (week === 3) {
    if (day === 17 && signals.hasNewDiscovery && signals.childLedWeek && !isMomentDismissed(milestones, 'fm_child_explores')) {
      return { experience: 'fm_child_explores', priority: 'coach', reason: 'child_explores', week };
    }
    if (day === 19 && signals.childSelfMorningDays >= MORNING_FLOW_DAYS && !isMomentDismissed(milestones, 'fm_morning_flows')) {
      return { experience: 'fm_morning_flows', priority: 'affirmation', reason: 'morning_flows', week };
    }
    if (day === 20 && signals.childCount >= 2 && signals.siblingActivity && !isMomentDismissed(milestones, 'fm_sibling_moment')) {
      return { experience: 'fm_sibling_moment', priority: 'affirmation', reason: 'sibling_moment', week };
    }
    return { experience: null, priority: 'none', reason: `week_3_day_${day}_silent`, silent: true, week };
  }

  // Week 4 — ownership; product confirms
  if (week === 4) {
    if (day === 25 && signals.hasTradition && !isMomentDismissed(milestones, 'fm_tradition')) {
      return { experience: 'fm_tradition', priority: 'affirmation', reason: 'first_tradition', week };
    }
    if (day >= 26 && day <= 29) {
      return { experience: null, priority: 'none', reason: `week_4_day_${day}_silent`, silent: true, week };
    }
    return { experience: null, priority: 'none', reason: `week_4_day_${day}_silent`, silent: true, week };
  }

  return { experience: null, priority: 'none', reason: 'default', silent: true, week };
}

/**
 * Warm month-end narrative — confirmation, not statistics.
 */
function buildMonthAffirmationStory({
  childName = 'barnet',
  childCount = 1,
  childNames = [],
  hadCustomRoutine = false,
  coparentPresent = false,
}) {
  if (childCount >= 2) {
    const names = childNames.filter(Boolean);
    const who = names.length >= 2 ? `${names[0]} och ${names[1]}` : (names[0] || 'barnen');
    let story = `En månad har gått. ${who} och ni har hittat er egen väg.\n\n`;
    if (hadCustomRoutine) story += 'Rutinerna är era nu — inte appens.\n\n';
    if (coparentPresent) story += 'Ni gör det tillsammans, även när vardagen skiftar.\n\n';
    return `${story}Det här är er vardag.`;
  }

  const name = childName.trim() || 'barnet';
  let story = `En månad har gått. ${name} och ni har hittat er egen rytm.\n\n`;
  if (hadCustomRoutine) story += 'Rutinerna är era nu — inte appens.\n\n';
  if (coparentPresent) story += 'Ni gör det tillsammans, även när vardagen skiftar.\n\n';
  return `${story}Det här är er vardag.`;
}

async function loadFirstMonthSignals(familyId, firstSuccessAt, timezone = 'Europe/Stockholm') {
  const now = DateTime.now().setZone(timezone);
  const yesterday = now.minus({ days: 1 }).toISODate();
  const twoDaysAgo = now.minus({ days: 2 }).toISODate();
  const weekAgo = now.minus({ days: 7 }).toISODate();
  const fsIso = firstSuccessAt instanceof Date
    ? firstSuccessAt.toISOString()
    : new Date(firstSuccessAt).toISOString();

  const [
    childrenRes,
    completionsRes,
    loginsRes,
    discoveryRes,
    morningRes,
    customActRes,
    traditionRes,
    gapRes,
    coparentRes,
    siblingRes,
    familyRes,
  ] = await Promise.all([
    db.query(
      `SELECT id, name FROM child WHERE family_id = $1 ORDER BY sort_order, created_at`,
      [familyId]
    ),
    db.query(
      `SELECT
         COUNT(DISTINCT dli.completed_date)::int AS completion_days,
         COUNT(DISTINCT CASE WHEN dli.completed_date >= $2::date THEN dli.completed_date END)::int AS last_7_days,
         COUNT(DISTINCT CASE WHEN dli.completed_date = $3::date THEN dli.id END)::int AS yesterday_count,
         COUNT(DISTINCT CASE WHEN dli.completed_date = $4::date THEN dli.id END)::int AS two_days_ago_count
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       WHERE c.family_id = $1 AND dli.completed = true`,
      [familyId, weekAgo, yesterday, twoDaysAgo]
    ),
    db.query(
      `SELECT COUNT(DISTINCT le.user_id)::int AS child_logins_7d
       FROM login_event le
       JOIN child c ON c.id = le.user_id
       WHERE c.family_id = $1
         AND le.role = 'child'
         AND le.occurred_at >= $2::timestamptz`,
      [familyId, now.minus({ days: 7 }).toISO()]
    ),
    db.query(
      `SELECT COUNT(*)::int AS recent_unlocks
       FROM child_collectible cc
       JOIN child c ON c.id = cc.child_id
       WHERE c.family_id = $1
         AND cc.unlocked_at >= NOW() - interval '7 days'`,
      [familyId]
    ),
    db.query(
      `SELECT COUNT(DISTINCT dli.completed_date)::int AS child_morning_days
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       WHERE c.family_id = $1
         AND dli.completed = true
         AND dli.completed_by = 'child'
         AND dli.section = 'fm'
         AND dli.completed_date >= $2::date`,
      [familyId, weekAgo]
    ),
    db.query(
      `SELECT EXISTS (
         SELECT 1 FROM activity_template
         WHERE family_id = $1 AND source = 'user'
       ) AS has_custom`,
      [familyId]
    ),
    db.query(
      `SELECT EXISTS (
         SELECT 1 FROM (
           SELECT dli.activity_template_id, EXTRACT(DOW FROM dli.completed_date) AS dow,
                  COUNT(DISTINCT dli.completed_date)::int AS cnt
           FROM daily_log_item dli
           JOIN daily_log dl ON dl.id = dli.daily_log_id
           JOIN child c ON c.id = dl.child_id
           WHERE c.family_id = $1 AND dli.completed = true AND dli.activity_template_id IS NOT NULL
           GROUP BY dli.activity_template_id, EXTRACT(DOW FROM dli.completed_date)
           HAVING COUNT(DISTINCT dli.completed_date) >= $2
         ) t
       ) AS has_tradition`,
      [familyId, TRADITION_WEEK_COUNT]
    ),
    db.query(
      `WITH dates AS (
         SELECT DISTINCT dli.completed_date AS d
         FROM daily_log_item dli
         JOIN daily_log dl ON dl.id = dli.daily_log_id
         JOIN child c ON c.id = dl.child_id
         WHERE c.family_id = $1 AND dli.completed = true
         ORDER BY d DESC
         LIMIT 2
       )
       SELECT
         (SELECT MAX(d) FROM dates) AS latest,
         (SELECT MIN(d) FROM dates) AS previous`,
      [familyId]
    ),
    db.query(
      `SELECT EXISTS (
         SELECT 1 FROM family_milestones
         WHERE family_id = $1 AND milestone = 'coparent_joined'
       ) AS joined`,
      [familyId]
    ),
    db.query(
      `SELECT COUNT(DISTINCT dl.child_id)::int AS active_children
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       WHERE c.family_id = $1
         AND dli.completed = true
         AND dli.completed_date >= $2::date`,
      [familyId, weekAgo]
    ),
    db.query('SELECT timezone FROM family WHERE id = $1', [familyId]),
  ]);

  const children = childrenRes.rows;
  const stats = completionsRes.rows[0] || {};
  const childLogins7d = loginsRes.rows[0]?.child_logins_7d || 0;
  const recentUnlocks = discoveryRes.rows[0]?.recent_unlocks || 0;
  const childSelfMorningDays = morningRes.rows[0]?.child_morning_days || 0;
  const hasCustomActivity = Boolean(customActRes.rows[0]?.has_custom);
  const hasTradition = Boolean(traditionRes.rows[0]?.has_tradition);
  const coparentJoined = Boolean(coparentRes.rows[0]?.joined);
  const siblingActivity = (siblingRes.rows[0]?.active_children || 0) >= 2;
  const tz = familyRes.rows[0]?.timezone || timezone;

  const latest = gapRes.rows[0]?.latest;
  const previous = gapRes.rows[0]?.previous;
  let returnedFromGap = false;
  if (latest && previous) {
    const gap = DateTime.fromISO(String(latest)).diff(DateTime.fromISO(String(previous)), 'days').days;
    const daysSinceLatest = now.startOf('day').diff(DateTime.fromISO(String(latest)), 'days').days;
    returnedFromGap = gap >= VACATION_GAP_DAYS && daysSinceLatest <= 1;
  }

  const calmWeek = (stats.last_7_days || 0) >= CALM_WEEK_COMPLETION_DAYS;
  const childLedWeek = childLogins7d >= CALM_WEEK_COMPLETION_DAYS;
  const missedYesterday = (stats.completion_days || 0) > 0 && (stats.yesterday_count || 0) === 0;
  const missedTwoDays = (stats.yesterday_count || 0) === 0
    && (stats.two_days_ago_count || 0) === 0
    && (stats.completion_days || 0) > 0;

  const primaryChild = children[0];
  return {
    timezone: tz,
    childName: primaryChild?.name || 'barnet',
    childCount: children.length,
    children: children.map((c) => ({ id: c.id, name: c.name })),
    firstSuccessAt: fsIso,
    hasCustomActivity,
    hasTradition,
    coparentJoined,
    calmWeek,
    childLedWeek,
    childSelfMorningDays,
    hasNewDiscovery: recentUnlocks > 0,
    siblingActivity,
    returnedFromGap,
    missedYesterday,
    missedTwoDays,
    completionDays: stats.completion_days || 0,
  };
}

async function getFirstSuccessAt(familyId) {
  const result = await db.query(
    `SELECT occurred_at FROM family_milestones
     WHERE family_id = $1 AND milestone = 'first_success'
     LIMIT 1`,
    [familyId]
  );
  return result.rows[0]?.occurred_at || null;
}

async function buildFirstMonthContext(familyId, milestones) {
  const firstSuccessAt = milestones.first_success
    ? new Date(milestones.first_success)
    : await getFirstSuccessAt(familyId);

  if (!firstSuccessAt) {
    return { active: false, day: 0, week: null };
  }

  const signals = await loadFirstMonthSignals(familyId, firstSuccessAt);
  const celebrationShown = Boolean(milestones._celebration_shown);
  const rawDay = deriveFirstWeekDay(firstSuccessAt, new Date(), signals.timezone);
  const day = effectiveFirstMonthDay(firstSuccessAt, new Date(), signals.timezone, celebrationShown);
  const pick = pickFirstMonthExperience({
    day: day || rawDay,
    signals,
    milestones,
    timezone: signals.timezone,
  });

  let affirmationStory = null;
  if (pick.experience === 'fm_month_affirmation') {
    affirmationStory = buildMonthAffirmationStory({
      childName: signals.childName,
      childCount: signals.childCount,
      childNames: signals.children.map((c) => c.name),
      hadCustomRoutine: signals.hasCustomActivity,
      coparentPresent: signals.coparentJoined,
    });
  }

  return {
    active: day !== null,
    day: day || rawDay,
    effective_day: day,
    week: pick.week || monthWeek(day || rawDay),
    experience: pick.experience,
    priority: pick.priority,
    reason: pick.reason,
    silent: pick.silent || false,
    signals: {
      has_custom_activity: signals.hasCustomActivity,
      calm_week: signals.calmWeek,
      child_led_week: signals.childLedWeek,
      returned_from_gap: signals.returnedFromGap,
      child_count: signals.childCount,
      missed_yesterday: signals.missedYesterday,
      missed_two_days: signals.missedTwoDays,
      has_new_discovery: signals.hasNewDiscovery,
      child_self_morning_days: signals.childSelfMorningDays,
      sibling_activity: signals.siblingActivity,
      coparent_joined: signals.coparentJoined,
      has_tradition: signals.hasTradition,
      timezone: signals.timezone,
    },
    affirmation_story: affirmationStory,
    child_name: signals.childName,
  };
}

module.exports = {
  FIRST_MONTH_MIN_DAY,
  FIRST_MONTH_MAX_DAY,
  VACATION_GAP_DAYS,
  effectiveFirstMonthDay,
  monthWeek,
  pickFirstMonthExperience,
  buildMonthAffirmationStory,
  loadFirstMonthSignals,
  buildFirstMonthContext,
  getFirstSuccessAt,
  isMomentDismissed,
};
