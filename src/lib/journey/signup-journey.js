'use strict';

const { DateTime } = require('luxon');
const db = require('../db');

const SIGNUP_JOURNEY_MAX_DAY = 14;
const SILENT_DAY_MIN = 4;
const SILENT_DAY_MAX = 6;

/**
 * Calendar day since family signup (day 1 = signup day, family timezone).
 * @param {string|Date} signupAt
 * @param {Date} [now]
 * @param {string} [timezone]
 * @returns {number}
 */
function deriveSignupCalendarDay(signupAt, now = new Date(), timezone = 'Europe/Stockholm') {
  if (!signupAt) return 0;
  const start = DateTime.fromJSDate(
    signupAt instanceof Date ? signupAt : new Date(signupAt),
    { zone: timezone }
  ).startOf('day');
  const today = DateTime.fromJSDate(now, { zone: timezone }).startOf('day');
  return Math.floor(today.diff(start, 'days').days) + 1;
}

/**
 * Event-first, day-second signup Journey picker (pure).
 * @param {{ day: number, milestones?: object, signals?: object }} input
 */
function pickSignupJourneyExperience(input) {
  const { day, milestones = {}, signals = {} } = input;

  if (!milestones.routine_ready) {
    return { experience: null, priority: 'none', reason: 'no_routine' };
  }
  if (!day || day < 1 || day > SIGNUP_JOURNEY_MAX_DAY) {
    return { experience: null, priority: 'none', reason: 'outside_window' };
  }

  if (day === 14) {
    return { experience: null, priority: 'none', reason: 'day_14_retention_internal' };
  }

  const totalCompletions = signals.totalCompletions || 0;

  // Event-first: first completion → introduce stars (never if many completions already)
  if (
    signals.pendingParentAck
    && totalCompletions >= 1
    && totalCompletions <= 5
    && !milestones.parent_saw_completion
  ) {
    return { experience: 'sj_introduce_stars', priority: 'coach', reason: 'first_completion' };
  }

  if (
    signals.childLoginCount === 1
    && totalCompletions === 0
    && day <= 3
  ) {
    return { experience: 'sj_welcome_child_login', priority: 'celebration', reason: 'child_first_login' };
  }

  if (day >= SILENT_DAY_MIN && day <= SILENT_DAY_MAX) {
    return { experience: null, priority: 'none', silent: true, reason: 'silent_midweek' };
  }

  if (day === 7) {
    return { experience: 'sj_day7_reflection', priority: 'reflection', reason: 'day_7_reflection' };
  }

  if (signals.noParentActivity48h && day <= 3) {
    return { experience: 'sj_help_get_started', priority: 'coach', reason: 'stale_48h' };
  }

  if (day === 3) {
    if (signals.childEverLoggedIn) {
      if (totalCompletions > 0 && totalCompletions <= 5) {
        return { experience: 'sj_celebrate_star', priority: 'celebration', reason: 'day_3_celebrate' };
      }
      return { experience: null, priority: 'none', reason: 'day_3_waiting_completion' };
    }
    return { experience: 'sj_day3_child_try', priority: 'coach', reason: 'day_3_child_try' };
  }

  if (day === 2) {
    return { experience: 'sj_day2_try_routine', priority: 'coach', reason: 'day_2_try_routine' };
  }

  if (day === 1) {
    return { experience: 'sj_day1_child_preview', priority: 'coach', reason: 'day_1_preview' };
  }

  return { experience: null, priority: 'none', reason: 'default_idle' };
}

async function loadSignupJourneySignals(familyId, timezone = 'Europe/Stockholm') {
  const now = DateTime.now().setZone(timezone);
  const since48h = now.minus({ hours: 48 }).toISO();

  const [familyRes, completionsRes, childLoginRes, parentLoginRes, childrenRes] = await Promise.all([
    db.query('SELECT created_at, timezone FROM family WHERE id = $1', [familyId]),
    db.query(
      `SELECT COUNT(dli.id)::int AS total
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       WHERE c.family_id = $1 AND dli.completed = true`,
      [familyId]
    ),
    db.query(
      `SELECT
         COUNT(*)::int AS ever,
         COUNT(*) FILTER (WHERE le.occurred_at >= $2::timestamptz)::int AS today
       FROM login_event le
       JOIN child c ON c.id = le.user_id
       WHERE c.family_id = $1 AND le.role = 'child'`,
      [familyId, now.startOf('day').toISO()]
    ),
    db.query(
      `SELECT MAX(le.occurred_at) AS last_parent_login
       FROM login_event le
       JOIN parent p ON p.id = le.user_id
       WHERE p.family_id = $1 AND le.role = 'parent'`,
      [familyId]
    ),
    db.query(
      'SELECT id, name FROM child WHERE family_id = $1 ORDER BY sort_order, created_at LIMIT 1',
      [familyId]
    ),
  ]);

  const fam = familyRes.rows[0];
  const tz = fam?.timezone || timezone;
  const signupAt = fam?.created_at;
  const totalCompletions = completionsRes.rows[0]?.total || 0;
  const childEver = childLoginRes.rows[0]?.ever || 0;
  const childToday = childLoginRes.rows[0]?.today || 0;
  const lastParent = parentLoginRes.rows[0]?.last_parent_login;
  const noParentActivity48h = !lastParent || new Date(lastParent) < new Date(since48h);
  const primaryChild = childrenRes.rows[0];

  return {
    timezone: tz,
    signupAt,
    childName: primaryChild?.name || 'barnet',
    childId: primaryChild?.id || null,
    totalCompletions,
    childEverLoggedIn: childEver > 0,
    childLoginCount: childEver,
    childFirstLoginToday: childEver === childToday && childToday > 0,
    childLoggedInBefore: childEver > 1 || (childEver === 1 && childToday === 0),
    noParentActivity48h,
    pendingParentAck: totalCompletions > 0,
  };
}

/**
 * Build signup_journey block for journey context API.
 */
async function buildSignupJourneyContext(familyId, milestones) {
  const signals = await loadSignupJourneySignals(familyId);
  const day = deriveSignupCalendarDay(signals.signupAt, new Date(), signals.timezone);
  const pick = pickSignupJourneyExperience({ day, milestones, signals });

  return {
    active: day >= 1 && day <= SIGNUP_JOURNEY_MAX_DAY && Boolean(milestones.routine_ready),
    day,
    effective_day: day,
    experience: pick.experience,
    priority: pick.priority,
    silent: Boolean(pick.silent),
    reason: pick.reason,
    signals: {
      child_name: signals.childName,
      child_id: signals.childId,
      total_completions: signals.totalCompletions,
      child_ever_logged_in: signals.childEverLoggedIn,
    },
    reflection_story: pick.experience === 'sj_day7_reflection'
      ? buildSignupReflectionStory(signals.childName, signals.totalCompletions > 0)
      : null,
  };
}

function buildSignupReflectionStory(childName, anyCompletion) {
  const name = (childName || 'barnet').trim() || 'barnet';
  if (anyCompletion) {
    return `Den här veckan började ${name} hitta sin rytm.\n\nNi gjorde det i er egen takt — det räcker.`;
  }
  return `Den här veckan lade ni grunden tillsammans.\n\nRutinen finns kvar när ni är redo.`;
}

module.exports = {
  SIGNUP_JOURNEY_MAX_DAY,
  deriveSignupCalendarDay,
  pickSignupJourneyExperience,
  loadSignupJourneySignals,
  buildSignupJourneyContext,
  buildSignupReflectionStory,
};
