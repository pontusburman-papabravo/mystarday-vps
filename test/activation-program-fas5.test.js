'use strict';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/test';

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');

const { getPushContent } = require('../src/lib/activation-program-content');
const { getEffectiveProgramDay } = require('../src/lib/activation-program');
const {
  shouldSendPushForProgram,
  PUSH_HOUR_STOCKHOLM,
} = require('../src/lib/activation-program-scheduler');
const parentActivationProgram = require('../db/parent-activation-program');

function programAt(startIso, overrides = {}) {
  return {
    started_at: startIso,
    program_type: 'onboarding_7d',
    status: 'active',
    cohort_arm: 'treatment',
    push_sent_days: {},
    ...overrides,
  };
}

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

describe('Fas 5 — getPushContent', () => {
  it('returns null for day 1 (no push)', () => {
    assert.equal(getPushContent(1, { childName: 'Anna' }), null);
  });

  it('day 2 push includes child name and ap_push param', () => {
    const push = getPushContent(2, { childName: 'Anna' });
    assert.ok(push);
    assert.match(push.body, /Anna/);
    assert.match(push.body, /God morgon/);
    assert.match(push.url, /ap_push=2/);
  });

  it('days 3–7 have spec copy', () => {
    assert.match(getPushContent(3, { childName: 'Bo' }).body, /stjärna/);
    assert.match(getPushContent(4).body, /aktivitet/);
    assert.match(getPushContent(5, { childName: 'Bo' }).body, /Skattkammaren/);
    assert.match(getPushContent(6).body, /ansvaret/);
    assert.match(getPushContent(7).body, /Grattis/);
  });

  it('day 5 push links to treasury', () => {
    const push = getPushContent(5);
    assert.ok(push.url.includes('/library-treasury'));
  });
});

describe('Fas 5 — shouldSendPushForProgram', () => {
  const tz = 'Europe/Stockholm';

  it('uses getEffectiveProgramDay not last_seen_day', () => {
    // started June 8 00:00 Stockholm; now June 10 00:00 Stockholm → effective day 3
    withMockedNow('2026-06-09T22:00:00.000Z', () => {
      const program = programAt('2026-06-07T22:00:00.000Z', {
        last_seen_day: 1,
        push_sent_days: {},
      });
      const effectiveDay = getEffectiveProgramDay(program, tz);
      const { send, effectiveDay: day } = shouldSendPushForProgram(program, tz);
      assert.equal(day, effectiveDay);
      assert.equal(send, true);
      assert.equal(day, 3);
    });
  });

  it('skips day 1 (no push)', () => {
    withMockedNow('2026-06-08T12:00:00.000Z', () => {
      const program = programAt('2026-06-07T22:00:00.000Z');
      const { send, effectiveDay } = shouldSendPushForProgram(program, tz);
      assert.equal(effectiveDay, 1);
      assert.equal(send, false);
    });
  });

  it('skips control arm (invariant #6)', () => {
    withMockedNow('2026-06-09T22:00:00.000Z', () => {
      const program = programAt('2026-06-07T22:00:00.000Z', { cohort_arm: 'control' });
      const { send } = shouldSendPushForProgram(program, tz);
      assert.equal(send, false);
    });
  });

  it('max 1 push per effective day', () => {
    withMockedNow('2026-06-09T22:00:00.000Z', () => {
      const program = programAt('2026-06-07T22:00:00.000Z', {
        push_sent_days: { '3': '2026-06-10T08:00:00Z' },
      });
      const { send, effectiveDay } = shouldSendPushForProgram(program, tz);
      assert.equal(effectiveDay, 3);
      assert.equal(send, false);
    });
  });

  it('caps at day 7 for onboarding_7d', () => {
    withMockedNow('2026-06-20T06:00:00.000Z', () => {
      const program = programAt('2026-06-01T22:00:00.000Z', { push_sent_days: { '7': 'x' } });
      const { send, effectiveDay } = shouldSendPushForProgram(program, tz);
      assert.equal(effectiveDay, 7);
      assert.equal(send, false);
    });
  });
});

describe('Fas 5 — wasPushSentForDay', () => {
  it('reads push_sent_days JSONB keys', () => {
    assert.equal(parentActivationProgram.wasPushSentForDay({ push_sent_days: {} }, 2), false);
    assert.equal(parentActivationProgram.wasPushSentForDay({ push_sent_days: { '2': 't' } }, 2), true);
  });
});

describe('Fas 5 — wiring', () => {
  it('registers push-clicked route', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/routes/activation-program.js'),
      'utf8'
    );
    assert.ok(src.includes("router.post('/push-clicked'"));
    assert.ok(src.includes('trackPushClicked'));
  });

  it('scheduler module exports start/stop', () => {
    const mod = require('../src/lib/activation-program-scheduler');
    assert.equal(typeof mod.startActivationPushScheduler, 'function');
    assert.equal(typeof mod.runActivationPushJob, 'function');
    assert.equal(PUSH_HOUR_STOCKHOLM, 8);
  });

  it('server starts activation push scheduler', () => {
    const src = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    assert.ok(src.includes('startActivationPushScheduler'));
    assert.ok(src.includes('stopActivationPushScheduler'));
  });

  it('migration file exists for push_sent_days', () => {
    const file = path.join(
      __dirname,
      '../migrations/1799900000000_activation_program_push_sent_days.js'
    );
    assert.ok(fs.existsSync(file));
  });

  it('banner tracks ap_push URL param', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../public/js/activation-program-banner.js'),
      'utf8'
    );
    assert.ok(src.includes('ap_push'));
    assert.ok(src.includes('push-clicked'));
  });
});
