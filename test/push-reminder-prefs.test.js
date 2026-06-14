'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  parseScheduleReminderPrefs,
  isScheduleReminderEnabled,
  isChildNotificationEnabled,
} = require('../src/lib/push-reminder-prefs');

describe('parseScheduleReminderPrefs', () => {
  it('defaults enabled and schedule_reminder to true when prefs missing', () => {
    const prefs = parseScheduleReminderPrefs(null);
    assert.equal(prefs.enabled, true);
    assert.equal(prefs.schedule_reminder, true);
    assert.equal(prefs.reminder_lead_minutes, 10);
    assert.deepEqual(prefs.per_child, {});
  });

  it('honors schedule_reminder: false (PR #135 regression)', () => {
    const prefs = parseScheduleReminderPrefs({ schedule_reminder: false });
    assert.equal(prefs.schedule_reminder, false);
  });

  it('honors enabled: false', () => {
    const prefs = parseScheduleReminderPrefs({ enabled: false });
    assert.equal(prefs.enabled, false);
  });

  it('preserves custom reminder_lead_minutes', () => {
    const prefs = parseScheduleReminderPrefs({ reminder_lead_minutes: 7 });
    assert.equal(prefs.reminder_lead_minutes, 7);
  });
});

describe('isScheduleReminderEnabled', () => {
  const base = parseScheduleReminderPrefs({});

  it('allows when global toggles are on', () => {
    assert.equal(isScheduleReminderEnabled(base), true);
    assert.equal(isScheduleReminderEnabled(base, 'child-1'), true);
  });

  it('blocks when global schedule_reminder is off', () => {
    const prefs = parseScheduleReminderPrefs({ schedule_reminder: false });
    assert.equal(isScheduleReminderEnabled(prefs), false);
    assert.equal(isScheduleReminderEnabled(prefs, 'child-1'), false);
  });

  it('blocks when global enabled is off', () => {
    const prefs = parseScheduleReminderPrefs({ enabled: false });
    assert.equal(isScheduleReminderEnabled(prefs), false);
  });

  it('blocks per-child opt-out while global stays on', () => {
    const prefs = parseScheduleReminderPrefs({
      per_child: { 'child-42': { schedule_reminder: false } },
    });
    assert.equal(isScheduleReminderEnabled(prefs, 'child-42'), false);
    assert.equal(isScheduleReminderEnabled(prefs, 'child-99'), true);
  });
});

describe('isChildNotificationEnabled', () => {
  const prefs = {
    schedule_reminder: true,
    inactivity_nudge: true,
    star_milestone: true,
    backfill_reminder: true,
    per_child: {},
  };

  it('falls back to global toggle when per-child unset', () => {
    assert.equal(isChildNotificationEnabled(prefs, 'c1', 'inactivity_nudge'), true);
  });

  it('respects per-child false override', () => {
    prefs.per_child.c1 = { inactivity_nudge: false };
    assert.equal(isChildNotificationEnabled(prefs, 'c1', 'inactivity_nudge'), false);
  });

  it('respects per-child true override even when global is false', () => {
    const local = {
      ...prefs,
      star_milestone: false,
      per_child: { c2: { star_milestone: true } },
    };
    assert.equal(isChildNotificationEnabled(local, 'c2', 'star_milestone'), true);
  });
});

describe('push-reminder-scheduler schedule query (PR #128 regression)', () => {
  const schedulerSrc = fs.readFileSync(
    path.join(__dirname, '../src/lib/push-reminder-scheduler.js'),
    'utf8'
  );

  it('queries real weekly_schedule_item.start_time column', () => {
    assert.ok(schedulerSrc.includes('wsi.start_time AS scheduled_time'));
    assert.ok(!schedulerSrc.includes('scheduled_time FROM weekly_schedule_item'));
  });

  it('joins activity_template for activity name', () => {
    assert.ok(schedulerSrc.includes('at.name AS activity_name'));
    assert.ok(schedulerSrc.includes('JOIN activity_template at'));
  });

  it('filters by weekly_schedule.day_of_week', () => {
    assert.ok(schedulerSrc.includes('ws.day_of_week = $2'));
  });

  it('dedupes via notification_log title prefix', () => {
    assert.ok(schedulerSrc.includes("type = 'schedule_reminder'"));
    assert.ok(schedulerSrc.includes('title LIKE $2'));
  });
});
