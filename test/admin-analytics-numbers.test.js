'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  conversionFromFunnel,
  funnelStepsFromSources,
  buildHeatmapFromRows,
} = require('../src/lib/admin-analytics-numbers');

describe('admin analytics number definitions', () => {
  it('does not mix event signups with database children', () => {
    const mixedWouldBe800 = conversionFromFunnel({
      eventStarted: 10,
      eventCompleted: 0,
      dbRegistered: 80,
      dbWithChild: 70,
    });
    assert.equal(mixedWouldBe800.source, 'database');
    assert.equal(mixedWouldBe800.started, 80);
    assert.equal(mixedWouldBe800.completed, 70);
    assert.equal(mixedWouldBe800.conversion_rate, 87.5);
  });

  it('uses events when both funnel steps exist', () => {
    const fromEvents = conversionFromFunnel({
      eventStarted: 40,
      eventCompleted: 20,
      dbRegistered: 200,
      dbWithChild: 180,
    });
    assert.equal(fromEvents.source, 'events');
    assert.equal(fromEvents.started, 40);
    assert.equal(fromEvents.completed, 20);
    assert.equal(fromEvents.conversion_rate, 50);
  });

  it('keeps signup/email/child on one source so later steps cannot jump', () => {
    const mixed = funnelStepsFromSources(
      { funnel_landing_visit: 5, funnel_signup_started: 12 },
      { families_registered: 96, families_verified: 80, families_with_child: 70 }
    );
    assert.equal(mixed[0].count, 5);
    assert.equal(mixed[1].count, 96);
    assert.equal(mixed[2].count, 80);
    assert.equal(mixed[3].count, 70);
    assert.ok(mixed[2].count <= mixed[1].count);
    assert.ok(mixed[3].count <= mixed[2].count);
  });

  it('uses events for the last three steps only when all three are tracked', () => {
    const steps = funnelStepsFromSources(
      {
        funnel_landing_visit: 8,
        funnel_signup_started: 12,
        funnel_email_verified: 10,
        funnel_first_child_created: 9,
      },
      { families_registered: 96, families_verified: 80, families_with_child: 70 }
    );
    assert.deepEqual(steps.map((s) => s.count), [8, 12, 10, 9]);
  });

  it('puts Sunday on Sön and Monday on Mån using ISODOW', () => {
    const heat = buildHeatmapFromRows([
      { dow: 1, hour: 7, event_count: 4 },
      { dow: 7, hour: 7, event_count: 9 },
      { dow: 0, hour: 7, event_count: 99 },
      { dow: 1, hour: null, event_count: 50 },
    ]);
    assert.equal(heat.rows[0].day, 'Mån');
    assert.equal(heat.rows[0].hours[7], 4);
    assert.equal(heat.rows[6].day, 'Sön');
    assert.equal(heat.rows[6].hours[7], 9);
    assert.equal(heat.peak_hour, 7);
  });

  it('heatmap SQL uses Swedish time and created_at hour, not empty time_bucket', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'db/analytics.js'), 'utf8');
    assert.match(src, /EXTRACT\(ISODOW FROM created_at AT TIME ZONE 'Europe\/Stockholm'\)/);
    assert.match(src, /EXTRACT\(HOUR FROM created_at AT TIME ZONE 'Europe\/Stockholm'\)/);
    assert.doesNotMatch(src, /time_bucket AS hour/);
    assert.doesNotMatch(src, /EXTRACT\(DOW FROM created_at\)/);
  });
});
