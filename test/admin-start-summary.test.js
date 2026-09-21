'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');
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

  test('buildOpenMarketSignups includes only open gates and zero-fills missing countries', () => {
    const rows = startSummaryDb.buildOpenMarketSignups(
      [
        { key: 'market_se_open', enabled: true },
        { key: 'market_ie_open', enabled: true },
        { key: 'market_fi_open', enabled: false },
      ],
      [{ country_code: 'IE', total: 4, today: 2, last7d: 4 }]
    );
    assert.deepEqual(rows.map((r) => r.code), ['SE', 'IE']);
    assert.equal(rows[0].name, 'Sverige');
    assert.equal(rows[0].total, 0);
    assert.equal(rows[1].name, 'Irland');
    assert.equal(rows[1].total, 4);
    assert.equal(rows[1].today, 2);
  });

  test('buildOpenMarketSignups defaults Sweden open when flag row is missing', () => {
    const rows = startSummaryDb.buildOpenMarketSignups([], []);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].code, 'SE');
    assert.equal(rows[0].total, 0);
  });

  test('notFutureCreatedSql matches Senaste familjer future-date bound', () => {
    assert.equal(
      startSummaryDb.notFutureCreatedSql(),
      "created_at <= NOW() + INTERVAL '1 minute'"
    );
    assert.equal(
      startSummaryDb.notFutureCreatedSql('f'),
      "f.created_at <= NOW() + INTERVAL '1 minute'"
    );
  });
});

test('GET /api/admin/start-summary returns composed payload', async () => {
  const mock = injectMockDb();

  mock.setQuery(async (sql) => {
    const q = String(sql);
    if (q.includes("key LIKE 'market_%_open'") || q.includes('key LIKE \'market_%_open\'')) {
      return {
        rows: [
          { key: 'market_se_open', enabled: true },
          { key: 'market_ie_open', enabled: true },
          { key: 'market_fi_open', enabled: false },
        ],
      };
    }
    if (q.includes('COALESCE(country_code') && q.includes('GROUP BY')) {
      return {
        rows: [
          { country_code: 'SE', total: 180, today: 1, last7d: 5 },
          { country_code: 'IE', total: 3, today: 1, last7d: 3 },
        ],
      };
    }
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
    assert.equal(body.overview.openMarkets.length, 2);
    assert.equal(body.overview.openMarkets[0].code, 'SE');
    assert.equal(body.overview.openMarkets[0].name, 'Sverige');
    assert.equal(body.overview.openMarkets[0].total, 180);
    assert.equal(body.overview.openMarkets[1].code, 'IE');
    assert.equal(body.overview.openMarkets[1].total, 3);
    assert.equal(body.overview.openMarkets[1].today, 1);
    assert.equal(body.recentFamilies.length, 1);
    assert.equal(body.recentFamilies[0].name, 'Testfamilj');
    assert.equal(body.recentFamilies[0].createdAt, '2026-06-20T09:00:00.000Z');
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

test('fetchRecentFamilies serializes created_at as UTC ISO', () => {
  const src = fs.readFileSync(path.join(__dirname, '../db/start-summary.js'), 'utf8');
  const fnStart = src.indexOf('async function fetchRecentFamilies');
  const fnEnd = src.indexOf('async function fetchStartOverview', fnStart);
  const fnBody = src.slice(fnStart, fnEnd);
  assert.match(fnBody, /toIsoUtc\(row\.created_at\)/);
  assert.match(fnBody, /created_at <= NOW\(\) \+ INTERVAL '1 minute'/);
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
  assert.match(js, /Öppnade marknader/);
  assert.match(js, /openMarkets/);
  assert.match(js, /#familjer\?country=/);
  assert.match(js, /data-created-at/);
  assert.doesNotMatch(js, /North Star/);
  assert.doesNotMatch(js, /loadJourneyDailyAnalysis/);
  assert.doesNotMatch(js, /Från Meta-annons/);
});

test('fetchKeyMetrics uses schema_saved_at only (no weekly_schedule fallback)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../db/start-summary.js'), 'utf8');
  assert.match(src, /schema_saved_at IS NOT NULL/);
  assert.doesNotMatch(src, /weekly_schedule/);
});

test('signup windows exclude future-dated sandbox families', () => {
  const src = fs.readFileSync(path.join(__dirname, '../db/start-summary.js'), 'utf8');
  const openMarkets = src.slice(
    src.indexOf('async function fetchOpenMarketSignups'),
    src.indexOf('async function fetchStartOverview')
  );
  const overview = src.slice(
    src.indexOf('async function fetchStartOverview'),
    src.indexOf('async function newFamiliesMetric')
  );
  assert.match(src, /function notFutureCreatedSql/);
  assert.match(src, /created_at <= NOW\(\) \+ INTERVAL '1 minute'/);
  assert.match(openMarkets, /notFutureCreatedSql\(\)/);
  assert.match(overview, /notFutureCreatedSql\(\)/);
});

test('admin-start.js and overview blocks exist', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/admin/index.html'), 'utf8');
  assert.match(html, /id="startKpiBlock"/);
  assert.match(html, /admin-start\.js\?v=2\.3\.0/);
  assert.match(html, /id="familiesCountryFilterBanner"/);
  assert.doesNotMatch(html, /id="startRecommendationsBlock"/);
  assert.doesNotMatch(html, /id="startMessagesBlock"/);
  assert.doesNotMatch(html, /id="startActivityBlock"/);
  assert.match(html, /journeyDailyAnalysisBlock/);
  assert.match(html, /admin-relative-time\.js/);
  assert.match(html, /admin-start\.js/);
  assert.match(html, /admin-produktanalys-shell\.js/);
  assert.match(html, /prenumerationWorkspaceTabs/);
  assert.match(html, /admin-deprecated-section/);
});

test('parseFamiliesCountryFilter reads ISO country from Familjer hash', () => {
  const src = fs.readFileSync(path.join(__dirname, '../public/admin/admin-families.js'), 'utf8');
  const start = src.indexOf('function parseFamiliesCountryFilter');
  const end = src.indexOf('function familyCountryCode');
  assert.ok(start >= 0 && end > start);
  const sandbox = { window: { location: { hash: '#familjer' } }, URLSearchParams };
  vm.createContext(sandbox);
  vm.runInContext(src.slice(start, end), sandbox);
  assert.equal(vm.runInContext('parseFamiliesCountryFilter("#familjer?country=IE")', sandbox), 'IE');
  assert.equal(vm.runInContext('parseFamiliesCountryFilter("#familjer?country=ie")', sandbox), 'IE');
  assert.equal(vm.runInContext('parseFamiliesCountryFilter("#familjer")', sandbox), null);
  assert.equal(vm.runInContext('parseFamiliesCountryFilter("#familjer?country=IRL")', sandbox), null);
  assert.equal(vm.runInContext('parseFamiliesCountryFilter("#familjer?followup=1")', sandbox), null);
});

test('familyCountryCode defaults missing country to Sweden', () => {
  const src = fs.readFileSync(path.join(__dirname, '../public/admin/admin-families.js'), 'utf8');
  const start = src.indexOf('function familyCountryCode');
  const end = src.indexOf('function familyMatchesSearch');
  assert.ok(start >= 0 && end > start);
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(src.slice(start, end), sandbox);
  assert.equal(vm.runInContext('familyCountryCode({})', sandbox), 'SE');
  assert.equal(vm.runInContext('familyCountryCode({ country_code: "IE" })', sandbox), 'IE');
  assert.equal(vm.runInContext('familyCountryCode({ country_code: "ie" })', sandbox), 'IE');
});
