'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { t, loadLocales } = require('../src/lib/i18n');

describe('push notification dedupe keys', () => {
  it('custody morning dedupe uses metadata child_id, not localized title', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/push-reminder-scheduler.js'),
      'utf8'
    );
    assert.match(src, /type = 'custody_morning_reminder'/);
    assert.match(src, /metadata->>'child_id'/);
    assert.doesNotMatch(src, /custody_morning_reminder[\s\S]*title = \$/);
  });

  it('custody handoff dedupe uses metadata child_id, not title LIKE', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/custody-handoff-scheduler.js'),
      'utf8'
    );
    assert.match(src, /metadata->>'child_id'/);
    assert.doesNotMatch(src, /title LIKE/);
  });

  it('schedule reminder dedupe uses metadata keys, not localized title', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/push-reminder-scheduler.js'),
      'utf8'
    );
    assert.match(src, /metadata->>'schedule_item_id'/);
    assert.match(src, /metadata->>'schedule_date'/);
    const scheduleBlock = src.slice(
      src.indexOf('type = \'schedule_reminder\''),
      src.indexOf('type = \'schedule_reminder\'') + 800
    );
    assert.doesNotMatch(scheduleBlock, /AND title =/);
  });

  it('locale switch does not change custody morning dedupe identity', () => {
    loadLocales();
    const childId = 'child-uuid-1';
    const dateStr = '2026-07-28';
    const svTitle = t('sv-SE', 'push.custodyMorning.title', { childName: 'Anna' });
    const enTitle = t('en-GB', 'push.custodyMorning.title', { childName: 'Anna' });
    assert.notEqual(svTitle, enTitle);

    const svKey = `custody_morning:${childId}:${dateStr}`;
    const enKey = `custody_morning:${childId}:${dateStr}`;
    assert.equal(svKey, enKey);
  });

  it('star milestone dedupe remains metadata-based (regression)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/push-reminder-scheduler.js'),
      'utf8'
    );
    assert.match(src, /metadata->>'child_id'/);
    assert.match(src, /metadata->>'milestone'/);
  });
});
