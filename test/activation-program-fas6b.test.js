'use strict';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/test';

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');

const {
  parseWindowDays,
  summarizeAhaArm,
  summarizeRetentionWall,
  summarizeAhaRetentionArm,
} = require('../src/lib/activation-program-cohort-analytics');

describe('Fas 6B — parseWindowDays', () => {
  it('accepts 14, 30, 60', () => {
    assert.equal(parseWindowDays('14'), 14);
    assert.equal(parseWindowDays('30'), 30);
    assert.equal(parseWindowDays('60'), 60);
  });

  it('rejects invalid window', () => {
    assert.equal(parseWindowDays('7'), null);
    assert.equal(parseWindowDays(''), null);
  });
});

describe('Fas 6B — aha opportunity + conversion', () => {
  const programs = [
    { family_id: 'a', cohort_arm: 'treatment' },
    { family_id: 'b', cohort_arm: 'treatment' },
    { family_id: 'c', cohort_arm: 'treatment' },
  ];

  const ahaFlags = new Map([
    ['a', { hasChildFirst: true, hasParentFirstSeen: true }],
    ['b', { hasChildFirst: true, hasParentFirstSeen: false }],
    ['c', { hasChildFirst: false, hasParentFirstSeen: false }],
  ]);

  it('opportunity = child_first_completion; conversion = seen / opportunity', () => {
    const stats = summarizeAhaArm(programs, ahaFlags);
    assert.equal(stats.enrolled, 3);
    assert.equal(stats.opportunity, 2);
    assert.equal(stats.opportunityRate, 2 / 3);
    assert.equal(stats.converted, 1);
    assert.equal(stats.conversionRate, 0.5);
  });
});

describe('Fas 6B — retention wall 2×2', () => {
  const now = DateTime.fromISO('2026-06-20T12:00:00', { zone: 'Europe/Stockholm' });
  const windowDays = 14;
  const program = (id, status, familyId = id) => ({
    id,
    family_id: familyId,
    status,
    started_at: '2026-06-01T08:00:00.000Z',
    family_timezone: 'Europe/Stockholm',
    cohort_arm: 'treatment',
  });

  it('classifies complete/incomplete × retained/churned', () => {
    const programs = [
      program('1', 'completed'),
      program('2', 'completed'),
      program('3', 'active'),
      program('4', 'expired'),
    ];
    const evalByProgramId = new Map([
      ['1', { familyRetained: true }],
      ['2', { familyRetained: false }],
      ['3', { familyRetained: true }],
      ['4', { familyRetained: false }],
    ]);

    const wall = summarizeRetentionWall(programs, evalByProgramId, windowDays, now);
    assert.equal(wall.completed_retained, 1);
    assert.equal(wall.completed_churned, 1);
    assert.equal(wall.incomplete_retained, 1);
    assert.equal(wall.incomplete_churned, 1);
  });
});

describe('Fas 6B — aha retention grouping', () => {
  const now = DateTime.fromISO('2026-06-20T12:00:00', { zone: 'Europe/Stockholm' });
  const windowDays = 14;

  it('groups Day 14 by parent_first_completion_seen', () => {
    const programs = [
      {
        id: '1',
        family_id: 'f1',
        status: 'completed',
        started_at: '2026-06-01T08:00:00.000Z',
        family_timezone: 'Europe/Stockholm',
      },
      {
        id: '2',
        family_id: 'f2',
        status: 'active',
        started_at: '2026-06-01T08:00:00.000Z',
        family_timezone: 'Europe/Stockholm',
      },
    ];
    const ahaFlags = new Map([
      ['f1', { hasChildFirst: true, hasParentFirstSeen: true }],
      ['f2', { hasChildFirst: true, hasParentFirstSeen: false }],
    ]);
    const evalByProgramId = new Map([
      ['1', { familyRetained: true }],
      ['2', { familyRetained: false }],
    ]);

    const grouped = summarizeAhaRetentionArm(programs, evalByProgramId, ahaFlags, windowDays, now);
    assert.equal(grouped.with_aha.measurable, 1);
    assert.equal(grouped.with_aha.retained, 1);
    assert.equal(grouped.with_aha.rate, 1);
    assert.equal(grouped.without_aha.measurable, 1);
    assert.equal(grouped.without_aha.retained, 0);
    assert.equal(grouped.without_aha.rate, 0);
  });
});

describe('Fas 6B — wiring', () => {
  it('admin route registered', () => {
    const admin = fs.readFileSync(path.join(__dirname, '../src/routes/admin.js'), 'utf8');
    assert.ok(admin.includes('activation-program'));
  });

  it('GET /activation-program/retention endpoint exists', () => {
    const route = fs.readFileSync(
      path.join(__dirname, '../src/routes/admin/activation-program.js'),
      'utf8'
    );
    assert.ok(route.includes("router.get('/activation-program/retention'"));
    assert.ok(route.includes('buildActivationRetentionReport'));
  });

  it('exports buildActivationRetentionReport', () => {
    const mod = require('../src/lib/activation-program-cohort-analytics');
    assert.equal(typeof mod.buildActivationRetentionReport, 'function');
  });
});
