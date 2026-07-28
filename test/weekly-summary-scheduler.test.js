'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  msUntilNextSunday2100Stockholm,
  buildEncouragementMessage,
} = require('../src/lib/weekly-summary-scheduler');
const { buildNotificationEmailFooterHtml } = require('../src/lib/email-notification-footer');
const { buildOptOutUrl } = require('../src/lib/notification-email-opt-out');
const { loadLocales } = require('../src/lib/i18n');

loadLocales();

describe('weekly summary scheduler', () => {
  it('uses a dedicated DB client for advisory locks', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/weekly-summary-scheduler.js'),
      'utf8'
    );
    assert.ok(src.includes('db.getClient()'), 'must acquire advisory lock on a dedicated connection');
    assert.ok(src.includes('weekly_summary_send_log'), 'must dedupe sends per parent/week');
    assert.ok(src.includes("apiKeyProfile: 'weekly'"), 'must use dedicated weekly Resend key profile');
    assert.ok(src.includes('stockholm-time'), 'must use timezone-safe Stockholm conversion');
    assert.ok(!src.includes('Fail-open'), 'must not fail open on lock errors');
  });

  it('counts earned stars only from completed routines', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/weekly-summary-scheduler.js'),
      'utf8'
    );
    assert.match(
      src,
      /SUM\(dli\.star_value\) FILTER \(WHERE dli\.completed = true\)/,
      'must not sum potential stars from uncompleted schedule items'
    );
  });

  it('includes List-Unsubscribe URL and settings footer links', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/weekly-summary-scheduler.js'),
      'utf8'
    );
    assert.ok(src.includes('unsubscribeUrl:'), 'must pass unsubscribe URL to sendEmail');
    assert.ok(src.includes('buildNotificationEmailFooterHtml'), 'must use shared notification footer');
    assert.ok(src.includes('email_opt_out_token'), 'must load opt-out token per parent');
  });

  it('waits until 21:00 Stockholm when the server starts at 19:00 Stockholm', () => {
    const sunday1900Stockholm = new Date('2026-06-21T17:00:00.000Z'); // 19:00 CEST
    const ms = msUntilNextSunday2100Stockholm({ afterRun: false, now: sunday1900Stockholm });
    assert.ok(Math.abs(ms - 2 * 60 * 60 * 1000) < 2000, `expected ~2h wait, got ${ms}ms`);
  });

  it('schedules at least one week ahead after a Sunday 21:00 run', () => {
    const sunday2105 = new Date('2026-06-21T19:05:00.000Z'); // 21:05 Stockholm (CEST)
    const ms = msUntilNextSunday2100Stockholm({ afterRun: true, now: sunday2105 });
    assert.ok(ms >= 6 * 24 * 60 * 60 * 1000, `expected ~7 days, got ${ms}ms`);
  });

  it('does not loop with zero delay after the 21:00 slot has passed', () => {
    const sunday2130 = new Date('2026-06-21T19:30:00.000Z'); // 21:30 Stockholm (CEST)
    const ms = msUntilNextSunday2100Stockholm({ afterRun: true, now: sunday2130 });
    assert.ok(ms >= 60 * 1000, `expected non-zero reschedule delay, got ${ms}ms`);
  });

  it('fires immediately when the server starts exactly at 21:00 Stockholm', () => {
    const sunday2100 = new Date('2026-06-21T19:00:00.000Z'); // 21:00 Stockholm (CEST)
    const ms = msUntilNextSunday2100Stockholm({ afterRun: false, now: sunday2100 });
    assert.equal(ms, 0);
  });
});

describe('buildEncouragementMessage', () => {
  const child = { child: { name: 'Anna' }, stats: { routinesCompleted: 0, starsEarned: 0 } };

  it('does not praise zero progress', () => {
    const msg = buildEncouragementMessage([child], 'sv-SE');
    assert.match(msg, /ny vecka/i);
    assert.doesNotMatch(msg, /fantastiska/i);
  });

  it('celebrates real completions', () => {
    const msg = buildEncouragementMessage([
      { child: { name: 'Anna' }, stats: { routinesCompleted: 3, starsEarned: 5 } },
    ], 'sv-SE');
    assert.match(msg, /fantastiska/i);
  });

  it('en-GB encouragement differs from sv-SE', () => {
    const sv = buildEncouragementMessage([child], 'sv-SE');
    const en = buildEncouragementMessage([child], 'en-GB');
    assert.notEqual(sv, en);
  });
});

describe('notification email footer', () => {
  it('links to web settings and opt-out', () => {
    const html = buildNotificationEmailFooterHtml({
      locale: 'sv-SE',
      optOutUrl: 'https://example.test/api/account/notifications/opt-out?token=abc',
      optOutLabel: 'Stäng av veckosammanfattning',
    });
    assert.match(html, /settings#aviseringar/);
    assert.match(html, /Stäng av veckosammanfattning/);
    assert.doesNotMatch(html, /i appen/i);
    assert.match(html, /Inställningar → Notiser/);
  });

  it('en-GB footer uses English labels', () => {
    const html = buildNotificationEmailFooterHtml({ locale: 'en-GB' });
    assert.match(html, /Settings → Notifications/);
  });

  it('buildOptOutUrl encodes channel', () => {
    const url = buildOptOutUrl('00000000-0000-4000-8000-000000000001', 'weekly_summary');
    assert.match(url, /channel=weekly_summary/);
    assert.match(url, /\/api\/account\/notifications\/opt-out/);
  });
});
