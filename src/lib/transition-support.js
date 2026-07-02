'use strict';

/**
 * Övergångsstöd — pure phase computation from scheduled start vs now.
 * Phases: soon → Om X min (lead times) → now.
 */

const DEFAULT_LEAD_MINUTES = [5, 1];
const PHASE_LABELS_SV = {
  soon: 'Snart',
  now: 'Nu',
};

/**
 * @param {number[]} leadMinutes — enabled lead times in minutes (e.g. [5, 3, 1])
 * @returns {number[]}
 */
function normalizeLeadMinutes(leadMinutes) {
  if (!Array.isArray(leadMinutes) || leadMinutes.length === 0) {
    return [...DEFAULT_LEAD_MINUTES];
  }
  const unique = [...new Set(
    leadMinutes
      .map((n) => parseInt(n, 10))
      .filter((n) => !Number.isNaN(n) && n > 0 && n <= 60)
  )];
  unique.sort((a, b) => b - a);
  return unique.length > 0 ? unique : [...DEFAULT_LEAD_MINUTES];
}

/**
 * Parse "HH:MM" or "HH:MM:SS" to minutes since midnight.
 * @param {string|null|undefined} timeStr
 * @returns {number|null}
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Minutes from `now` until `startTime` (negative = already started).
 * @param {string} startTime — HH:MM
 * @param {Date} [now]
 * @returns {number|null}
 */
function minutesUntilStart(startTime, now = new Date()) {
  const startMins = parseTimeToMinutes(startTime);
  if (startMins === null) return null;
  const nowMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  return startMins - nowMins;
}

/**
 * @typedef {'soon'|'now'|`in_${number}`} TransitionPhaseKey
 */

/**
 * Compute transition phase from minutes until activity start.
 * @param {number|null} minutesUntil — from minutesUntilStart
 * @param {number[]} [leadMinutes]
 * @returns {{ phase: TransitionPhaseKey, label: string, leadMinute: number|null }}
 */
function computeTransitionPhase(minutesUntil, leadMinutes) {
  const leads = normalizeLeadMinutes(leadMinutes);

  if (minutesUntil === null || Number.isNaN(minutesUntil)) {
    return { phase: 'soon', label: PHASE_LABELS_SV.soon, leadMinute: null };
  }

  if (minutesUntil <= 0) {
    return { phase: 'now', label: PHASE_LABELS_SV.now, leadMinute: null };
  }

  for (const lead of leads) {
    if (minutesUntil <= lead) {
      return {
        phase: `in_${lead}`,
        label: lead === 1 ? 'Om 1 min' : `Om ${lead} min`,
        leadMinute: lead,
      };
    }
  }

  return { phase: 'soon', label: PHASE_LABELS_SV.soon, leadMinute: null };
}

/**
 * Full helper: start time string → phase object.
 * @param {string} startTime
 * @param {object} [options]
 * @param {number[]} [options.leadMinutes]
 * @param {Date} [options.now]
 */
function getTransitionFromStartTime(startTime, options = {}) {
  const minutesUntil = minutesUntilStart(startTime, options.now);
  return computeTransitionPhase(minutesUntil, options.leadMinutes);
}

module.exports = {
  DEFAULT_LEAD_MINUTES,
  PHASE_LABELS_SV,
  normalizeLeadMinutes,
  parseTimeToMinutes,
  minutesUntilStart,
  computeTransitionPhase,
  getTransitionFromStartTime,
};
