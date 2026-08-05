'use strict';

const { evaluateSc5CleanupOk } = require('./founder-smoke-sc5-cleanup.cjs');
const { assertEnglishGlobalHealthContract } = require('./founder-smoke-health.cjs');

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
  const {
    requireApiScenarios = true,
    requireRestore = true,
    requireBrowser = false,
    requireBrowserRestore = false,
  } = opts;
  const scenarioResults = {};
  const failed = [];
  const missing = [];

  if (requireApiScenarios) {
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
  } else {
    report.scenarios_complete = true;
  }

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

  if (report.scenarios?.sc5_new_family !== undefined && !evaluateSc5CleanupOk(report.sc5_cleanup)) {
    report.errors = report.errors || [];
    report.errors.push('sc5_cleanup.ok must be true');
  }

  const healthBefore = assertEnglishGlobalHealthContract(report.health, 'health_before');
  const healthAfter = assertEnglishGlobalHealthContract(report.health_after, 'health_after');
  if (!healthBefore.ok) report.errors = (report.errors || []).concat(healthBefore.errors);
  if (!healthAfter.ok) report.errors = (report.errors || []).concat(healthAfter.errors);

  const restoreOk =
    !requireRestore || (report.restored === true && report.restore_matches_snapshot === true);
  if (requireBrowserRestore) {
    const br = report.browser_restore;
    if (!br || br.restored !== true || br.restore_matches_snapshot !== true) {
      report.errors = report.errors || [];
      report.errors.push('browser_restore must report restored and restore_matches_snapshot');
    }
  }

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
