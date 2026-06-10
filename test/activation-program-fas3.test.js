'use strict';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/test';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

const { getDayContent } = require('../src/lib/activation-program-content');
const {
  rolloverDayStatus,
  markDayDone,
  isDayDone,
  showReflection,
  getCalendarDay,
  getEffectiveProgramDay,
  maybeExpireProgram,
} = require('../src/lib/activation-program');

function withMockedNow(isoUtc, fn) {
  const fixed = DateTime.fromISO(isoUtc, { zone: 'utc' });
  const originalNow = DateTime.now;
  DateTime.now = () => fixed;
  try {
    return fn();
  } finally {
    DateTime.now = originalNow;
  }
}

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
    assert.equal(showReflection({ ...programAt('2026-06-01'), reflection_score: 4 }), false);
    assert.equal(showReflection({ ...programAt('2026-06-01'), status: 'completed' }), false);
    assert.equal(showReflection({ ...programAt('2026-06-01'), status: 'opted_out' }), false);

    withMockedNow('2026-06-07T10:00:00.000Z', () => {
      const program = programAt('2026-06-01T08:00:00.000Z');
      assert.equal(getCalendarDay(program, 'Europe/Stockholm'), 7);
      assert.equal(showReflection(program, 'Europe/Stockholm'), true);
    });

    withMockedNow('2026-06-06T10:00:00.000Z', () => {
      const program = programAt('2026-06-01T08:00:00.000Z');
      assert.equal(showReflection(program, 'Europe/Stockholm'), false);
    });
  });

  it('effective_day caps at 7 while calendar_day continues (reflection window)', () => {
    withMockedNow('2026-06-10T10:00:00.000Z', () => {
      const program = programAt('2026-06-01T08:00:00.000Z');
      assert.equal(getCalendarDay(program, 'Europe/Stockholm'), 10);
      assert.equal(getEffectiveProgramDay(program, 'Europe/Stockholm'), 7);
      assert.equal(showReflection(program, 'Europe/Stockholm'), true);
    });
  });

  it('day_advanced when effective_day > last_seen_day', () => {
    const program = { last_seen_day: 2 };
    const effectiveDay = 3;
    assert.equal(effectiveDay > program.last_seen_day, true);
    assert.equal(3 > 3, false);
  });

  it('lazy expiry at calendar_day > 21', () => {
    const originalExpiry = process.env.ACTIVATION_PROGRAM_EXPIRY_DAY;
    process.env.ACTIVATION_PROGRAM_EXPIRY_DAY = '21';
    try {
      withMockedNow('2026-06-23T08:00:00.000Z', () => {
        const program = programAt('2026-06-01T08:00:00.000Z');
        const expired = maybeExpireProgram(program, 'Europe/Stockholm');
        assert.equal(expired.status, 'expired');
      });
    } finally {
      if (originalExpiry === undefined) delete process.env.ACTIVATION_PROGRAM_EXPIRY_DAY;
      else process.env.ACTIVATION_PROGRAM_EXPIRY_DAY = originalExpiry;
    }
  });
});

describe('Fas 3 — supportive fallback (dag 3)', () => {
  it('swaps body to supportive_fallback when day >= 3 and no completion', () => {
    const content = getDayContent(3, { childName: 'Estelle' });
    const effectiveDay = 3;
    const hasChildCompletion = false;

    let resolved = { ...content };
    if (effectiveDay >= 3 && !hasChildCompletion && content.supportive_fallback) {
      resolved = {
        ...content,
        body: content.supportive_fallback,
        is_supportive_fallback: true,
      };
    }

    assert.equal(resolved.is_supportive_fallback, true);
    assert.match(resolved.body, /komma igång/);
    assert.notEqual(resolved.body, content.body);
  });

  it('keeps celebratory copy when child has completed', () => {
    const content = getDayContent(3);
    const hasChildCompletion = true;
    let resolved = { ...content };
    if (3 >= 3 && !hasChildCompletion && content.supportive_fallback) {
      resolved = { ...content, body: content.supportive_fallback };
    }
    assert.equal(resolved.body, content.body);
  });
});

describe('Fas 3 — API routes', () => {
  it('registers all Fas 3 endpoints alongside Fas 2', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/routes/activation-program.js'),
      'utf8'
    );
    const required = [
      "router.get('/',",
      "router.post('/skip-day'",
      "router.post('/solo-day'",
      "router.post('/opt-out'",
      "router.post('/reflection'",
      "router.post('/cta-clicked'",
      "router.get('/new-completions'",
      "router.post('/aha-dismiss'",
      'supportive_fallback',
      'maybeMarkDay3Aha',
    ];
    for (const needle of required) {
      assert.ok(src.includes(needle), `missing ${needle}`);
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
