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
    programEvaluations: evaluations.map((e) => ({
      programId: e.programId,
      familyId: e.familyId,
      cohortArm: e.cohortArm,
      familyRetained: e.familyRetained,
      parentRetained: e.parentRetained,
    })),
  };
}

function buildDeepDiveCandidates(treatmentPrograms, programEvaluations, windowDays, now) {
  const evalByProgramId = new Map(programEvaluations.map((e) => [e.programId, e]));
  const candidates = [];

  for (const program of treatmentPrograms) {
    const tz = program.family_timezone || 'Europe/Stockholm';
    if (!isRetentionWindowMature(program, windowDays, tz, now)) continue;

    const evaluation = evalByProgramId.get(program.id);
    if (!evaluation) continue;

    const completed = program.status === 'completed';
    const lowScore = program.reflection_score != null && program.reflection_score <= 2;
    const notRetained = evaluation.familyRetained === false;

    let reason = null;
    if (completed && lowScore) reason = 'low_reflection_score';
    else if (completed && notRetained) reason = 'completed_not_retained';

    if (reason) {
      candidates.push({
        programId: program.id,
        familyId: program.family_id,
        parentId: program.parent_id,
        reason,
        reflectionScore: program.reflection_score,
        status: program.status,
        familyRetained: evaluation.familyRetained,
      });
    }
  }

  return candidates;
}

function pct(rate) {
  return `${Math.round(rate * 1000) / 10}%`;
}

function formatReportAsCsv(report, funnel) {
  const lines = ['section,metric,value'];
  const add = (section, metric, value) => {
    const escaped = String(value).replace(/"/g, '""');
    lines.push(`${section},"${metric}","${escaped}"`);
  };

  add('meta', 'window_days', report.windowDays);
  add('meta', 'launch_at', report.launchAt || '');
  add('meta', 'cohort_size', report.cohortSize);

  add('retention', 'treatment_rate', pct(report.retention.family.treatmentRate));
  add('retention', 'control_rate', pct(report.retention.family.controlRate));
  add('retention', 'is_promising', report.retention.family.isPromising);

  add('aha', 'opportunity_rate', pct(report.aha.combined.opportunityRate));
  add('aha', 'conversion_rate', pct(report.aha.combined.conversionRate));

  const wall = report.retentionWall.combined;
  add('retention_wall', 'completed_retained', wall.completed_retained);
  add('retention_wall', 'completed_churned', wall.completed_churned);
  add('retention_wall', 'incomplete_retained', wall.incomplete_retained);
  add('retention_wall', 'incomplete_churned', wall.incomplete_churned);

  if (funnel?.steps) {
    for (const step of funnel.steps) {
      add('funnel', step.label, step.count);
    }
  }

  return `${lines.join('\n')}\n`;
}

/**
 * Experiment funnel + enrollment gap (Fas 6C).
 */
async function buildActivationFunnel({
  launchAt = process.env.ACTIVATION_PROGRAM_LAUNCH_AT,
  windowDays = 14,
  now = DateTime.now(),
  client,
} = {}) {
  const retentionDb = require('../../db/activation-program-retention');
  const cohortAnalyticsDb = require('../../db/activation-program-analytics-cohort');

  if (!launchAt) {
    return {
      launchAt: null,
      enrolled: 0,
      treatmentEnrolled: 0,
      controlEnrolled: 0,
      firstBannerSeen: 0,
      enrollmentGap: 0,
      steps: [],
      day3Triggers: { aha: 0, supportive_fallback: 0, other: 0 },
      reflectionDistribution: [],
      deepDiveCount: 0,
      deepDive: [],
    };
  }

  const programs = await retentionDb.listCohortPrograms(launchAt, client);
  const treatmentPrograms = programs.filter((p) => p.cohort_arm === 'treatment');
  const familyIds = programs.map((p) => p.family_id);

  const retentionReport = await buildActivationRetentionReport({
    windowDays,
    launchAt,
    now,
    client,
  });

  const [eventCounts, day3Triggers, reflectionDistribution] = await Promise.all([
    cohortAnalyticsDb.fetchFunnelEventCounts(familyIds, client),
    cohortAnalyticsDb.fetchDay3DoneTriggers(familyIds, client),
    cohortAnalyticsDb.fetchReflectionDistribution(launchAt, client),
  ]);

  const firstBannerSeen = treatmentPrograms.filter((p) => p.first_banner_seen_at).length;
  const familyRetainedDay14 = retentionReport.retention.treatment.retained;

  const steps = [
    { key: 'enrolled', label: 'Enrolled', count: programs.length },
    { key: 'first_banner_seen', label: 'Första banner (treatment)', count: firstBannerSeen },
    { key: 'child_first_completion', label: 'Child first completion', count: eventCounts.child_first_completion },
    { key: 'parent_first_completion_seen', label: 'Parent aha sett', count: eventCounts.parent_first_completion_seen },
    { key: 'program_completed', label: 'Program completed', count: eventCounts.activation_program_completed },
    { key: 'family_retained_day14', label: 'Family retained Day 14', count: familyRetainedDay14 },
  ];

  const deepDive = buildDeepDiveCandidates(
    treatmentPrograms,
    retentionReport.programEvaluations || [],
    windowDays,
    now
  );

  return {
    launchAt,
    enrolled: programs.length,
    treatmentEnrolled: treatmentPrograms.length,
    controlEnrolled: programs.length - treatmentPrograms.length,
    firstBannerSeen,
    enrollmentGap: Math.max(0, treatmentPrograms.length - firstBannerSeen),
    steps,
    day3Triggers,
    reflectionDistribution,
    deepDiveCount: deepDive.length,
    deepDive,
    isPromising: retentionReport.retention.family.isPromising,
    retentionSummary: retentionReport.retention.family,
    aha: retentionReport.aha.combined,
    ahaRetention: retentionReport.ahaRetention.treatment,
    retentionWall: retentionReport.retentionWall.treatment,
    windowMature: retentionReport.windowMature,
  };
}

module.exports = {
  parseWindowDays,
  buildActivationRetentionReport,
  buildActivationFunnel,
  buildDeepDiveCandidates,
  formatReportAsCsv,
  summarizeAhaArm,
  summarizeRetentionWall,
  summarizeAhaRetentionArm,
};
