'use strict';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/test';

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');

const {
  buildDeepDiveCandidates,
  formatReportAsCsv,
} = require('../src/lib/activation-program-cohort-analytics');

describe('Fas 6C — deep dive candidates', () => {
  const now = DateTime.fromISO('2026-06-20T12:00:00', { zone: 'Europe/Stockholm' });
  const windowDays = 14;

  const program = (id, overrides = {}) => ({
    id,
    family_id: `fam-${id}`,
    parent_id: `parent-${id}`,
    status: 'completed',
    started_at: '2026-06-01T08:00:00.000Z',
    family_timezone: 'Europe/Stockholm',
    reflection_score: 4,
    ...overrides,
  });

  it('flags completed + churned and low reflection score', () => {
    const programs = [
      program('1', { reflection_score: 1 }),
      program('2', { reflection_score: 5 }),
      program('3', { status: 'active' }),
    ];
    const evaluations = [
      { programId: '1', familyRetained: true },
      { programId: '2', familyRetained: false },
      { programId: '3', familyRetained: false },
    ];

    const candidates = buildDeepDiveCandidates(programs, evaluations, windowDays, now);
    const reasons = candidates.map((c) => c.reason).sort();

    assert.deepEqual(reasons, ['completed_not_retained', 'low_reflection_score']);
    assert.equal(candidates.length, 2);
  });
});

describe('Fas 6C — CSV export', () => {
  it('includes funnel steps and retention metrics', () => {
    const report = {
      windowDays: 14,
      launchAt: '2026-06-01T00:00:00.000Z',
      cohortSize: 10,
      retention: {
        family: { treatmentRate: 0.5, controlRate: 0.4, isPromising: true },
      },
      aha: { combined: { opportunityRate: 0.6, conversionRate: 0.5 } },
      retentionWall: {
        combined: {
          completed_retained: 3,
          completed_churned: 1,
          incomplete_retained: 2,
          incomplete_churned: 4,
        },
      },
    };
    const funnel = {
      steps: [
        { label: 'Enrolled', count: 10 },
        { label: 'Program completed', count: 4 },
      ],
    };

    const csv = formatReportAsCsv(report, funnel);
    assert.ok(csv.includes('section,metric,value'));
    assert.ok(csv.includes('retention,"treatment_rate","50%"'));
    assert.ok(csv.includes('funnel,"Enrolled","10"'));
    assert.ok(csv.includes('retention_wall,"completed_churned","1"'));
  });
});

describe('Fas 6C — wiring', () => {
  it('funnel and export admin routes exist', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '../src/routes/admin/activation-program.js'),
      'utf8'
    );
    assert.ok(route.includes("router.get('/activation-program/funnel'"));
    assert.ok(route.includes("router.get('/activation-program/retention/export'"));
    assert.ok(route.includes('buildActivationFunnel'));
    assert.ok(route.includes('formatReportAsCsv'));
  });

  it('admin UI section and script wired', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/admin/index.html'), 'utf8');
    const nav = fs.readFileSync(path.join(__dirname, '../public/admin/admin-nav.js'), 'utf8');
    assert.ok(html.includes('foraldaraktiveringSection'));
    assert.ok(html.includes('admin-activation-program.js'));
    assert.ok(nav.includes("key: 'foraldaraktivering'"));
    assert.ok(html.includes('activationFunnelChart'));
  });

  it('admin JS exports load/export helpers', () => {
    const js = fs.readFileSync(
      path.join(__dirname, '../public/admin/admin-activation-program.js'),
      'utf8'
    );
    assert.ok(js.includes('loadActivationProgramAdmin'));
    assert.ok(js.includes('exportActivationCsv'));
    assert.ok(js.includes('/api/admin/activation-program/funnel'));
  });

  it('db layer exports funnel queries', () => {
    const mod = require('../db/activation-program-analytics-cohort');
    assert.equal(typeof mod.fetchFunnelEventCounts, 'function');
    assert.equal(typeof mod.fetchDay3DoneTriggers, 'function');
    assert.equal(typeof mod.fetchReflectionDistribution, 'function');
  });
});
