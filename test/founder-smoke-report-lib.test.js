'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  finalizeFounderSmokeReport,
  snapshotsEqual,
} = require('../scripts/ops/founder-smoke-report-lib.cjs');

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
        scenarios: {
          sc1_grandfather: { pass: true },
          sc2_child_en: { pass: true },
          sc3_separation: { pass: true },
          sc4_sv_control: { pass: true },
          sc5_new_family: { pass: true },
        },
        restored: true,
        restore_matches_snapshot: false,
        errors: [],
      },
      { requireRestore: true, requireBrowser: false }
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
