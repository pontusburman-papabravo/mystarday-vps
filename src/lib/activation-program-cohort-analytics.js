'use strict';

/**
 * Activation program cohort analytics — opportunity, conversion, retention wall (Fas 6B).
 * Builds on Fas 6A retention engine.
 */

const { DateTime } = require('luxon');
const {
  computeCohortRetention,
  evaluateProgramRetention,
  isRetentionWindowMature,
  RETENTION_WINDOWS,
} = require('./activation-program-retention');

function rate(numerator, denominator) {
  if (!denominator) return 0;
  return numerator / denominator;
}

function emptyAhaArm() {
  return {
    enrolled: 0,
    opportunity: 0,
    opportunityRate: 0,
    converted: 0,
    conversionRate: 0,
  };
}

function emptyRetentionWall() {
  return {
    completed_retained: 0,
    completed_churned: 0,
    incomplete_retained: 0,
    incomplete_churned: 0,
  };
}

function emptyAhaRetentionArm() {
  return {
    with_aha: { measurable: 0, retained: 0, rate: 0 },
    without_aha: { measurable: 0, retained: 0, rate: 0 },
  };
}

function summarizeAhaArm(programs, ahaFlags) {
  const out = emptyAhaArm();
  for (const program of programs) {
    out.enrolled += 1;
    const flags = ahaFlags.get(program.family_id) || {
      hasChildFirst: false,
      hasParentFirstSeen: false,
    };
    if (flags.hasChildFirst) out.opportunity += 1;
    if (flags.hasChildFirst && flags.hasParentFirstSeen) out.converted += 1;
  }
  out.opportunityRate = rate(out.opportunity, out.enrolled);
  out.conversionRate = rate(out.converted, out.opportunity);
  return out;
}

function summarizeRetentionWall(programs, evalByProgramId, windowDays, now) {
  const wall = emptyRetentionWall();
  for (const program of programs) {
    const tz = program.family_timezone || 'Europe/Stockholm';
    if (!isRetentionWindowMature(program, windowDays, tz, now)) continue;

    const evaluation = evalByProgramId.get(program.id);
    const retained = evaluation?.familyRetained ?? false;
    const completed = program.status === 'completed';

    if (completed && retained) wall.completed_retained += 1;
    else if (completed && !retained) wall.completed_churned += 1;
    else if (!completed && retained) wall.incomplete_retained += 1;
    else wall.incomplete_churned += 1;
  }
  return wall;
}

function summarizeAhaRetentionArm(programs, evalByProgramId, ahaFlags, windowDays, now) {
  const out = emptyAhaRetentionArm();
  for (const program of programs) {
    const tz = program.family_timezone || 'Europe/Stockholm';
    if (!isRetentionWindowMature(program, windowDays, tz, now)) continue;

    const flags = ahaFlags.get(program.family_id) || {
      hasChildFirst: false,
      hasParentFirstSeen: false,
    };
    const retained = evalByProgramId.get(program.id)?.familyRetained ?? false;
    const bucket = flags.hasParentFirstSeen ? out.with_aha : out.without_aha;
    bucket.measurable += 1;
    if (retained) bucket.retained += 1;
  }
  out.with_aha.rate = rate(out.with_aha.retained, out.with_aha.measurable);
  out.without_aha.rate = rate(out.without_aha.retained, out.without_aha.measurable);
  return out;
}

function parseWindowDays(raw) {
  const windowDays = parseInt(raw, 10);
  if (!RETENTION_WINDOWS.includes(windowDays)) {
    return null;
  }
  return windowDays;
}

/**
 * Full admin retention report for GET /api/admin/activation-program/retention
 */
async function buildActivationRetentionReport({
  windowDays = 14,
  launchAt = process.env.ACTIVATION_PROGRAM_LAUNCH_AT,
  now = DateTime.now(),
  client,
} = {}) {
  const retentionDb = require('../../db/activation-program-retention');
  const cohortAnalyticsDb = require('../../db/activation-program-analytics-cohort');

  const retention = await computeCohortRetention({ windowDays, launchAt, now, client });

  if (!launchAt) {
    return {
      windowDays,
      launchAt: null,
      windowMature: false,
      cohortSize: 0,
      retention,
      aha: {
        treatment: emptyAhaArm(),
        control: emptyAhaArm(),
        combined: emptyAhaArm(),
      },
      retentionWall: {
        treatment: emptyRetentionWall(),
        control: emptyRetentionWall(),
        combined: emptyRetentionWall(),
      },
      ahaRetention: {
        treatment: emptyAhaRetentionArm(),
        control: emptyAhaRetentionArm(),
      },
    };
  }

  const programs = await retentionDb.listCohortPrograms(launchAt, client);
  const treatmentPrograms = programs.filter((p) => p.cohort_arm === 'treatment');
  const controlPrograms = programs.filter((p) => p.cohort_arm === 'control');

  const familyIds = programs.map((p) => p.family_id);
  const ahaFlags = await cohortAnalyticsDb.fetchAhaFlagsByFamily(familyIds, client);

  const evaluations = await Promise.all(
    programs.map((p) => evaluateProgramRetention(p, windowDays, client))
  );
  const evalByProgramId = new Map(evaluations.map((e) => [e.programId, e]));

  const ahaCombined = summarizeAhaArm(programs, ahaFlags);

  return {
    windowDays,
    launchAt,
    windowMature: retention.windowMature,
    cohortSize: programs.length,
    retention,
    aha: {
      treatment: summarizeAhaArm(treatmentPrograms, ahaFlags),
      control: summarizeAhaArm(controlPrograms, ahaFlags),
      combined: ahaCombined,
    },
    retentionWall: {
      treatment: summarizeRetentionWall(treatmentPrograms, evalByProgramId, windowDays, now),
      control: summarizeRetentionWall(controlPrograms, evalByProgramId, windowDays, now),
      combined: summarizeRetentionWall(programs, evalByProgramId, windowDays, now),
    },
    ahaRetention: {
      treatment: summarizeAhaRetentionArm(
        treatmentPrograms,
        evalByProgramId,
        ahaFlags,
        windowDays,
        now
      ),
      control: summarizeAhaRetentionArm(
        controlPrograms,
        evalByProgramId,
        ahaFlags,
        windowDays,
        now
      ),
    },
  };
}

module.exports = {
  parseWindowDays,
  buildActivationRetentionReport,
  summarizeAhaArm,
  summarizeRetentionWall,
  summarizeAhaRetentionArm,
};
