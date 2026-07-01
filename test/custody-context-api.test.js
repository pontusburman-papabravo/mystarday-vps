'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  legacyWeekVariant,
  buildCustodyContextFromEngine,
} = require('../src/lib/custody-context-api');

const ROOT = path.join(__dirname, '..');

const HOME_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const HOME_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const homesById = {
  [HOME_A]: { id: HOME_A, label: 'Hos Anna', color: '#22C55E', icon: null },
  [HOME_B]: { id: HOME_B, label: 'Hos Erik', color: '#4F46E5', icon: '🏠' },
};

function weeksCtx(anchor = '2026-06-02') {
  return {
    childId: 'child-1',
    familyId: 'family-1',
    parentHomeId: HOME_A,
    schedule: {
      pattern_type: 'alternate_weeks',
      anchor_date: anchor,
      interval_weeks: 2,
      week_a_home_id: HOME_A,
      week_b_home_id: HOME_B,
      configuration: { home_a: HOME_A, home_b: HOME_B },
    },
    homesById,
    overrides: [],
  };
}

describe('custody-context-api', () => {
  it('legacyWeekVariant maps active home to a/b for alternate_weeks', () => {
    const schedule = weeksCtx().schedule;
    assert.equal(legacyWeekVariant(schedule, homesById[HOME_A]), 'a');
    assert.equal(legacyWeekVariant(schedule, homesById[HOME_B]), 'b');
    assert.equal(legacyWeekVariant(schedule, null), null);
    assert.equal(
      legacyWeekVariant({ pattern_type: 'alternate_weekends' }, homesById[HOME_A]),
      null
    );
  });

  it('buildCustodyContextFromEngine returns active:false without schedule', () => {
    const payload = buildCustodyContextFromEngine({
      ...weeksCtx(),
      schedule: null,
    }, '2026-06-04');
    assert.deepEqual(payload, { active: false });
  });

  it('buildCustodyContextFromEngine exposes CustodyContext + legacy aliases', () => {
    const payload = buildCustodyContextFromEngine(weeksCtx(), '2026-06-04');

    assert.equal(payload.active, true);
    assert.equal(payload.date, '2026-06-04');
    assert.equal(payload.activeHome.id, HOME_A);
    assert.equal(payload.source, 'pattern');
    assert.equal(payload.patternType, 'alternate_weeks');
    assert.equal(payload.isParentDay, true);
    assert.equal(payload.isMyDay, true);
    assert.equal(payload.variant, 'a');
    assert.equal(payload.home.id, HOME_A);
    assert.equal(payload.weekMonday, '2026-06-01');
    assert.ok(payload.weekBanner);
    assert.equal(payload.weekBanner.label, 'Hos Anna');
    assert.equal(payload.weekBanner.variant, 'a');
    assert.equal(payload.nextHandoff, payload.nextTransition);
    assert.equal(payload.previousHandoff, payload.previousTransition);
  });

  it('GET /context route uses engine via custody-context-api', () => {
    const routes = fs.readFileSync(path.join(ROOT, 'src/routes/family/custody.js'), 'utf8');
    assert.match(routes, /buildCustodyContextResponse/);
    assert.doesNotMatch(routes, /custody-resolver/);
  });
});
