'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { injectMockDb } = require('./helpers/setup.js');
const {
  FIRST_SUCCESS_FUNNEL_STEPS,
  buildStepConversions,
  buildStepRates,
} = require('../db/activation-funnel');

const ROOT = path.join(__dirname, '..');

describe('First Success funnel — step definitions', () => {
  it('defines exactly 6 steps in order', () => {
    assert.equal(FIRST_SUCCESS_FUNNEL_STEPS.length, 6);
    assert.deepEqual(
      FIRST_SUCCESS_FUNNEL_STEPS.map((s) => s.key),
      [
        'signup',
        'child_created',
        'routine_ready',
        'child_access',
        'first_completion',
        'second_day_activity',
      ]
    );
  });
});

describe('First Success funnel — conversions', () => {
  it('builds step-to-step conversion rates between adjacent steps', () => {
    const row = {
      signup: 100,
      child_created: 80,
      routine_ready: 60,
      child_access: 50,
      first_completion: 40,
      second_day_activity: 20,
    };
    const conversions = buildStepConversions(row, FIRST_SUCCESS_FUNNEL_STEPS);
    assert.equal(Object.keys(conversions).length, 5);
    assert.equal(conversions.signup_to_child_created.rate_pct, 80);
    assert.equal(conversions.signup_to_child_created.from_count, 100);
    assert.equal(conversions.signup_to_child_created.to_count, 80);
    assert.equal(conversions.child_created_to_routine_ready.rate_pct, 75);
    assert.equal(conversions.first_completion_to_second_day_activity.rate_pct, 50);
  });

  it('returns 0% conversion when prior step count is zero', () => {
    const conversions = buildStepConversions(
      { signup: 0, child_created: 0 },
      FIRST_SUCCESS_FUNNEL_STEPS.slice(0, 2)
    );
    assert.equal(conversions.signup_to_child_created.rate_pct, 0);
  });

  it('buildStepRates computes % of signup for each step', () => {
    const rates = buildStepRates(
      { signup: 10, child_created: 7, routine_ready: 5 },
      FIRST_SUCCESS_FUNNEL_STEPS.slice(0, 3)
    );
    assert.equal(rates.signup, 100);
    assert.equal(rates.child_created, 70);
    assert.equal(rates.routine_ready, 50);
  });
});

describe('First Success funnel — SQL contract', () => {
  it('routine_ready uses schema_saved_at only (no weekly_schedule fallback)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'db/activation-funnel.js'), 'utf8');
    assert.match(src, /schema_saved_at IS NOT NULL/);
    assert.doesNotMatch(src, /weekly_schedule/);
    assert.doesNotMatch(src, /onboarding_started/);
    assert.doesNotMatch(src, /p0_activated_48h/);
  });

  it('child_created reads child_created_at from activation state', () => {
    const src = fs.readFileSync(path.join(ROOT, 'db/activation-funnel.js'), 'utf8');
    assert.match(src, /child_created_at IS NOT NULL/);
  });

  it('second_day_activity uses daily_log_item with family timezone', () => {
    const src = fs.readFileSync(path.join(ROOT, 'db/activation-funnel.js'), 'utf8');
    assert.match(src, /families_with_second_day/);
    assert.match(src, /daily_log_item dli/);
    assert.match(src, /fam\.timezone/);
    assert.match(src, /completed_date/);
    assert.match(src, />= 2/);
  });

  it('keeps childAccessDiagnostics separate from main funnel', () => {
    const src = fs.readFileSync(path.join(ROOT, 'db/activation-funnel.js'), 'utf8');
    assert.match(src, /childAccessDiagnostics/);
    assert.match(src, /getActivationChildAccessDiagnostics/);
    assert.match(src, /child_profile_created/);
  });
});

describe('First Success funnel — second_day_activity (DB)', () => {
  it('counts families with completions on two distinct timezone dates', async (t) => {
    const { setupTestDb } = require('./helpers/setup.js');
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { randomUUID } = require('crypto');
    const familyId = randomUUID();
    const childId = randomUUID();

    try {
      await db.query(
        `INSERT INTO family (id, name, timezone) VALUES ($1, 'FunnelTest', 'Europe/Stockholm')`,
        [familyId]
      );
      await db.query(
        `INSERT INTO child (id, family_id, name, emoji, pin, username, pin_fingerprint)
         VALUES ($1, $2, 'Testbarn', '⭐', 'hash', 'testbarn', 'fp')`,
        [childId, familyId]
      );

      const logRes = await db.query(
        `INSERT INTO daily_log (child_id, date) VALUES ($1, '2026-06-10') RETURNING id`,
        [childId]
      );
      const logId = logRes.rows[0].id;

      await db.query(
        `INSERT INTO daily_log_item (daily_log_id, name, completed, completed_date, completed_at)
         VALUES ($1, 'Testaktivitet', true, '2026-06-10', '2026-06-10T08:00:00Z')`,
        [logId]
      );

      const oneDay = await db.query(
        `SELECT COUNT(*)::int AS n FROM (
           SELECT ch.family_id
           FROM child ch
           JOIN family fam ON fam.id = ch.family_id
           JOIN daily_log dl ON dl.child_id = ch.id
           JOIN daily_log_item dli ON dli.daily_log_id = dl.id
           WHERE ch.family_id = $1 AND dli.completed = true
           GROUP BY ch.family_id, fam.timezone
           HAVING COUNT(DISTINCT COALESCE(
             dli.completed_date,
             (dli.completed_at AT TIME ZONE COALESCE(fam.timezone, 'Europe/Stockholm'))::date
           )) >= 2
         ) sub`,
        [familyId]
      );
      assert.equal(oneDay.rows[0].n, 0);

      const log2 = await db.query(
        `INSERT INTO daily_log (child_id, date) VALUES ($1, '2026-06-11') RETURNING id`,
        [childId]
      );
      await db.query(
        `INSERT INTO daily_log_item (daily_log_id, name, completed, completed_date, completed_at)
         VALUES ($1, 'Testaktivitet', true, '2026-06-11', '2026-06-11T08:00:00Z')`,
        [log2.rows[0].id]
      );

      const twoDays = await db.query(
        `SELECT COUNT(*)::int AS n FROM (
           SELECT ch.family_id
           FROM child ch
           JOIN family fam ON fam.id = ch.family_id
           JOIN daily_log dl ON dl.child_id = ch.id
           JOIN daily_log_item dli ON dli.daily_log_id = dl.id
           WHERE ch.family_id = $1 AND dli.completed = true
           GROUP BY ch.family_id, fam.timezone
           HAVING COUNT(DISTINCT COALESCE(
             dli.completed_date,
             (dli.completed_at AT TIME ZONE COALESCE(fam.timezone, 'Europe/Stockholm'))::date
           )) >= 2
         ) sub`,
        [familyId]
      );
      assert.equal(twoDays.rows[0].n, 1);
    } finally {
      await db.cleanup();
    }
  });
});

test('GET /api/admin/analytics/activation-funnel returns 6-step cohort with conversions', async () => {
  const mock = injectMockDb();

  mock.setQuery(async (sql) => {
    const q = String(sql);
    if (q.includes('families_with_second_day') && q.includes('cohort_week')) {
      return {
        rows: [{
          cohort_week: '2026-06-23',
          signup: 10,
          child_created: 8,
          routine_ready: 6,
          child_access: 5,
          first_completion: 4,
          second_day_activity: 2,
        }],
      };
    }
    if (q.includes('child_profile_created') && q.includes('child_access_completed')) {
      return {
        rows: [{
          child_profile_created: 7,
          child_pin_created: 6,
          child_view_opened: 5,
          child_handoff_skipped: 1,
          child_access_completed: 5,
        }],
      };
    }
    return { rows: [] };
  });

  const funnelPath = require.resolve('../db/activation-funnel');
  const routePath = require.resolve('../src/routes/admin/analytics');
  delete require.cache[funnelPath];
  delete require.cache[routePath];
  const router = require('../src/routes/admin/analytics');

  const app = express();
  app.use((req, _res, next) => {
    req.user = { type: 'parent', id: 'admin-1', isAdmin: true };
    next();
  });
  app.use(router);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/analytics/activation-funnel?weeks=4`);
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.steps.length, 6);
    assert.equal(body.steps[0].key, 'signup');
    assert.equal(body.steps[5].key, 'second_day_activity');

    assert.equal(body.cohorts.length, 1);
    assert.equal(body.cohorts[0].counts.signup, 10);
    assert.equal(body.cohorts[0].counts.second_day_activity, 2);
    assert.equal(body.cohorts[0].conversions.signup_to_child_created.rate_pct, 80);
    assert.equal(body.cohorts[0].conversions.first_completion_to_second_day_activity.rate_pct, 50);
    assert.ok(body.childAccessDiagnostics);
    assert.equal(body.childAccessDiagnostics.counts.child_profile_created, 7);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
  }
});
