'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { deriveMarketRegion, MARKET_REGIONS } = require('../src/lib/market-region');
const { resolveLegalRoutes } = require('../src/lib/legal-routing');
const { enablePublicBillingForTest, disablePublicBillingForTest } = require('./helpers/public-billing');

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

test('market_ie_open ON + billing OFF accepts IE during prebilling window', async (t) => {
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
    const { res, email, body } = await registerCountry(http.baseUrl, 'IE');
    assert.equal(res.status, 201, JSON.stringify(body));
    const fam = await pg.query(
      `SELECT f.id, f.country_code, f.is_lifetime_free, f.subscription_status
       FROM family f JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
      [email.toLowerCase()]
    );
    assert.equal(fam.rows[0].country_code, 'IE');
    assert.equal(fam.rows[0].is_lifetime_free, false);
    const { resolveFamilyEntitlements } = require('../src/lib/family-entitlements');
    const resolved = await resolveFamilyEntitlements(fam.rows[0].id);
    assert.equal(resolved.premium.source, 'prebilling');
    assert.equal(resolved.premium.is_grandfathered, false);
    assert.equal(resolved.premium.active, true);
  } finally {
    await setMarketFlag(pg, 'market_ie_open', false);
    await http.close();
    await db.cleanup();
  }
});

test('market_ie_open ON + billing OFF after payment_start rejects IE', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  const appSettings = require('../db/app-settings');
  await setMarketFlag(pg, 'market_ie_open', true);
  await setMarketFlag(pg, 'market_eu_open', false);
  await appSettings.upsertSetting('market_ie_payment_start_at', '2026-01-01T00:00:00+02:00');

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const { res, body } = await registerCountry(http.baseUrl, 'IE');
    assert.equal(res.status, 403, JSON.stringify(body));
    assert.equal(body.code, 'MARKET_BILLING_NOT_READY');
  } finally {
    await appSettings.upsertSetting('market_ie_payment_start_at', '2026-10-15T00:00:00+02:00');
    await setMarketFlag(pg, 'market_ie_open', false);
    await http.close();
    await db.cleanup();
  }
});

test('market_ie_open ON accepts IE registration when public billing is usable (C)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  await setMarketFlag(pg, 'market_ie_open', true);
  await setMarketFlag(pg, 'market_eu_open', false);
  const billingSnap = await enablePublicBillingForTest();

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
    await disablePublicBillingForTest(billingSnap);
    await http.close();
    await db.cleanup();
  }
});

test('market_eu_open OFF + market_ie_open ON still accepts IE when billing usable (D)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  await setMarketFlag(pg, 'market_ie_open', true);
  await setMarketFlag(pg, 'market_eu_open', false);
  const billingSnap = await enablePublicBillingForTest();

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const { res, text } = await registerCountry(http.baseUrl, 'IE');
    assert.equal(res.status, 201, text);
  } finally {
    await setMarketFlag(pg, 'market_ie_open', false);
    await disablePublicBillingForTest(billingSnap);
    await http.close();
    await db.cleanup();
  }
});

test('market_fi_open OFF denies FI registration', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  await setMarketFlag(pg, 'market_fi_open', false);
  await setMarketFlag(pg, 'market_eu_open', false);

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const { res, body } = await registerCountry(http.baseUrl, 'FI');
    assert.equal(res.status, 403, JSON.stringify(body));
    assert.equal(body.code, 'MARKET_FI_CLOSED');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('market_fi_open ON + billing OFF accepts FI during prebilling window', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  await setMarketFlag(pg, 'market_fi_open', true);
  await setMarketFlag(pg, 'market_eu_open', false);

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const { res, email, body } = await registerCountry(http.baseUrl, 'FI', { preferred_locale: 'sv-SE' });
    assert.equal(res.status, 201, JSON.stringify(body));
    const fam = await pg.query(
      `SELECT f.id, f.country_code, f.is_lifetime_free
       FROM family f JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
      [email.toLowerCase()]
    );
    assert.equal(fam.rows[0].country_code, 'FI');
    assert.equal(fam.rows[0].is_lifetime_free, false);
    const { resolveFamilyEntitlements } = require('../src/lib/family-entitlements');
    const resolved = await resolveFamilyEntitlements(fam.rows[0].id);
    assert.equal(resolved.premium.source, 'prebilling');
    assert.equal(resolved.premium.is_grandfathered, false);
  } finally {
    await setMarketFlag(pg, 'market_fi_open', false);
    await http.close();
    await db.cleanup();
  }
});

test('market_fi_open ON accepts FI Swedish registration with Europe/Helsinki when billing usable', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  await setMarketFlag(pg, 'market_fi_open', true);
  await setMarketFlag(pg, 'market_eu_open', false);
  const billingSnap = await enablePublicBillingForTest();

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const { res, email } = await registerCountry(http.baseUrl, 'FI', { preferred_locale: 'sv-SE' });
    assert.equal(res.status, 201, res.text);

    const fam = await pg.query(
      `SELECT country_code, timezone, preferred_locale FROM family f
       JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
      [email.toLowerCase()]
    );
    assert.equal(fam.rows[0].country_code, 'FI');
    assert.equal(fam.rows[0].timezone, 'Europe/Helsinki');
    assert.equal(fam.rows[0].preferred_locale, 'sv-SE');
  } finally {
    await setMarketFlag(pg, 'market_fi_open', false);
    await disablePublicBillingForTest(billingSnap);
    await http.close();
    await db.cleanup();
  }
});

test('market_eu_open OFF + market_fi_open ON still accepts FI when billing usable', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  await setMarketFlag(pg, 'market_fi_open', true);
  await setMarketFlag(pg, 'market_eu_open', false);
  const billingSnap = await enablePublicBillingForTest();

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const { res, text } = await registerCountry(http.baseUrl, 'FI', { preferred_locale: 'sv-SE' });
    assert.equal(res.status, 201, text);
  } finally {
    await setMarketFlag(pg, 'market_fi_open', false);
    await disablePublicBillingForTest(billingSnap);
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
  const billingSnap = await enablePublicBillingForTest();

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
    await disablePublicBillingForTest(billingSnap);
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
    assert.equal(typeof body.market_fi_open, 'boolean');
    assert.equal(typeof body.market_no_open, 'boolean');
    assert.equal(typeof body.market_dk_open, 'boolean');
    assert.equal(body.market_ie_open, false, 'market_ie_open must default OFF');
    assert.equal(body.market_fi_open, false, 'market_fi_open must default OFF');
    assert.equal(body.signup_allowed.IE, false);
    assert.equal(body.signup_allowed.FI, false);
    assert.equal(body.launch_state.IE, 'closed');
    assert.equal(body.launch_state.FI, 'closed');
    assert.equal(typeof body.public_billing_usable, 'boolean');
    assert.equal(typeof body.english_available, 'boolean');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('future IE open: limited child can load daily-log before purchase (no 402 deadlock)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  await setMarketFlag(pg, 'market_ie_open', true);
  await setMarketFlag(pg, 'market_eu_open', false);
  const appSettings = require('../db/app-settings');
  await appSettings.upsertSetting('market_ie_payment_start_at', '2026-01-01T00:00:00+02:00');
  const billingSnap = await enablePublicBillingForTest();

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const { res, email } = await registerCountry(http.baseUrl, 'IE');
    assert.equal(res.status, 201, res.text);

    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'testpass123' }),
    });
    const loginText = await loginRes.text();
    assert.equal(loginRes.status, 200, loginText);
    const loginBody = JSON.parse(loginText);
    let parentCookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      parentCookies = mergeCookies(parentCookies, [header]);
    }
    const parentHeaders = {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(parentCookies),
      'X-CSRF-Token': loginBody.csrfToken,
    };

    const blocked = await fetch(`${http.baseUrl}/api/children`, { headers: parentHeaders });
    assert.equal(blocked.status, 402, 'parent /api/children must stay premium-gated');

    const childRes = await fetch(`${http.baseUrl}/api/onboarding/child`, {
      method: 'POST',
      headers: parentHeaders,
      body: JSON.stringify({ name: 'Aoife', emoji: '🌟', birthday: '2018-05-01' }),
    });
    const childText = await childRes.text();
    assert.equal(childRes.status, 201, childText);
    const childBody = JSON.parse(childText);

    const childLoginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: childBody.username, pin: childBody.pin }),
    });
    const childLoginText = await childLoginRes.text();
    assert.equal(childLoginRes.status, 200, childLoginText);
    let childCookies = {};
    for (const header of getSetCookieHeaders(childLoginRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }

    const dailyRes = await fetch(`${http.baseUrl}/api/me/daily-log`, {
      headers: { Cookie: cookieHeader(childCookies) },
    });
    assert.equal(dailyRes.status, 200, await dailyRes.text());
  } finally {
    await setMarketFlag(pg, 'market_ie_open', false);
    await appSettings.upsertSetting('market_ie_payment_start_at', '2026-10-15T00:00:00+02:00');
    await disablePublicBillingForTest(billingSnap);
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
