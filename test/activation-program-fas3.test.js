'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { getDayContent } = require('../src/lib/activation-program-content');
const {
  rolloverDayStatus,
  markDayDone,
  isDayDone,
  showReflection,
  getCalendarDay,
} = require('../src/lib/activation-program');

function programAt(startIso, overrides = {}) {
  return {
    started_at: startIso,
    program_type: 'onboarding_7d',
    status: 'active',
    cohort_arm: 'treatment',
    reflection_score: null,
    ...overrides,
  };
}

describe('Fas 3 — activation-program-content', () => {
  it('day 1 has inline preview CTA', () => {
    const content = getDayContent(1, { childName: 'Estelle' });
    assert.equal(content.cta_type, 'open_child_view');
    assert.equal(content.show_preview, true);
    assert.match(content.body, /Estelle/);
  });

  it('day 3 includes supportive fallback copy', () => {
    const content = getDayContent(3, { childName: 'Estelle' });
    assert.ok(content.supportive_fallback);
    assert.match(content.supportive_fallback, /komma igång/);
  });

  it('day 6 has solo label', () => {
    const content = getDayContent(6);
    assert.equal(content.solo_label, 'Jag kör solo!');
  });

  it('day 7 uses reflection CTA', () => {
    const content = getDayContent(7);
    assert.equal(content.cta_type, 'submit_reflection');
  });
});

describe('Fas 3 — day status helpers', () => {
  it('rolloverDayStatus marks earlier pending days as missed', () => {
    const next = rolloverDayStatus({ 1: 'pending', 2: 'done' }, 4);
    assert.equal(next['1'], 'missed');
    assert.equal(next['2'], 'done');
    assert.equal(next['4'], 'pending');
  });

  it('markDayDone and isDayDone', () => {
    const { dayStatus } = markDayDone({}, 3, 'aha');
    assert.equal(isDayDone(dayStatus, 3), true);
    assert.equal(isDayDone(dayStatus, 2), false);
  });

  it('showReflection from calendar day 7 until completed', () => {
    const program = programAt('2026-06-01T08:00:00.000Z');
    const tz = 'Europe/Stockholm';
    // calendar day depends on now — test boundary via getCalendarDay mock logic:
    // use reflection_score set → false
    assert.equal(showReflection({ ...program, reflection_score: 4 }), false);
    assert.equal(showReflection({ ...program, status: 'completed' }), false);
    assert.equal(showReflection({ ...program, status: 'opted_out' }), false);

    const day = getCalendarDay(program, tz);
    if (day >= 7) {
      assert.equal(showReflection(program, tz), true);
    } else {
      assert.equal(showReflection(program, tz), false);
    }
  });
});

describe('Fas 3 — dashboard assets', () => {
  it('loads banner script and day-advanced CSS', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/dashboard.html'), 'utf8');
    assert.ok(html.includes('/js/activation-program-banner.js'));
    assert.ok(html.includes('activation-day-advanced'));
  });

  it('banner JS calls activation-program API', () => {
    const js = fs.readFileSync(
      path.join(__dirname, '../public/js/activation-program-banner.js'),
      'utf8'
    );
    assert.ok(js.includes('/api/me/activation-program'));
    assert.ok(js.includes('/api/me/activation-program/reflection'));
    assert.ok(js.includes('/api/me/activation-program/cta-clicked'));
  });

  it('dashboard.js initializes banner', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');
    assert.ok(js.includes('ActivationProgramBanner.init'));
  });
});
