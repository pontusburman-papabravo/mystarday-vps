'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { deriveMarketRegion, MARKET_REGIONS } = require('../src/lib/market-region');
const { resolveLegalRoutes } = require('../src/lib/legal-routing');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function uniqueEmail(prefix = 'eea') {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}@example.com`;
}

async function setMarketFlag(pg, key, enabled) {
  await pg.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, $2, 'eea-launch-framework test')
     ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
    [key, enabled]
  );
}

async function registerCountry(baseUrl, countryCode, extra = {}) {
  const email = uniqueEmail(`ie-${countryCode.toLowerCase()}`);
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Parent',
      email,
      password: 'testpass123',
      country_code: countryCode,
      preferred_locale: 'en-GB',
      ...extra,
    }),
  });
  const text = await res.text();
  return { res, text, email, body: text ? JSON.parse(text) : null };
}

test('deriveMarketRegion(IE) is EU (A)', () => {
  assert.equal(deriveMarketRegion('IE'), MARKET_REGIONS.EU);
});

test('market_ie_open OFF denies IE registration (B)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  await setMarketFlag(pg, 'market_ie_open', false);
  await setMarketFlag(pg, 'market_eu_open', false);

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const { res, body } = await registerCountry(http.baseUrl, 'IE');
    assert.equal(res.status, 403, JSON.stringify(body));
    assert.equal(body.code, 'MARKET_IE_CLOSED');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('market_ie_open ON accepts IE registration (C)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  await setMarketFlag(pg, 'market_ie_open', true);
  await setMarketFlag(pg, 'market_eu_open', false);

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const { res, email } = await registerCountry(http.baseUrl, 'IE');
    assert.equal(res.status, 201, res.text);

    const fam = await pg.query(
      `SELECT country_code, timezone FROM family f
       JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
      [email.toLowerCase()]
    );
    assert.equal(fam.rows[0].country_code, 'IE');
    assert.equal(fam.rows[0].timezone, 'Europe/Dublin');
  } finally {
    await setMarketFlag(pg, 'market_ie_open', false);
    await http.close();
    await db.cleanup();
  }
});

test('market_eu_open OFF + market_ie_open ON still accepts IE (D)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  await setMarketFlag(pg, 'market_ie_open', true);
  await setMarketFlag(pg, 'market_eu_open', false);

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const { res, text } = await registerCountry(http.baseUrl, 'IE');
    assert.equal(res.status, 201, text);
  } finally {
    await setMarketFlag(pg, 'market_ie_open', false);
    await http.close();
    await db.cleanup();
  }
});

test('SE registration keeps Europe/Stockholm timezone (G)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const { res, text, email } = await registerCountry(http.baseUrl, 'SE', { preferred_locale: 'sv-SE' });
    assert.equal(res.status, 201, text);
    const fam = await pg.query(
      `SELECT timezone FROM family f
       JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
      [email.toLowerCase()]
    );
    assert.equal(fam.rows[0].timezone, 'Europe/Stockholm');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('IE child inherits Europe/Dublin from family (F)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  await setMarketFlag(pg, 'market_ie_open', true);

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const { res, text, email } = await registerCountry(http.baseUrl, 'IE');
    assert.equal(res.status, 201, text);

    const parent = await pg.query('SELECT id, family_id FROM parent WHERE email = $1', [email.toLowerCase()]);
    const parentId = parent.rows[0].id;
    const familyId = parent.rows[0].family_id;

    const { grantAdminPremium } = require('../src/lib/family-entitlements');
    await grantAdminPremium(familyId, {
      permanent: true,
      adminId: null,
      reason: 'eea-launch timezone test — IE is paywall cohort post grandfather scope fix',
    });

    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'testpass123' }),
    });
    const loginText = await loginRes.text();
    assert.equal(loginRes.status, 200, loginText);
    const loginBody = JSON.parse(loginText);
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    const childRes = await fetch(`${http.baseUrl}/api/onboarding/child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': loginBody.csrfToken,
      },
      body: JSON.stringify({ name: 'Aoife', emoji: '🌟', birthday: '2018-05-01' }),
    });
    assert.equal(childRes.status, 201, await childRes.text());

    const child = await pg.query(
      'SELECT timezone FROM child WHERE family_id = $1',
      [familyId]
    );
    assert.equal(child.rows[0].timezone, 'Europe/Dublin');
    assert.notEqual(child.rows[0].timezone, 'Europe/Stockholm');
    void parentId;
  } finally {
    await setMarketFlag(pg, 'market_ie_open', false);
    await http.close();
    await db.cleanup();
  }
});

test('IE en-GB legal routes point to English EEA set (H)', () => {
  const routes = resolveLegalRoutes({ countryCode: 'IE', marketRegion: 'EU', locale: 'en-GB' });
  assert.equal(routes.privacy, '/en/eea/privacy');
  assert.equal(routes.terms, '/en/eea/terms');
});

test('en-GB with SE country does not route to UK legal (I)', () => {
  const routes = resolveLegalRoutes({ countryCode: 'SE', marketRegion: 'EU', locale: 'en-GB' });
  assert.notEqual(routes.privacy, '/en/uk/privacy');
  assert.equal(routes.privacy, '/en/eea/privacy');
});

test('DELETE /api/family/delete-account removes family analytics_events (J)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const email = uniqueEmail('del-analytics');
    const password = 'testpass123';
    const reg = await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Delete Me',
        email,
        password,
        country_code: 'SE',
      }),
    });
    assert.equal(reg.status, 201, await reg.text());

    const fam = await pg.query(
      'SELECT f.id AS family_id FROM family f JOIN parent p ON p.family_id = f.id WHERE p.email = $1',
      [email.toLowerCase()]
    );
    const familyId = fam.rows[0].family_id;

    await pg.query(
      `INSERT INTO analytics_events (family_id, event_type, metadata)
       VALUES ($1, 'registration', '{"country_code":"SE"}'::jsonb)`,
      [familyId]
    );

    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const loginBody = JSON.parse(await loginRes.text());
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    const delRes = await fetch(`${http.baseUrl}/api/family/delete-account`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': loginBody.csrfToken,
      },
    });
    assert.equal(delRes.status, 200, await delRes.text());

    const remaining = await pg.query(
      'SELECT 1 FROM analytics_events WHERE family_id = $1',
      [familyId]
    );
    assert.equal(remaining.rows.length, 0);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('registration-gates API exposes market_ie_open', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const res = await fetch(`${http.baseUrl}/api/market/registration-gates`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.market_ie_open, 'boolean');
    assert.equal(typeof body.market_no_open, 'boolean');
    assert.equal(typeof body.market_dk_open, 'boolean');
    assert.equal(body.market_ie_open, false, 'market_ie_open must default OFF');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('GET /api/market/config IE without locale keeps defaultLocale en-GB (pre-auth locale sv-SE)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const res = await fetch(`${http.baseUrl}/api/market/config?country_code=IE`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.countryCode, 'IE');
    assert.equal(body.defaultLocale, 'en-GB');
    assert.equal(body.locale, 'sv-SE');
    assert.equal(body.localeSupported, true);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
