'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { injectMockDb } = require('./helpers/setup.js');
const startSummaryDb = require('../db/start-summary');

describe('start-summary db helpers', () => {
  test('buildPeriodMetric computes deltaPct', () => {
    const metric = startSummaryDb.buildPeriodMetric({ last7d: 10, prev7d: 5, total: 100 });
    assert.equal(metric.deltaAbs, 5);
    assert.equal(metric.deltaPct, 100);
  });

  test('buildPeriodMetric returns null deltaPct when prev7d is 0', () => {
    const metric = startSummaryDb.buildPeriodMetric({ last7d: 3, prev7d: 0, total: 3 });
    assert.equal(metric.deltaPct, null);
  });
});

test('GET /api/admin/start-summary returns composed payload', async () => {
  const mock = injectMockDb();

  mock.setQuery(async (sql) => {
    const q = String(sql);
    if (q.includes('signups_7d') && q.includes('family_activation_state')) {
      return {
        rows: [{
          signups_7d: 8,
          signups_prev_7d: 5,
          signups_today: 2,
          schema_saved: 6,
          child_access: 4,
          first_completion: 2,
          p0_48h: 1,
        }],
      };
    }
    if (q.includes('stuck_families')) {
      return { rows: [{ stuck: 4 }] };
    }
    if (q.includes('FROM family WHERE archived_at IS NULL') && q.includes('COUNT(*)::int AS total')) {
      return { rows: [{ total: 201 }] };
    }
    if (q.includes("key = 'founder_family_limit'")) {
      return { rows: [{ value: null }] };
    }
    if (q.includes('FROM package_interest') && q.includes('last7d')) {
      return { rows: [{ last7d: 2, prev7d: 1, total: 10 }] };
    }
    if (q.includes('FROM professional_interest') && q.includes('last7d')) {
      return { rows: [{ last7d: 1, prev7d: 0, total: 5 }] };
    }
    if (q.includes('FROM waitlist') && q.includes('last7d')) {
      return { rows: [{ last7d: 4, prev7d: 2, total: 20 }] };
    }
    if (q.includes('FROM family') && q.includes('last7d')) {
      return { rows: [{ last7d: 3, prev7d: 3, total: 50 }] };
    }
    if (q.includes('needs_follow_up_count') || (q.includes('FROM contact_message') && q.includes("status = 'new'") && q.includes('FILTER'))) {
      return { rows: [{ unread_count: 2, needs_follow_up_count: 3, active_count: 1, answered_count: 0, archived_count: 0 }] };
    }
    if (q.includes('FROM contact_message cm') && q.includes('in_progress')) {
      return {
        rows: [{
          id: 1,
          name: 'Anna',
          email: 'anna@example.com',
          message: 'Hej!',
          created_at: '2026-06-20T10:00:00Z',
          is_read: false,
          status: 'new',
          internal_note: null,
          family_id: null,
          family_name: null,
        }],
      };
    }
    if (q.includes('lead_status = \'ny\'')) {
      return { rows: [{ c: 0 }] };
    }
    if (q.includes('FROM admin_operational_alert')) {
      return {
        rows: [{
          id: 'alert-1',
          slug: 'activation-low-p0-2026-06-26',
          category: 'activation',
          severity: 'warning',
          title: 'Låg P0-aktivering',
          body: 'Test alert',
          action_route: '#analytics',
          metrics: {},
          created_at: '2026-06-26T07:30:00Z',
        }],
      };
    }
    if (q.includes("SELECT type, id, title, meta, created_at, route FROM")) {
      return {
        rows: [{
          type: 'family_created',
          id: 'fam-1',
          title: 'Ny familj: Testfamilj',
          meta: null,
          created_at: '2026-06-20T09:00:00Z',
          route: '#familjer',
        }],
      };
    }
    return { rows: [] };
  });

  const routePath = require.resolve('../src/routes/admin/start-summary');
  const dbModulePath = require.resolve('../db/start-summary');
  const cmPath = require.resolve('../db/contact-messages');
  const alertsPath = require.resolve('../db/admin-operational-alerts');
  delete require.cache[cmPath];
  delete require.cache[alertsPath];
  delete require.cache[dbModulePath];
  delete require.cache[routePath];
  const startRouter = require('../src/routes/admin/start-summary');

  const app = express();
  app.use((req, _res, next) => {
    req.user = { type: 'parent', id: 'admin-1', isAdmin: true };
    next();
  });
  app.use(startRouter);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/start-summary`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.generatedAt);
    assert.equal(body.keyMetrics.signups7d, 8);
    assert.equal(body.keyMetrics.totalFamilies, 201);
    assert.equal(body.keyMetrics.p0_48h, 1);
    assert.equal(body.keyMetrics.stuckOnboarding, 4);
    assert.equal(body.keyMetrics.founderSlotsLeft, null);
    assert.equal(body.keyMetrics.founderUnlimited, true);
    assert.equal(body.messages.unreadCount, 2);
    assert.equal(body.messages.needsFollowUpCount, 3);
    assert.equal(body.messages.disclaimer, null);
    assert.equal(body.activity.length, 1);
    assert.equal(body.activity[0].route, '#familjer');
    assert.equal(body.quickActions.length, 6);
    assert.equal(body.recommendations.length, 1);
    assert.equal(body.recommendations[0].type, 'operational_activation');
    assert.equal(body.recommendations[0].dismissible, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
  }
});

test('start-summary route is mounted in admin router', () => {
  const adminJs = fs.readFileSync(path.join(__dirname, '../src/routes/admin.js'), 'utf8');
  assert.match(adminJs, /start-summary/);
});

test('getMessageCounts query uses contact_message alias consistently', () => {
  const cmSrc = fs.readFileSync(path.join(__dirname, '../db/contact-messages.js'), 'utf8');
  assert.match(cmSrc, /FROM contact_message cm/);
  assert.doesNotMatch(cmSrc, /FROM contact_message\n/);
});

test('fetchKeyMetrics does not query Meta attribution', () => {
  const src = fs.readFileSync(path.join(__dirname, '../db/start-summary.js'), 'utf8');
  assert.doesNotMatch(src, /signup_attribution/);
  assert.doesNotMatch(src, /metaSignups/);
});

test('fetchRecommendations uses operational alerts only', () => {
  const src = fs.readFileSync(path.join(__dirname, '../db/start-summary.js'), 'utf8');
  assert.match(src, /adminOperationalAlerts\.listActive/);
  assert.doesNotMatch(src, /UNION ALL SELECT id FROM professional_interest/);
});

test('admin-start.js shows familjer KPI instead of Meta', () => {
  const js = fs.readFileSync(path.join(__dirname, '../public/admin/admin-start.js'), 'utf8');
  assert.match(js, /Antal familjer/);
  assert.doesNotMatch(js, /Från Meta-annons/);
  assert.doesNotMatch(js, /metaSignups/);
});

test('admin-start.js and overview blocks exist', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/admin/index.html'), 'utf8');
  assert.match(html, /id="startKpiBlock"/);
  assert.doesNotMatch(html, /id="startGrowthBlock"/);
  assert.match(html, /admin-start\.js/);
  assert.match(html, /admin-produktanalys-shell\.js/);
  assert.match(html, /prenumerationWorkspaceTabs/);
  assert.match(html, /admin-deprecated-section/);
});
