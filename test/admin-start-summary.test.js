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
    if (q.includes('signups_7d') && q.includes('signups_prev_7d') && !q.includes('family_activation_state')) {
      return {
        rows: [{
          signups_7d: 8,
          signups_prev_7d: 5,
          signups_today: 2,
          total: 201,
        }],
      };
    }
    if (q.includes('stuck_families') || q.includes('stuck_total')) {
      return { rows: [{ stuck_total: 5, stuck_product: 4, stuck_qa: 1 }] };
    }
    if (q.includes('FROM contact_message cm') && q.includes('meddelanden_unread_count')) {
      return {
        rows: [{
          unread_count: 2,
          meddelanden_unread_count: 2,
          incidenter_open_count: 0,
          meddelanden_needs_follow_up_count: 3,
          needs_follow_up_count: 3,
          active_count: 1,
          answered_count: 0,
          archived_count: 0,
        }],
      };
    }
    if (q.includes('SELECT id, name, created_at') && q.includes('ORDER BY created_at DESC')) {
      return {
        rows: [{
          id: 'fam-1',
          name: 'Testfamilj',
          created_at: '2026-06-20T09:00:00Z',
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
    assert.equal(body.overview.signups7d, 8);
    assert.equal(body.overview.totalFamilies, 201);
    assert.equal(body.overview.signupsToday, 2);
    assert.equal(body.overview.stuckOnboarding, 4);
    assert.equal(body.overview.unreadMessages, 2);
    assert.equal(body.overview.messagesNeedFollowUp, 3);
    assert.equal(body.recentFamilies.length, 1);
    assert.equal(body.recentFamilies[0].name, 'Testfamilj');
    assert.equal(body.quickActions.length, 4);
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
  const fnStart = cmSrc.indexOf('async function getMessageCounts');
  const fnEnd = cmSrc.indexOf('async function', fnStart + 1);
  const fnBody = fnEnd > fnStart ? cmSrc.slice(fnStart, fnEnd) : cmSrc.slice(fnStart);
  assert.match(fnBody, /FROM contact_message cm/);
  assert.doesNotMatch(fnBody, /FROM contact_message\n/);
});

test('fetchKeyMetrics does not query Meta attribution', () => {
  const src = fs.readFileSync(path.join(__dirname, '../db/start-summary.js'), 'utf8');
  assert.doesNotMatch(src, /signup_attribution/);
  assert.doesNotMatch(src, /metaSignups/);
});

test('fetchRecommendations reads persisted alerts without live collectMetrics', () => {
  const src = fs.readFileSync(path.join(__dirname, '../db/start-summary.js'), 'utf8');
  const fnStart = src.indexOf('async function fetchRecommendations');
  const fnEnd = src.indexOf('async function fetchActivityFeed', fnStart);
  const fnBody = fnEnd > fnStart ? src.slice(fnStart, fnEnd) : src.slice(fnStart);
  assert.match(fnBody, /listActive\(5\)/);
  assert.doesNotMatch(fnBody, /buildRecommendations/);
  assert.doesNotMatch(fnBody, /collectMetrics/);
  assert.doesNotMatch(src, /UNION ALL SELECT id FROM professional_interest/);
});

test('fetchStartOverview uses family table only (no activation funnel join)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../db/start-summary.js'), 'utf8');
  const fnStart = src.indexOf('async function fetchStartOverview');
  const fnEnd = src.indexOf('async function newFamiliesMetric', fnStart);
  const fnBody = fnEnd > fnStart ? src.slice(fnStart, fnEnd) : src.slice(fnStart);
  assert.match(fnBody, /signups_prev_7d/);
  assert.doesNotMatch(fnBody, /family_activation_state/);
});

test('admin-start.js is a slim families overview', () => {
  const js = fs.readFileSync(path.join(__dirname, '../public/admin/admin-start.js'), 'utf8');
  assert.match(js, /Antal familjer/);
  assert.match(js, /Att göra/);
  assert.match(js, /Senaste familjer/);
  assert.doesNotMatch(js, /North Star/);
  assert.doesNotMatch(js, /loadJourneyDailyAnalysis/);
  assert.doesNotMatch(js, /Från Meta-annons/);
});

test('fetchKeyMetrics uses schema_saved_at only (no weekly_schedule fallback)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../db/start-summary.js'), 'utf8');
  assert.match(src, /schema_saved_at IS NOT NULL/);
  assert.doesNotMatch(src, /weekly_schedule/);
});

test('admin-start.js and overview blocks exist', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/admin/index.html'), 'utf8');
  assert.match(html, /id="startKpiBlock"/);
  assert.doesNotMatch(html, /id="startRecommendationsBlock"/);
  assert.doesNotMatch(html, /id="startMessagesBlock"/);
  assert.doesNotMatch(html, /id="startActivityBlock"/);
  assert.match(html, /journeyDailyAnalysisBlock/);
  assert.match(html, /admin-start\.js/);
  assert.match(html, /admin-produktanalys-shell\.js/);
  assert.match(html, /prenumerationWorkspaceTabs/);
  assert.match(html, /admin-deprecated-section/);
});
