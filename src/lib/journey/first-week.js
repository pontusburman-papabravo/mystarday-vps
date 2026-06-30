'use strict';

const { DateTime } = require('luxon');
const db = require('../db');

const FIRST_WEEK_MAX_DAY = 7;
const EVENING_HOUR = 17;

/**
 * Calendar days since first_success (family timezone).
 * Day 0 = same calendar day as first_success; day 1 = next morning, etc.
 * @param {string|Date} firstSuccessAt
 * @param {Date} [now]
 * @param {string} [timezone]
 * @returns {number} 0–7+ (uncapped for callers that need >7)
 */
function deriveFirstWeekDay(firstSuccessAt, now = new Date(), timezone = 'Europe/Stockholm') {
  if (!firstSuccessAt) return 0;
  const fs = DateTime.fromJSDate(
    firstSuccessAt instanceof Date ? firstSuccessAt : new Date(firstSuccessAt),
    { zone: timezone }
  );
  const today = DateTime.fromJSDate(now, { zone: timezone }).startOf('day');
  const fsDay = fs.startOf('day');
  const diff = Math.floor(today.diff(fsDay, 'days').days);
  return Math.max(0, diff);
}

/**
 * Effective first-week day for product (1–7 during first week, 0 before/at celebration).
 * @returns {number|null} null when outside first week window
 */
function effectiveFirstWeekDay(firstSuccessAt, now, timezone, celebrationShown) {
  if (!firstSuccessAt || !celebrationShown) return null;
  const raw = deriveFirstWeekDay(firstSuccessAt, now, timezone);
  if (raw < 1 || raw > FIRST_WEEK_MAX_DAY) return null;
  return raw;
}

function isEveningHour(now, timezone = 'Europe/Stockholm') {
  const dt = DateTime.fromJSDate(now, { zone: timezone });
  return dt.hour >= EVENING_HOUR;
}

/**
 * Pick first-week experience key from signals (pure).
 * @param {{ day: number, signals?: object, milestones?: object, now?: Date, timezone?: string }} input
 * @returns {{ experience: string|null, priority: string, reason: string, silent?: boolean }}
 */
function pickFirstWeekExperience(input) {
  const { day, signals = {}, milestones = {}, now = new Date(), timezone = 'Europe/Stockholm' } = input;

  if (!day || day < 1 || day > FIRST_WEEK_MAX_DAY) {
    return { experience: null, priority: 'none', reason: 'outside_first_week' };
  }

  if (milestones.week_reflection_completed) {
    return { experience: null, priority: 'none', reason: 'reflection_done' };
  }

  const dismissedKey = `fw_day_dismissed_${day}`;
  if (milestones[dismissedKey]) {
    return { experience: null, priority: 'none', reason: 'day_dismissed' };
  }

  // Day 7 — warm week reflection (not statistics)
  if (day === 7) {
    return { experience: 'fw_week_reflection', priority: 'reflection', reason: 'day_7_reflection' };
  }

  // Day 6 — product steps back; family leads
  if (day === 6) {
    return { experience: null, priority: 'none', reason: 'day_6_family_leads', silent: true };
  }

  // Day 5 — parent notices calmer mornings; product stays quiet
  if (day === 5) {
    return { experience: null, priority: 'none', reason: 'day_5_silent', silent: true };
  }

  // Day 4 — spontaneous world discovery (natural consequence, not reward framing)
  if (day === 4) {
    if (signals.hasNewDiscovery) {
      return { experience: 'fw_day4_discovery', priority: 'coach', reason: 'day_4_discovery' };
    }
    return { experience: null, priority: 'none', reason: 'day_4_no_discovery', silent: true };
  }

  // Day 3 — calm setback when activity missed; no shame, no streak loss
  if (day === 3) {
    if (signals.missedYesterday || signals.missedTwoDays) {
      return { experience: 'fw_day3_new_day', priority: 'coach', reason: 'day_3_setback' };
    }
    return { experience: null, priority: 'none', reason: 'day_3_on_track', silent: true };
  }

  // Day 2 — child leads; product whispers less
  if (day === 2) {
    if (signals.childLoggedInToday) {
      return { experience: null, priority: 'none', reason: 'day_2_child_leads', silent: true };
    }
    return { experience: 'fw_day2_quiet', priority: 'coach', reason: 'day_2_gentle' };
  }

  // Day 1 — first morning / first evening routine
  if (day === 1) {
    if (isEveningHour(now, timezone)) {
      return { experience: 'fw_day1_evening', priority: 'coach', reason: 'day_1_evening' };
    }
    return { experience: 'fw_day1_morning', priority: 'coach', reason: 'day_1_morning' };
  }

  return { experience: null, priority: 'none', reason: 'default' };
}

/**
 * Warm narrative for week reflection — not stats, not productivity.
 */
function buildWeekReflectionStory({
  childName = 'barnet',
  childCount = 1,
  childNames = [],
  hadMorningRoutine = false,
  anyCompletion = false,
}) {
  if (childCount >= 2) {
    const names = childNames.filter(Boolean);
    const who = names.length >= 2
      ? `${names[0]} och ${names[1]}`
      : (names[0] || 'barnen');
    if (hadMorningRoutine || anyCompletion) {
      return `Den här veckan började ${who} hitta sin egen rytm i vardagen.\n\nNi gjorde det tillsammans.`;
    }
    return `Den här veckan lärde ni känna rutinen tillsammans.\n\nImorgon är en ny dag — och ni är redo.`;
  }

  const name = childName.trim() || 'barnet';
  if (hadMorningRoutine || anyCompletion) {
    return `Den här veckan tog ${name} sina första steg mot en egen morgonrutin.\n\nNi gjorde det tillsammans.`;
  }
  return `Den här veckan lärde ni känna rutinen tillsammans.\n\nImorgon är en ny dag — och ni är redo.`;
}

/**
 * Load async signals for first-week evaluator (DB).
 */
async function loadFirstWeekSignals(familyId, timezone = 'Europe/Stockholm') {
  const now = DateTime.now().setZone(timezone);
  const yesterday = now.minus({ days: 1 }).toISODate();
  const twoDaysAgo = now.minus({ days: 2 }).toISODate();

  const [childrenRes, completionsRes, loginsRes, discoveryRes, morningRes, familyRes] = await Promise.all([
    db.query(
      `SELECT id, name FROM child WHERE family_id = $1 ORDER BY sort_order, created_at`,
      [familyId]
    ),
    db.query(
      `SELECT
         COUNT(DISTINCT dli.completed_date)::int AS completion_days,
         COUNT(DISTINCT CASE WHEN dli.completed_date = $2::date THEN dli.id END)::int AS yesterday_count,
         COUNT(DISTINCT CASE WHEN dli.completed_date = $3::date THEN dli.id END)::int AS two_days_ago_count
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       WHERE c.family_id = $1 AND dli.completed = true`,
      [familyId, yesterday, twoDaysAgo]
    ),
    db.query(
      `SELECT COUNT(DISTINCT le.user_id)::int AS child_logins_today
       FROM login_event le
       JOIN child c ON c.id = le.user_id
       WHERE c.family_id = $1
         AND le.role = 'child'
         AND le.occurred_at >= $2::timestamptz
         AND le.occurred_at < ($2::date + interval '1 day')::timestamptz`,
      [familyId, now.startOf('day').toISO()]
    ),
    db.query(
      `SELECT COUNT(*)::int AS recent_unlocks
       FROM child_collectible cc
       JOIN child c ON c.id = cc.child_id
       WHERE c.family_id = $1
         AND cc.unlocked_at >= NOW() - interval '3 days'`,
      [familyId]
    ),
    db.query(
      `SELECT EXISTS (
         SELECT 1 FROM weekly_schedule_item wsi
         JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
         JOIN child c ON c.id = ws.child_id
         WHERE c.family_id = $1 AND wsi.section = 'fm'
       ) AS has_morning_schedule`,
      [familyId]
    ),
    db.query('SELECT timezone FROM family WHERE id = $1', [familyId]),
  ]);

  const children = childrenRes.rows;
  const stats = completionsRes.rows[0] || {};
  const childLoginsToday = loginsRes.rows[0]?.child_logins_today || 0;
  const recentUnlocks = discoveryRes.rows[0]?.recent_unlocks || 0;
  const hadMorningRoutine = Boolean(morningRes.rows[0]?.has_morning_schedule);
  const tz = familyRes.rows[0]?.timezone || timezone;

  const missedYesterday = (stats.completion_days || 0) > 0 && (stats.yesterday_count || 0) === 0;
  const missedTwoDays = (stats.yesterday_count || 0) === 0
    && (stats.two_days_ago_count || 0) === 0
    && (stats.completion_days || 0) > 0;

  const primaryChild = children[0];
  return {
    timezone: tz,
    childName: primaryChild?.name || 'barnet',
    childCount: children.length,
    completionDays: stats.completion_days || 0,
    hadMorningRoutine,
    missedYesterday,
    missedTwoDays,
    childLoggedInToday: childLoginsToday > 0,
    hasNewDiscovery: recentUnlocks > 0,
    children: children.map((c) => ({ id: c.id, name: c.name })),
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

/**
 * Build first_week block for journey context.
 */
async function buildFirstWeekContext(familyId, milestones) {
  const firstSuccessAt = milestones.first_success
    ? new Date(milestones.first_success)
    : await getFirstSuccessAt(familyId);

  if (!firstSuccessAt) {
    return { active: false, day: 0, phase_label: 'dag_0' };
  }

  const signals = await loadFirstWeekSignals(familyId);
  const celebrationShown = Boolean(milestones._celebration_shown);
  const rawDay = deriveFirstWeekDay(firstSuccessAt, new Date(), signals.timezone);
  const day = effectiveFirstWeekDay(firstSuccessAt, new Date(), signals.timezone, celebrationShown);
  const pick = pickFirstWeekExperience({
    day: day || rawDay,
    signals,
    milestones,
    timezone: signals.timezone,
  });

  let reflectionStory = null;
  if (pick.experience === 'fw_week_reflection') {
    reflectionStory = buildWeekReflectionStory({
      childName: signals.childName,
      childCount: signals.childCount,
      childNames: signals.children.map((c) => c.name),
      hadMorningRoutine: signals.hadMorningRoutine,
      anyCompletion: (signals.completionDays || 0) > 0,
    });
  }

  return {
    active: day !== null,
    day: day || rawDay,
    effective_day: day,
    experience: pick.experience,
    priority: pick.priority,
    reason: pick.reason,
    silent: pick.silent || false,
    signals: {
      missed_yesterday: signals.missedYesterday,
      missed_two_days: signals.missedTwoDays,
      child_logged_in_today: signals.childLoggedInToday,
      has_new_discovery: signals.hasNewDiscovery,
      child_count: signals.childCount,
      timezone: signals.timezone,
    },
    reflection_story: reflectionStory,
    child_name: signals.childName,
  };
}

module.exports = {
  FIRST_WEEK_MAX_DAY,
  EVENING_HOUR,
  deriveFirstWeekDay,
  effectiveFirstWeekDay,
  isEveningHour,
  pickFirstWeekExperience,
  buildWeekReflectionStory,
  loadFirstWeekSignals,
  buildFirstWeekContext,
  getFirstSuccessAt,
};
