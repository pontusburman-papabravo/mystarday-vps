'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const {
  MARKET,
  LANDING_EVENT,
  STORE_EVENT,
  UTM_DIRECT,
  PERIOD_KEYS,
  buildIrelandFunnelWindows,
  windowsOverlap,
  storeCtrPct,
  normalizeUtmValue,
  buildSignals,
} = require('../src/lib/ireland-funnel-health');
const { verifyStaticBearerToken } = require('../src/lib/static-bearer-auth');

const ROOT = path.join(__dirname, '..');
const MONITOR_TOKEN = 'ireland-funnel-monitor-test-token-32ch';
const ENDPOINT = '/api/ops/ireland-funnel-health';
const FORBIDDEN_KEYS = /session_id|family_id|email|password|parent|child_name|authorization|token|user_id|name/i;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function collectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
    return keys;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

function assertCtrAtMost100(block, label) {
  const ctr = block.store_ctr_pct;
  assert.ok(ctr === null || ctr <= 100, `${label} CTR exceeded 100: ${ctr}`);
  assert.ok(
    toIntSafe(block.converted_store_sessions) <= toIntSafe(block.landing_sessions),
    `${label} converted_store_sessions exceeds landing_sessions`
  );
}

function toIntSafe(value) {
  const n = Number(value) || 0;
  return n;
}

function assertPeriodFunnelShape(period, label) {
  assertCtrAtMost100(period, label);
  for (const source of period.sources || []) {
    assertCtrAtMost100(source, `${label} source ${source.utm_source}`);
  }
}

function assertNoSensitiveKeys(payload) {
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  for (const key of collectKeys(payload)) {
    assert.doesNotMatch(key, FORBIDDEN_KEYS, `unexpected sensitive key: ${key}`);
  }
}

async function insertEvent(db, {
  familyId = crypto.randomUUID(),
  eventType,
  market = 'IE',
  platform,
  utm = {},
  createdAt,
}) {
  const metadata = { market };
  if (platform) metadata.platform = platform;
  if (utm.source) metadata.utm_source = utm.source;
  if (utm.medium) metadata.utm_medium = utm.medium;
  if (utm.campaign) metadata.utm_campaign = utm.campaign;
  await db.query(
    `INSERT INTO analytics_events (family_id, event_type, metadata, created_at)
     VALUES ($1, $2, $3::jsonb, $4)`,
    [familyId, eventType, JSON.stringify(metadata), createdAt]
  );
  return familyId;
}

describe('Ireland funnel health — unit', () => {
  it('24h and 7d comparison windows do not overlap', () => {
    const now = new Date('2026-09-27T06:00:00.000Z');
    const windows = buildIrelandFunnelWindows(now);
    assert.equal(windows.current_24h.to.toISOString(), now.toISOString());
    assert.equal(windows.previous_24h.to.toISOString(), windows.current_24h.from.toISOString());
    assert.equal(windows.previous_7d.to.toISOString(), windows.current_7d.from.toISOString());
    assert.equal(windowsOverlap(windows.current_24h, windows.previous_24h), false);
    assert.equal(windowsOverlap(windows.current_7d, windows.previous_7d), false);
  });

  it('CTR is converted/landing and is null when landing_sessions = 0', () => {
    assert.equal(storeCtrPct(1, 0), null);
    assert.equal(storeCtrPct(0, 0), null);
    assert.equal(storeCtrPct(3, 10), 30);
    assert.equal(storeCtrPct(2, 2), 100);
    assert.equal(storeCtrPct(0, 5), 0);
    assert.doesNotMatch(read('src/lib/ireland-funnel-health.js'), /Math\.min\s*\(\s*100/);
  });

  it('normalizes missing UTM to (direct) without writing DB values', () => {
    assert.equal(normalizeUtmValue(null), UTM_DIRECT);
    assert.equal(normalizeUtmValue('  '), UTM_DIRECT);
    assert.equal(normalizeUtmValue('facebook'), 'facebook');
  });

  it('signals are descriptive flags only', () => {
    assert.deepEqual(buildSignals({
      landing_sessions: 0,
      store_click_sessions: 0,
      landing_events: 0,
      store_click_events: 0,
      orphan_store_click_sessions: 0,
    }), {
      has_traffic: false,
      has_store_clicks: false,
      measurement_alive: false,
      has_orphan_store_clicks: false,
    });
    assert.deepEqual(buildSignals({
      landing_sessions: 2,
      store_click_sessions: 1,
      landing_events: 3,
      store_click_events: 1,
      orphan_store_click_sessions: 2,
    }), {
      has_traffic: true,
      has_store_clicks: true,
      measurement_alive: true,
      has_orphan_store_clicks: true,
    });
  });

  it('requires a configured bearer token and rejects wrong tokens', () => {
    assert.deepEqual(verifyStaticBearerToken(undefined, ''), {
      configured: false,
      authorized: false,
    });
    assert.deepEqual(verifyStaticBearerToken(`Bearer ${MONITOR_TOKEN}`, MONITOR_TOKEN), {
      configured: true,
      authorized: true,
    });
    assert.deepEqual(verifyStaticBearerToken('Bearer wrong-token-value-32chars!!', MONITOR_TOKEN), {
      configured: true,
      authorized: false,
    });
    assert.deepEqual(verifyStaticBearerToken(MONITOR_TOKEN, MONITOR_TOKEN), {
      configured: true,
      authorized: false,
    });
  });

  it('SQL uses parameterized windows and hardcoded IE event types', () => {
    const sql = read('db/ireland-funnel-health.js');
    assert.match(sql, /metadata->>'market' = '\$\{MARKET\}'/);
    assert.match(sql, /event_type IN \('\$\{LANDING_EVENT\}', '\$\{STORE_EVENT\}'\)/);
    assert.match(sql, /has_landing AND has_store/);
    assert.match(sql, /has_store AND NOT has_landing/);
    assert.doesNotMatch(sql, /req\.(query|body|params)/);
    assert.doesNotMatch(sql, /INSERT |UPDATE |DELETE |JOIN family|JOIN parent|JOIN child/i);
    assert.equal(MARKET, 'IE');
    assert.equal(LANDING_EVENT, 'landing_view');
    assert.equal(STORE_EVENT, 'store_cta_clicked');
  });

  it('admin analytics funnel helpers are unchanged', () => {
    const admin = read('src/routes/admin/analytics.js');
    const dbAnalytics = read('db/analytics.js');
    assert.match(admin, /router\.get\('\/analytics\/funnel'/);
    assert.match(dbAnalytics, /funnel_landing_visit/);
    assert.match(dbAnalytics, /function getFunnelCounts/);
    assert.doesNotMatch(admin, /ireland-funnel-health/);
  });

  it('ops route is GET-only and does not accept event_type from the client', () => {
    const route = read('src/routes/ops.js');
    assert.match(route, /router\.get\('\/ireland-funnel-health'/);
    assert.doesNotMatch(route, /router\.(post|put|patch|delete)/);
    assert.doesNotMatch(route, /req\.query/);
    assert.doesNotMatch(route, /event_type.*req/);
  });
});

describe('Ireland funnel health — HTTP auth', () => {
  async function withApp(fn, { token = MONITOR_TOKEN } = {}) {
    const db = await setupTestDb();
    if (db.skip) return { skipped: true, db };
    const previous = process.env.IRELAND_FUNNEL_MONITOR_TOKEN;
    process.env.IRELAND_FUNNEL_MONITOR_TOKEN = token;
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await fn(http, db);
      return { skipped: false, db };
    } finally {
      await http.close();
      if (previous === undefined) delete process.env.IRELAND_FUNNEL_MONITOR_TOKEN;
      else process.env.IRELAND_FUNNEL_MONITOR_TOKEN = previous;
      await db.cleanup();
    }
  }

  it('rejects missing bearer token', async () => {
    const result = await withApp(async (http) => {
      const res = await fetch(`${http.baseUrl}${ENDPOINT}`);
      assert.equal(res.status, 401);
    });
    if (result.skipped) return;
  });

  it('rejects the wrong bearer token', async () => {
    const result = await withApp(async (http) => {
      const res = await fetch(`${http.baseUrl}${ENDPOINT}`, {
        headers: { Authorization: 'Bearer definitely-not-the-monitor-token' },
      });
      assert.equal(res.status, 401);
    });
    if (result.skipped) return;
  });

  it('does not log the bearer token', async () => {
    const lines = [];
    const warn = console.warn;
    const error = console.error;
    console.warn = (...args) => { lines.push(args.join(' ')); };
    console.error = (...args) => { lines.push(args.join(' ')); };
    try {
      const result = await withApp(async (http) => {
        await fetch(`${http.baseUrl}${ENDPOINT}`, {
          headers: { Authorization: `Bearer ${MONITOR_TOKEN}-forged` },
        });
      });
      if (result.skipped) return;
    } finally {
      console.warn = warn;
      console.error = error;
    }
    const joined = lines.join('\n');
    assert.doesNotMatch(joined, new RegExp(MONITOR_TOKEN));
    assert.doesNotMatch(joined, /Authorization: Bearer/i);
    assert.match(joined, /unauthorized/);
  });

  it('allows the correct bearer token without cookies', async () => {
    const result = await withApp(async (http) => {
      const res = await fetch(`${http.baseUrl}${ENDPOINT}`, {
        headers: { Authorization: `Bearer ${MONITOR_TOKEN}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.ok, true);
      assert.equal(body.market, 'IE');
      for (const key of PERIOD_KEYS) {
        assert.ok(body[key]);
        assert.equal(body[key].store_ctr_pct, null);
        assert.equal(body[key].converted_store_sessions, 0);
        assert.equal(body[key].orphan_store_click_sessions, 0);
        assert.deepEqual(body[key].platforms, { ios: 0, android: 0, unknown: 0 });
      }
      assert.deepEqual(body.signals, {
        has_traffic: false,
        has_store_clicks: false,
        measurement_alive: false,
        has_orphan_store_clicks: false,
      });
      assertNoSensitiveKeys(body);
    });
    if (result.skipped) return;
  });

  it('is read-only and ignores query-string event filters', async () => {
    const result = await withApp(async (http) => {
      const auth = { Authorization: `Bearer ${MONITOR_TOKEN}` };
      const post = await fetch(`${http.baseUrl}${ENDPOINT}`, { method: 'POST', headers: auth });
      assert.ok(![200, 201, 204].includes(post.status), `POST should not succeed, got ${post.status}`);
      const put = await fetch(`${http.baseUrl}${ENDPOINT}`, { method: 'PUT', headers: auth });
      assert.ok(![200, 201, 204].includes(put.status), `PUT should not succeed, got ${put.status}`);
      const filtered = await fetch(
        `${http.baseUrl}${ENDPOINT}?event_type=funnel_landing_visit&market=SE&session_id=leak`,
        { headers: auth }
      );
      assert.equal(filtered.status, 200);
      const body = await filtered.json();
      assert.equal(body.market, 'IE');
      assert.equal(body.current_24h.landing_events, 0);
    });
    if (result.skipped) return;
  });

  it('does not open admin analytics without an admin session', async () => {
    const result = await withApp(async (http) => {
      const res = await fetch(`${http.baseUrl}/api/admin/analytics/funnel`, {
        headers: { Authorization: `Bearer ${MONITOR_TOKEN}` },
      });
      assert.equal(res.status, 401);
    });
    if (result.skipped) return;
  });
});

describe('Ireland funnel health — aggregation', () => {
  it('counts only IE landing_view / store_cta_clicked with unique sessions and platform/UTM splits', async () => {
    const db = await setupTestDb();
    if (db.skip) return;
    const { getIrelandFunnelHealth } = require('../db/ireland-funnel-health');
    const now = new Date('2026-09-27T12:00:00.000Z');
    const windows = buildIrelandFunnelWindows(now);
    const sessionA = crypto.randomUUID();
    const sessionB = crypto.randomUUID();
    const sessionC = crypto.randomUUID();
    const clickOnly = crypto.randomUUID();

    try {
      await insertEvent(db, {
        familyId: sessionA,
        eventType: 'landing_view',
        utm: { source: 'facebook', medium: 'paid_social', campaign: 'ireland-launch' },
        createdAt: new Date(windows.current_24h.from.getTime() + 60_000),
      });
      await insertEvent(db, {
        familyId: sessionA,
        eventType: 'landing_view',
        utm: { source: 'facebook', medium: 'paid_social', campaign: 'ireland-launch' },
        createdAt: new Date(windows.current_24h.from.getTime() + 120_000),
      });
      await insertEvent(db, {
        familyId: sessionA,
        eventType: 'store_cta_clicked',
        platform: 'ios',
        utm: { source: 'facebook', medium: 'paid_social', campaign: 'ireland-launch' },
        createdAt: new Date(windows.current_24h.from.getTime() + 180_000),
      });
      await insertEvent(db, {
        familyId: sessionB,
        eventType: 'landing_view',
        createdAt: new Date(windows.current_24h.from.getTime() + 240_000),
      });
      await insertEvent(db, {
        familyId: sessionB,
        eventType: 'store_cta_clicked',
        platform: 'android',
        createdAt: new Date(windows.current_24h.from.getTime() + 300_000),
      });
      await insertEvent(db, {
        familyId: sessionC,
        eventType: 'store_cta_clicked',
        platform: 'tablet',
        createdAt: new Date(windows.current_24h.from.getTime() + 360_000),
      });
      await insertEvent(db, {
        familyId: clickOnly,
        eventType: 'landing_view',
        market: 'SE',
        createdAt: new Date(windows.current_24h.from.getTime() + 90_000),
      });
      await insertEvent(db, {
        eventType: 'app_store_click',
        platform: 'ios',
        createdAt: new Date(windows.current_24h.from.getTime() + 100_000),
      });
      await insertEvent(db, {
        eventType: 'landing_view',
        createdAt: new Date(windows.previous_24h.from.getTime() + 60_000),
      });
      await insertEvent(db, {
        eventType: 'landing_view',
        createdAt: new Date(windows.previous_7d.from.getTime() + 60_000),
      });
      await insertEvent(db, {
        eventType: 'landing_view',
        createdAt: new Date(windows.current_24h.from.getTime() - 1_000),
      });

      const payload = await getIrelandFunnelHealth({ now });
      assert.equal(payload.market, 'IE');
      assert.equal(payload.current_24h.landing_events, 3);
      assert.equal(payload.current_24h.landing_sessions, 2);
      assert.equal(payload.current_24h.store_click_events, 3);
      assert.equal(payload.current_24h.store_click_sessions, 3);
      assert.equal(payload.current_24h.converted_store_sessions, 2);
      assert.equal(payload.current_24h.orphan_store_click_sessions, 1);
      assert.equal(payload.current_24h.store_ctr_pct, 100);
      assert.deepEqual(payload.current_24h.platforms, { ios: 1, android: 1, unknown: 1 });
      assert.equal(payload.signals.has_traffic, true);
      assert.equal(payload.signals.has_store_clicks, true);
      assert.equal(payload.signals.measurement_alive, true);
      assert.equal(payload.signals.has_orphan_store_clicks, true);
      assertPeriodFunnelShape(payload.current_24h, 'current_24h');

      const facebook = payload.current_24h.sources.find((row) => row.utm_source === 'facebook');
      assert.ok(facebook);
      assert.equal(facebook.utm_medium, 'paid_social');
      assert.equal(facebook.utm_campaign, 'ireland-launch');
      assert.equal(facebook.landing_sessions, 1);
      assert.equal(facebook.store_click_sessions, 1);
      assert.equal(facebook.converted_store_sessions, 1);
      assert.equal(facebook.orphan_store_click_sessions, 0);
      assert.equal(facebook.store_ctr_pct, 100);

      const direct = payload.current_24h.sources.find((row) => row.utm_source === UTM_DIRECT);
      assert.ok(direct);
      assert.equal(direct.landing_sessions, 1);
      assert.equal(direct.store_click_sessions, 2);
      assert.equal(direct.converted_store_sessions, 1);
      assert.equal(direct.orphan_store_click_sessions, 1);
      assert.equal(direct.store_ctr_pct, 100);

      assert.equal(payload.previous_24h.landing_sessions, 2);
      assert.equal(payload.previous_24h.store_click_sessions, 0);
      assert.equal(payload.previous_24h.converted_store_sessions, 0);
      assert.equal(payload.previous_24h.orphan_store_click_sessions, 0);
      assert.equal(payload.previous_24h.store_ctr_pct, 0);
      assert.equal(payload.previous_7d.landing_sessions, 1);
      assert.ok(payload.current_7d.landing_sessions >= payload.current_24h.landing_sessions);
      assert.equal(windowsOverlap(windows.current_24h, windows.previous_24h), false);
      assert.equal(windowsOverlap(windows.current_7d, windows.previous_7d), false);
      for (const key of PERIOD_KEYS) {
        assertPeriodFunnelShape(payload[key], key);
      }
      assertNoSensitiveKeys(payload);
    } finally {
      await db.cleanup();
    }
  });

  it('returns null CTR when a period has store clicks but no landing sessions', async () => {
    const db = await setupTestDb();
    if (db.skip) return;
    const { getIrelandFunnelHealth } = require('../db/ireland-funnel-health');
    const now = new Date('2026-09-27T12:00:00.000Z');
    const windows = buildIrelandFunnelWindows(now);
    try {
      await insertEvent(db, {
        eventType: 'store_cta_clicked',
        platform: 'ios',
        createdAt: new Date(windows.current_24h.from.getTime() + 60_000),
      });
      const payload = await getIrelandFunnelHealth({ now });
      assert.equal(payload.current_24h.landing_sessions, 0);
      assert.equal(payload.current_24h.store_click_sessions, 1);
      assert.equal(payload.current_24h.converted_store_sessions, 0);
      assert.equal(payload.current_24h.orphan_store_click_sessions, 1);
      assert.equal(payload.current_24h.store_ctr_pct, null);
      assert.equal(payload.signals.has_traffic, false);
      assert.equal(payload.signals.has_store_clicks, true);
      assert.equal(payload.signals.measurement_alive, true);
      assert.equal(payload.signals.has_orphan_store_clicks, true);
      assertPeriodFunnelShape(payload.current_24h, 'orphan-only');
    } finally {
      await db.cleanup();
    }
  });

  it('counts 10 landings, 3 matched clicks, and 2 click-only as 30% CTR', async () => {
    const db = await setupTestDb();
    if (db.skip) return;
    const { getIrelandFunnelHealth } = require('../db/ireland-funnel-health');
    const now = new Date('2026-09-27T12:00:00.000Z');
    const windows = buildIrelandFunnelWindows(now);
    const t = windows.current_24h.from.getTime();
    try {
      for (let i = 0; i < 10; i += 1) {
        const sessionId = crypto.randomUUID();
        await insertEvent(db, {
          familyId: sessionId,
          eventType: 'landing_view',
          createdAt: new Date(t + (i + 1) * 60_000),
        });
        if (i < 3) {
          await insertEvent(db, {
            familyId: sessionId,
            eventType: 'store_cta_clicked',
            platform: 'ios',
            createdAt: new Date(t + (i + 1) * 60_000 + 1_000),
          });
        }
      }
      for (let i = 0; i < 2; i += 1) {
        await insertEvent(db, {
          eventType: 'store_cta_clicked',
          platform: 'android',
          createdAt: new Date(t + 800_000 + i * 1_000),
        });
      }
      const payload = await getIrelandFunnelHealth({ now });
      assert.equal(payload.current_24h.landing_sessions, 10);
      assert.equal(payload.current_24h.store_click_sessions, 5);
      assert.equal(payload.current_24h.converted_store_sessions, 3);
      assert.equal(payload.current_24h.orphan_store_click_sessions, 2);
      assert.equal(payload.current_24h.store_ctr_pct, 30);
      assertPeriodFunnelShape(payload.current_24h, '10-3-2');
    } finally {
      await db.cleanup();
    }
  });

  it('attributes a conversion to the landing UTM, not a mismatched store UTM', async () => {
    const db = await setupTestDb();
    if (db.skip) return;
    const { getIrelandFunnelHealth } = require('../db/ireland-funnel-health');
    const now = new Date('2026-09-27T12:00:00.000Z');
    const windows = buildIrelandFunnelWindows(now);
    const sessionId = crypto.randomUUID();
    try {
      await insertEvent(db, {
        familyId: sessionId,
        eventType: 'landing_view',
        utm: { source: 'facebook', medium: 'paid_social', campaign: 'ireland-launch' },
        createdAt: new Date(windows.current_24h.from.getTime() + 60_000),
      });
      await insertEvent(db, {
        familyId: sessionId,
        eventType: 'store_cta_clicked',
        platform: 'ios',
        utm: { source: 'google', medium: 'cpc', campaign: 'other' },
        createdAt: new Date(windows.current_24h.from.getTime() + 120_000),
      });
      const payload = await getIrelandFunnelHealth({ now });
      assert.equal(payload.current_24h.converted_store_sessions, 1);
      assert.equal(payload.current_24h.store_ctr_pct, 100);
      const facebook = payload.current_24h.sources.find((row) => row.utm_source === 'facebook');
      const google = payload.current_24h.sources.find((row) => row.utm_source === 'google');
      assert.ok(facebook);
      assert.equal(facebook.landing_sessions, 1);
      assert.equal(facebook.store_click_sessions, 1);
      assert.equal(facebook.converted_store_sessions, 1);
      assert.equal(facebook.store_ctr_pct, 100);
      assert.equal(google, undefined);
      assertPeriodFunnelShape(payload.current_24h, 'landing-utm-canonical');
    } finally {
      await db.cleanup();
    }
  });
});
