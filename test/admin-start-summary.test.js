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
    if (q.includes('needs_follow_up_count')) {
      return { rows: [{ unread_count: 2, needs_follow_up_count: 3 }] };
    }
    if (q.includes('FROM contact_message cm') && q.includes('LEFT JOIN parent')) {
      return {
        rows: [{
          id: 1,
          name: 'Anna',
          email: 'anna@example.com',
          message: 'Hej!',
          created_at: '2026-06-20T10:00:00Z',
          is_read: false,
          internal_note: null,
          family_id: null,
          family_name: null,
        }],
      };
    }
    if (q.includes("SELECT type, id, title, meta, created_at, route FROM")) {
      return {
        rows: [{
          type: 'waitlist_created',
          id: '1',
          title: 'Jane',
          meta: 'jane@example.com',
          created_at: '2026-06-20T09:00:00Z',
          route: '#waitlist',
        }],
      };
    }
    return { rows: [] };
  });

  const routePath = require.resolve('../src/routes/admin/start-summary');
  const dbModulePath = require.resolve('../db/start-summary');
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
    assert.equal(body.growth.packageInterest.last7d, 2);
    assert.equal(body.messages.unreadCount, 2);
    assert.equal(body.messages.needsFollowUpCount, 3);
    assert.ok(body.messages.disclaimer.includes('förenklad'));
    assert.equal(body.activity.length, 1);
    assert.equal(body.activity[0].route, '#waitlist');
    assert.equal(body.quickActions.length, 6);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
  }
});

test('start-summary route is mounted in admin router', () => {
  const adminJs = fs.readFileSync(path.join(__dirname, '../src/routes/admin.js'), 'utf8');
  assert.match(adminJs, /start-summary/);
});

test('admin-start.js and overview blocks exist', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/admin/index.html'), 'utf8');
  assert.match(html, /id="startGrowthBlock"/);
  assert.match(html, /admin-start\.js/);
  assert.match(html, /admin-produktanalys-shell\.js/);
  assert.match(html, /prenumerationWorkspaceTabs/);
  assert.match(html, /admin-deprecated-section/);
});
