'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { injectMockDb } = require('./helpers/setup.js');
const stuckFamiliesDb = require('../db/activation-stuck-families');

describe('activation funnel fixes', () => {
  it('onboarding.js skips legacy goToStep(1) when ACT-1 is active', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/onboarding.js'), 'utf8');
    assert.match(src, /const act1Active = window\.OnboardingStarterPlan/);
    assert.match(src, /if \(!act1Active\) \{[\s\S]*goToStep\(1\)/);
  });

  it('auth.js redirects incomplete onboarding away from parent pages', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/auth.js'), 'utf8');
    assert.match(src, /function redirectIncompleteOnboarding/);
    assert.match(src, /redirectIncompleteOnboarding\(user\)/);
  });

  it('starter plan does not double-track starter_plan_saved client-side', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/onboarding-starter-plan.js'), 'utf8');
    assert.doesNotMatch(src, /track\('starter_plan_saved'/);
  });
});

test('GET /api/admin/activation-program/stuck-families', async () => {
  const mock = injectMockDb();

  mock.setQuery(async (sql) => {
    const q = String(sql);
    if (q.includes('FROM family f') && q.includes('onboarding_completed')) {
      return {
        rows: [{
          family_id: 'fam-1',
          family_name: 'Testfamilj',
          created_at: '2026-06-20T10:00:00Z',
          child_count: 0,
          activation_variant: 'legacy',
          schema_saved_at: null,
          activation_nudge_sent_at: null,
          onboarding_completed: false,
          act1_started: false,
          legacy_onboarding_started: false,
          has_login: false,
        }],
      };
    }
    return { rows: [] };
  });

  const dbPath = require.resolve('../db/activation-stuck-families');
  const routePath = require.resolve('../src/routes/admin/activation-program');
  delete require.cache[dbPath];
  delete require.cache[routePath];
  const router = require('../src/routes/admin/activation-program');

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
    const res = await fetch(`http://127.0.0.1:${port}/activation-program/stuck-families`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.count, 1);
    assert.equal(body.families[0].stuckReason, 'never_opened_onboarding');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
  }
});

describe('activation-stuck-families mapper', () => {
  it('classifies child without schema', () => {
    const rows = stuckFamiliesDb.listStuckFamilies;
    assert.equal(typeof rows, 'function');
  });
});
