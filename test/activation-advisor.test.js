'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { injectMockDb } = require('./helpers/setup.js');
const { buildRecommendations, P0_TARGET_PCT } = require('../src/lib/activation-advisor');
const adminOperationalAlerts = require('../db/admin-operational-alerts');

describe('activation-advisor buildRecommendations', () => {
  it('flags critical when activation feature flags are off', async () => {
    const alerts = await buildRecommendations({
      families: 100,
      everActivatedPct: 20,
      neverSignalPct: 10,
      weekSignups: 0,
      weekAct1Variant: 0,
      weekAct1AdoptionPct: 0,
      weekP0_48h: 0,
      weekP0RatePct: 0,
      weekSchemaSaved: 0,
      weekChildAccess: 0,
      weekFirstCompletion: 0,
      incompleteOnboarding14d: 0,
      flags: [{ key: 'activation_starter_plan', enabled: false }],
      events30d: {},
    });
    const flagAlert = alerts.find((a) => a.slug.startsWith('activation-flags-off'));
    assert.ok(flagAlert);
    assert.equal(flagAlert.severity, 'critical');
  });

  it('warns when P0 rate is below target with enough signups', async () => {
    const alerts = await buildRecommendations({
      families: 200,
      everActivatedPct: 17,
      neverSignalPct: 20,
      weekSignups: 10,
      weekAct1Variant: 8,
      weekAct1AdoptionPct: 80,
      weekP0_48h: 1,
      weekP0RatePct: 10,
      weekSchemaSaved: 8,
      weekChildAccess: 5,
      weekFirstCompletion: 1,
      incompleteOnboarding14d: 0,
      flags: [{ key: 'activation_starter_plan', enabled: true }],
      events30d: { activation_onboarding_started: 5 },
    });
    const p0 = alerts.find((a) => a.slug.startsWith('activation-low-p0'));
    assert.ok(p0);
    assert.equal(p0.severity, 'warning');
    assert.match(p0.title, /10%/);
    assert.equal(p0.metrics.targetPct, P0_TARGET_PCT);
  });

  it('emits stable ok card when no issues and signups exist', async () => {
    const alerts = await buildRecommendations({
      families: 200,
      everActivatedPct: 30,
      neverSignalPct: 10,
      weekSignups: 6,
      weekAct1Variant: 5,
      weekAct1AdoptionPct: 83.3,
      weekP0_48h: 2,
      weekP0RatePct: 33.3,
      weekSchemaSaved: 6,
      weekChildAccess: 5,
      weekFirstCompletion: 4,
      incompleteOnboarding14d: 1,
      flags: [{ key: 'activation_starter_plan', enabled: true }],
      events30d: { activation_onboarding_started: 10 },
    });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].severity, 'info');
    assert.match(alerts[0].title, /stabil/i);
  });
});

describe('admin-operational-alerts helpers', () => {
  it('maps rows to dismissible recommendation cards', () => {
    const cards = adminOperationalAlerts.toRecommendationCards([{
      id: 'uuid-1',
      slug: 'activation-low-p0-2026-06-26',
      category: 'activation',
      severity: 'warning',
      title: 'Låg P0',
      body: 'Test body',
      action_route: '#analytics',
      created_at: '2026-06-26T07:30:00Z',
    }]);
    assert.equal(cards.length, 1);
    assert.equal(cards[0].type, 'operational_activation');
    assert.equal(cards[0].dismissible, true);
    assert.equal(cards[0].priority, 1);
    assert.equal(cards[0].route, '#analytics');
  });
});

describe('activation-advisor wiring', () => {
  it('scheduler is started from server.js', () => {
    const src = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    assert.match(src, /startActivationAdvisorScheduler/);
    assert.match(src, /stopActivationAdvisorScheduler/);
  });

  it('operational-alerts route is mounted in admin router', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/routes/admin.js'), 'utf8');
    assert.match(src, /operational-alerts/);
  });

  it('admin-start.js exposes dismiss handler', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/admin/admin-start.js'), 'utf8');
    assert.match(src, /dismissOperationalAlert/);
    assert.match(src, /severityStyles/);
  });
});

test('POST /api/admin/operational-alerts/:id/dismiss', async () => {
  const mock = injectMockDb();
  let dismissedId = null;

  mock.setQuery(async (sql, params) => {
    const q = String(sql);
    if (q.includes('UPDATE admin_operational_alert') && q.includes('dismissed_at')) {
      dismissedId = params[0];
      return { rows: [{ id: params[0] }] };
    }
    return { rows: [] };
  });

  const dbAlertsPath = require.resolve('../db/admin-operational-alerts');
  const routePath = require.resolve('../src/routes/admin/operational-alerts');
  delete require.cache[dbAlertsPath];
  delete require.cache[routePath];
  const router = require('../src/routes/admin/operational-alerts');

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { type: 'parent', id: 'admin-parent-1', isAdmin: true };
    next();
  });
  app.use(router);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/operational-alerts/alert-uuid/dismiss`, {
      method: 'POST',
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(dismissedId, 'alert-uuid');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
  }
});
