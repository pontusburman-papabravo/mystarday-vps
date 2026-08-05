'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  finalizeFounderSmokeReport,
  snapshotsEqual,
} = require('../scripts/ops/founder-smoke-report-lib.cjs');

const HEALTH_OK = {
  english_global_flag_read_ok: true,
  english_global_flag_row_present: true,
  english_global_flag_enabled: false,
};

function allScenariosPass() {
  return {
    sc1_grandfather: { pass: true },
    sc2_child_en: { pass: true },
    sc3_separation: { pass: true },
    sc4_sv_control: { pass: true },
    sc5_new_family: { pass: true },
  };
}

describe('founder smoke report lib', () => {
  it('treats skip as incomplete', () => {
    const report = finalizeFounderSmokeReport(
      {
        scenarios: {
          sc1_grandfather: { skip: true },
          sc2_child_en: { pass: true },
          sc3_separation: { pass: true },
          sc4_sv_control: { pass: true },
          sc5_new_family: { pass: true },
        },
        restored: true,
        restore_matches_snapshot: true,
        health: HEALTH_OK,
        health_after: HEALTH_OK,
        sc5_cleanup: { ok: true },
        errors: [],
      },
      { requireRestore: true, requireBrowser: false }
    );
    assert.equal(report.overall, 'INCOMPLETE');
    assert.equal(report.scenarios_complete, false);
  });

  it('requires restore_matches_snapshot for PASS', () => {
    const report = finalizeFounderSmokeReport(
      {
        scenarios: allScenariosPass(),
        restored: true,
        restore_matches_snapshot: false,
        health: HEALTH_OK,
        health_after: HEALTH_OK,
        sc5_cleanup: { ok: true },
        errors: [],
      },
      { requireRestore: true, requireBrowser: false }
    );
    assert.equal(report.overall, 'INCOMPLETE');
  });

  it('fails when browser scenarios pass but browser_restore mismatch', () => {
    const report = finalizeFounderSmokeReport(
      {
        scenarios: allScenariosPass(),
        restored: true,
        restore_matches_snapshot: true,
        health: HEALTH_OK,
        health_after: HEALTH_OK,
        sc5_cleanup: { ok: true },
        browser: { pass: false, scenarios_pass: true, restore_pass: false },
        browser_restore: { restored: true, restore_matches_snapshot: false },
        errors: [],
      },
      { requireRestore: true, requireBrowser: true, requireBrowserRestore: true }
    );
    assert.equal(report.overall, 'INCOMPLETE');
  });

  it('fails when sc5_cleanup is not ok', () => {
    const report = finalizeFounderSmokeReport(
      {
        scenarios: allScenariosPass(),
        restored: true,
        restore_matches_snapshot: true,
        health: HEALTH_OK,
        health_after: HEALTH_OK,
        sc5_cleanup: { ok: false },
        errors: [],
      },
      { requireRestore: true, requireBrowser: false }
    );
    assert.equal(report.overall, 'INCOMPLETE');
  });

  it('fails when browser_restore missing under requireBrowserRestore', () => {
    const report = finalizeFounderSmokeReport(
      {
        scenarios: allScenariosPass(),
        restored: true,
        restore_matches_snapshot: true,
        health: HEALTH_OK,
        health_after: HEALTH_OK,
        sc5_cleanup: { ok: true },
        browser: { pass: true },
        errors: [],
      },
      { requireApiScenarios: true, requireRestore: true, requireBrowser: true, requireBrowserRestore: true }
    );
    assert.equal(report.overall, 'INCOMPLETE');
  });

  it('browser-only can PASS without API scenarios', () => {
    const report = finalizeFounderSmokeReport(
      {
        part: 'browser',
        health: HEALTH_OK,
        health_after: HEALTH_OK,
        browser: { pass: true },
        browser_restore: { restored: true, restore_matches_snapshot: true },
        errors: [],
      },
      {
        requireApiScenarios: false,
        requireRestore: false,
        requireBrowser: true,
        requireBrowserRestore: true,
      }
    );
    assert.equal(report.overall, 'PASS');
  });

  it('browser-only fails without browser pass', () => {
    const report = finalizeFounderSmokeReport(
      {
        health: HEALTH_OK,
        health_after: HEALTH_OK,
        browser: { pass: false },
        browser_restore: { restored: true, restore_matches_snapshot: true },
        errors: [],
      },
      {
        requireApiScenarios: false,
        requireRestore: false,
        requireBrowser: true,
        requireBrowserRestore: true,
      }
    );
    assert.equal(report.overall, 'INCOMPLETE');
  });

  it('snapshotsEqual compares sorted features', () => {
    assert.equal(
      snapshotsEqual(
        { preferred_locale: 'sv-SE', features: ['english_app'] },
        { preferred_locale: 'sv-SE', features: ['english_app', 'english_child_experience'].filter((x) => x === 'english_app') }
      ),
      true
    );
  });
});
