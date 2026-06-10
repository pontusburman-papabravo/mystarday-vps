/**
 * Activation program retention engine (Fas 6A).
 * Family Day 14 = North Star. Parent Day 14 = diagnostic only.
 * Definition FROZEN — docs/foraldaraktivering-7-dagar-spec.md §2, §11.
 */

const { DateTime } = require('luxon');

const RETENTION_WINDOWS = Object.freeze([14, 30, 60]);
const FAMILY_RETENTION_EVENT_TYPES = new Set(['parent_login', 'child_completion']);
const PARENT_RETENTION_EVENT_TYPES = new Set(['parent_login']);

function assertValidWindow(windowDays) {
  if (!RETENTION_WINDOWS.includes(windowDays)) {
    throw new Error(`Invalid retention window: ${windowDays}`);
  }
}

function enrollLocalStart(startedAt, timezone) {
  return DateTime.fromISO(startedAt, { zone: 'utc' }).setZone(timezone).startOf('day');
}

/**
 * Retention measurement window in family local dates.
 * window 14 → calendar days 13–15; 30 → 29–31; 60 → 59–61.
 */
function getRetentionWindowBounds(program, windowDays, timezone) {
  assertValidWindow(windowDays);
  const tz = timezone || program.family_timezone || 'Europe/Stockholm';
  const start = enrollLocalStart(program.started_at, tz);
  const from = start.plus({ days: windowDays - 2 });
  const to = start.plus({ days: windowDays });
  return {
    timezone: tz,
    windowDays,
    from,
    to,
    fromCalendarDay: windowDays - 1,
    toCalendarDay: windowDays + 1,
  };
}

function toEventLocalDay(at, timezone) {
  return DateTime.fromISO(at, { zone: 'utc' }).setZone(timezone).startOf('day');
}

function isEventInRetentionWindow(eventAt, bounds) {
  const day = toEventLocalDay(eventAt, bounds.timezone);
  return day >= bounds.from && day <= bounds.to;
}

function isFamilyRetainedFromEvents(events, bounds) {
  return (events || []).some(
    (e) => FAMILY_RETENTION_EVENT_TYPES.has(e.type) && isEventInRetentionWindow(e.at, bounds)
  );
}

function isParentRetainedFromEvents(events, bounds) {
  return (events || []).some(
    (e) => PARENT_RETENTION_EVENT_TYPES.has(e.type) && isEventInRetentionWindow(e.at, bounds)
  );
}

function isFamilyRetained(program, events, windowDays, timezone) {
  const bounds = getRetentionWindowBounds(program, windowDays, timezone);
  return isFamilyRetainedFromEvents(events, bounds);
}

function isParentRetained(program, events, windowDays, timezone) {
  const bounds = getRetentionWindowBounds(program, windowDays, timezone);
  return isParentRetainedFromEvents(events, bounds);
}

/**
 * Retention window fully elapsed — safe to measure (end of last window day passed).
 */
function isRetentionWindowMature(program, windowDays, timezone, now = DateTime.now()) {
  const bounds = getRetentionWindowBounds(program, windowDays, timezone);
  const nowLocal = now.setZone(bounds.timezone);
  return nowLocal > bounds.to.endOf('day');
}

/**
 * Experiment success threshold (FROZEN v3.9): +10 pp absolute OR +20 % relative.
 */
function isExperimentPromising(controlRate, treatmentRate) {
  const absoluteLift = treatmentRate - controlRate;
  const relativeLift = controlRate > 0 ? treatmentRate / controlRate : 0;
  const EPS = 1e-9;
  return absoluteLift >= 0.1 - EPS || relativeLift >= 1.2 - EPS;
}

function rate(retained, enrolled) {
  if (!enrolled) return 0;
  return retained / enrolled;
}

function summarizeArm(programs, windowDays, now, measureFn) {
  let enrolled = 0;
  let retained = 0;
  let measurable = 0;

  for (const program of programs) {
    const tz = program.family_timezone || 'Europe/Stockholm';
    if (!isRetentionWindowMature(program, windowDays, tz, now)) continue;
    measurable += 1;
    enrolled += 1;
    if (measureFn(program)) retained += 1;
  }

  return {
    enrolled,
    measurable,
    retained,
    rate: rate(retained, enrolled),
  };
}

/**
 * Evaluate one program (fetch events + apply frozen definition).
 */
async function evaluateProgramRetention(program, windowDays, client) {
  const retentionDb = require('../../db/activation-program-retention');
  const bounds = getRetentionWindowBounds(program, windowDays);
  const rangeStart = bounds.from.toUTC().toISO();
  const rangeEnd = bounds.to.plus({ days: 1 }).startOf('day').toUTC().toISO();

  const events = await retentionDb.fetchRetentionEvents(
    {
      familyId: program.family_id,
      parentId: program.parent_id,
      rangeStart,
      rangeEnd,
    },
    client
  );

  return {
    programId: program.id,
    familyId: program.family_id,
    cohortArm: program.cohort_arm,
    windowDays,
    bounds: {
      from: bounds.from.toISODate(),
      to: bounds.to.toISODate(),
      fromCalendarDay: bounds.fromCalendarDay,
      toCalendarDay: bounds.toCalendarDay,
    },
    familyRetained: isFamilyRetainedFromEvents(events, bounds),
    parentRetained: isParentRetainedFromEvents(events, bounds),
    events,
  };
}

/**
 * Cohort-level retention for treatment vs control.
 */
async function computeCohortRetention({
  windowDays = 14,
  launchAt = process.env.ACTIVATION_PROGRAM_LAUNCH_AT,
  now = DateTime.now(),
  client,
} = {}) {
  assertValidWindow(windowDays);
  if (!launchAt) {
    return {
      windowDays,
      launchAt: null,
      cohortSize: 0,
      treatment: { enrolled: 0, measurable: 0, retained: 0, rate: 0 },
      control: { enrolled: 0, measurable: 0, retained: 0, rate: 0 },
      family: { treatmentRate: 0, controlRate: 0, isPromising: false },
      parent: { treatmentRate: 0, controlRate: 0 },
      windowMature: false,
    };
  }

  const retentionDb = require('../../db/activation-program-retention');
  const programs = await retentionDb.listCohortPrograms(launchAt, client);
  const treatmentPrograms = programs.filter((p) => p.cohort_arm === 'treatment');
  const controlPrograms = programs.filter((p) => p.cohort_arm === 'control');

  const evaluations = await Promise.all(
    programs.map((p) => evaluateProgramRetention(p, windowDays, client))
  );
  const byId = new Map(evaluations.map((e) => [e.programId, e]));

  const measureFamily = (program) => {
    const tz = program.family_timezone || 'Europe/Stockholm';
    if (!isRetentionWindowMature(program, windowDays, tz, now)) return false;
    return byId.get(program.id)?.familyRetained ?? false;
  };

  const measureParent = (program) => {
    const tz = program.family_timezone || 'Europe/Stockholm';
    if (!isRetentionWindowMature(program, windowDays, tz, now)) return false;
    return byId.get(program.id)?.parentRetained ?? false;
  };

  const treatmentFamily = summarizeArm(treatmentPrograms, windowDays, now, measureFamily);
  const controlFamily = summarizeArm(controlPrograms, windowDays, now, measureFamily);
  const treatmentParent = summarizeArm(treatmentPrograms, windowDays, now, measureParent);
  const controlParent = summarizeArm(controlPrograms, windowDays, now, measureParent);

  const windowMature = programs.some((p) =>
    isRetentionWindowMature(p, windowDays, p.family_timezone, now)
  );

  return {
    windowDays,
    launchAt,
    cohortSize: programs.length,
    windowMature,
    treatment: treatmentFamily,
    control: controlFamily,
    family: {
      treatmentRate: treatmentFamily.rate,
      controlRate: controlFamily.rate,
      isPromising: isExperimentPromising(controlFamily.rate, treatmentFamily.rate),
    },
    parent: {
      treatmentRate: treatmentParent.rate,
      controlRate: controlParent.rate,
    },
  };
}

module.exports = {
  RETENTION_WINDOWS,
  FAMILY_RETENTION_EVENT_TYPES,
  PARENT_RETENTION_EVENT_TYPES,
  getRetentionWindowBounds,
  isEventInRetentionWindow,
  isFamilyRetainedFromEvents,
  isParentRetainedFromEvents,
  isFamilyRetained,
  isParentRetained,
  isRetentionWindowMature,
  isExperimentPromising,
  evaluateProgramRetention,
  computeCohortRetention,
};
