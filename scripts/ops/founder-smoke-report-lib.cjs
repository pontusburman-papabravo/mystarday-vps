'use strict';

/** Scenarios 1–5 must all report `pass: true` — no skip/null as success. */
const REQUIRED_SCENARIO_KEYS = [
  'sc1_grandfather',
  'sc2_child_en',
  'sc3_separation',
  'sc4_sv_control',
  'sc5_new_family',
];

function snapshotsEqual(a, b) {
  if (!a || !b) return false;
  const norm = (s) => ({
    preferred_locale: s.preferred_locale || 'sv-SE',
    features: [...(s.features || [])].sort(),
  });
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

/**
 * @param {object} report
 * @param {{ requireRestore?: boolean, requireBrowser?: boolean }} opts
 */
function finalizeFounderSmokeReport(report, opts = {}) {
  const { requireRestore = true, requireBrowser = false } = opts;
  const scenarioResults = {};
  const failed = [];
  const missing = [];

  for (const key of REQUIRED_SCENARIO_KEYS) {
    const s = report.scenarios?.[key];
    if (!s) {
      missing.push(key);
      scenarioResults[key] = 'missing';
      continue;
    }
    if (s.pass !== true) {
      failed.push(key);
      scenarioResults[key] = s.pass === false ? 'fail' : 'incomplete';
    } else {
      scenarioResults[key] = 'pass';
    }
  }

  report.scenario_results = scenarioResults;
  report.scenarios_complete = missing.length === 0 && failed.length === 0;

  if (requireRestore) {
    if (report.restored !== true) {
      report.errors = report.errors || [];
      report.errors.push('restored must be true');
    }
    if (report.restore_matches_snapshot !== true) {
      report.errors = report.errors || [];
      report.errors.push('restore_matches_snapshot must be true');
    }
  }

  if (requireBrowser && report.browser?.pass !== true) {
    report.errors = report.errors || [];
    report.errors.push('browser smoke must pass');
  }

  const restoreOk =
    !requireRestore || (report.restored === true && report.restore_matches_snapshot === true);
  const browserOk = !requireBrowser || report.browser?.pass === true;

  report.overall =
    report.scenarios_complete && restoreOk && browserOk && (report.errors?.length || 0) === 0
      ? 'PASS'
      : 'INCOMPLETE';

  return report;
}

module.exports = {
  REQUIRED_SCENARIO_KEYS,
  snapshotsEqual,
  finalizeFounderSmokeReport,
};
