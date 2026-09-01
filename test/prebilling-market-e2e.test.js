'use strict';

/**
 * Phase 3 — isolated IE/FI prebilling product E2E + Sweden regression.
 *
 * Live market flags stay closed. Open markets only inside TEST_DATABASE_URL.
 * Public billing stays OFF on the happy paths.
 */

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { enablePublicBillingForTest, disablePublicBillingForTest } = require('./helpers/public-billing');
const { resolveLegalRoutes } = require('../src/lib/legal-routing');
const { getMarketConfig } = require('../src/lib/market-config');
const {
  normalizeLocale,
  parseAcceptLanguage,
  resolvePreAuthLocale,
  SUPPORTED_LOCALES,
} = require('../src/lib/locale');
const { getDayOfWeek } = require('../src/lib/schedule-date-utils');
const {
  isChildLimitedAccountPath,
  CHILD_LIMITED_ACCOUNT_ALLOWED_PREFIXES,
} = require('../src/middleware/require-premium');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const PASSWORD = 'testpass123';
const IE_FI_START = '2026-10-15T00:00:00+02:00';

const CHILD_DENIED_ME_PATHS = [
  '/api/me/rewards',
  '/api/me/goal',
  '/api/me/manual-stars',
  '/api/me/garden',
  '/api/me/garden/slots',
  '/api/me/morgonhus',
  '/api/me/memory-hall',
  '/api/me/family',
  '/api/me/universe',
  '/api/me/journey-context',
  '/api/me/platform-feedback',
  '/api/me/transition-support',
  '/api/me/activation-program',
  '/api/me/profile-photo',
];

const CHILD_ROLE_DENIED_PATHS = [
  '/api/account/export-data',
  '/api/admin/families',
  '/api/iap/sync',
  '/api/iap/config',
  '/api/messages',
  '/api/messages/unread',
  '/api/family/delete-account',
  '/api/children',
];

function uniqueEmail(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}@example.com`;
}

function localDateStr(timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function reloadRuntimeModules() {
  for (const mod of [
    '../src/lib/db',
    '../db/app-settings',
    '../src/lib/billing-ui',
    '../src/lib/iap-paid-rollout',
    '../src/lib/market-region',
    '../src/lib/market-launch-invariants',
    '../src/lib/registration-market-context',
    '../db/family-entitlements',
    '../src/lib/payment-settings',
    '../src/lib/payment-audit',
    '../src/lib/family-entitlements',
    '../src/routes/auth/register',
    '../src/routes/market',
    '../src/routes/family',
    '../src/middleware/require-premium',
    '../app',
  ]) {
    try {
      delete require.cache[require.resolve(mod)];
    } catch {
      // optional
    }
  }
}

async function setMarketFlag(pg, key, enabled) {
  await pg.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, $2, 'prebilling-market-e2e')
     ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
    [key, enabled]
  );
}

async function resetLaunchFlags(pg, appSettings) {
  await setMarketFlag(pg, 'market_ie_open', false);
  await setMarketFlag(pg, 'market_fi_open', false);
  await setMarketFlag(pg, 'market_eu_open', false);
  await appSettings.upsertSetting('market_ie_payment_start_at', IE_FI_START);
  await appSettings.upsertSetting('market_fi_payment_start_at', IE_FI_START);
}

function jsonHeaders(session) {
  return {
    'Content-Type': 'application/json',
    Cookie: cookieHeader(session.cookies),
    ...(session.csrfToken ? { 'X-CSRF-Token': session.csrfToken } : {}),
  };
}

async function parseJson(res) {
  const text = await res.text();
  return { status: res.status, text, body: text ? JSON.parse(text) : null };
}

async function registerCountry(baseUrl, { countryCode, locale, name = 'E2E Parent' }) {
  const email = uniqueEmail(`e2e-${countryCode.toLowerCase()}`);
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      password: PASSWORD,
      country_code: countryCode,
      preferred_locale: locale,
    }),
  });
  return { ...(await parseJson(res)), email };
}

async function loginParent(baseUrl, email) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const parsed = await parseJson(res);
  let cookies = {};
  for (const header of getSetCookieHeaders(res)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { ...parsed, cookies, csrfToken: parsed.body?.csrfToken };
}

async function logout(baseUrl, session) {
  return parseJson(await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: jsonHeaders(session),
  }));
}

async function seedTodaySchedule(pg, { familyId, childId, timezone, activityName }) {
  const act = await pg.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
     VALUES ($1, $2, '⭐', 1, 0, 'user') RETURNING id`,
    [familyId, activityName]
  );
  const dateStr = localDateStr(timezone);
  const dow = getDayOfWeek(dateStr, timezone);
  const sched = await pg.query(
    `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order)
     VALUES ($1, $2::smallint, $3::integer) RETURNING id`,
    [childId, dow, dow]
  );
  await pg.query(
    `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
     VALUES ($1, $2, 0, 'morgon')`,
    [sched.rows[0].id, act.rows[0].id]
  );
  return { activityId: act.rows[0].id, dateStr };
}

async function ensureDailyLogItem(pg, { childId, timezone, activityName }) {
  const dateStr = localDateStr(timezone);
  let log = await pg.query(
    'SELECT id FROM daily_log WHERE child_id = $1 AND date = $2::date',
    [childId, dateStr]
  );
  if (!log.rows[0]) {
    log = await pg.query(
      'INSERT INTO daily_log (child_id, date) VALUES ($1, $2::date) RETURNING id',
      [childId, dateStr]
    );
  }
  const existing = await pg.query(
    'SELECT id FROM daily_log_item WHERE daily_log_id = $1 ORDER BY sort_order LIMIT 1',
    [log.rows[0].id]
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const inserted = await pg.query(
    `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
     VALUES ($1, $2, 'morgon', 0, 1, false) RETURNING id`,
    [log.rows[0].id, activityName]
  );
  return inserted.rows[0].id;
}

async function runAcceptancePath(t, {
  countryCode,
  locale,
  timezone,
  currency,
  accessKind,
  isLifetimeFree,
  childName,
  activityName,
}) {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return { skipped: true };
  }

  reloadRuntimeModules();
  const pg = require('../src/lib/db');
  const appSettings = require('../db/app-settings');
  const { createApp } = require('../app');

  if (countryCode === 'IE') await setMarketFlag(pg, 'market_ie_open', true);
  if (countryCode === 'FI') await setMarketFlag(pg, 'market_fi_open', true);
  await setMarketFlag(pg, 'market_eu_open', false);
  await appSettings.upsertSetting('market_ie_payment_start_at', IE_FI_START);
  await appSettings.upsertSetting('market_fi_payment_start_at', IE_FI_START);
  await appSettings.setPaymentEnabled(false);

  const http = await listenApp(createApp);
  const result = {
    registerStatus: null,
    accessKind: null,
    no402: true,
    firstStar: false,
    settingsOk: false,
    reloginOk: false,
    deleteAccess: false,
  };

  try {
    const gates = await parseJson(await fetch(`${http.baseUrl}/api/market/registration-gates`));
    assert.equal(gates.status, 200);
    assert.equal(gates.body.signup_allowed[countryCode], true);
    assert.equal(gates.body.public_billing_usable, false);

    const market = await parseJson(await fetch(
      `${http.baseUrl}/api/market/config?country_code=${countryCode}&locale=${encodeURIComponent(locale)}`
    ));
    assert.equal(market.status, 200);
    assert.equal(market.body.timezone, timezone);
    assert.equal(market.body.currency, currency);
    assert.equal(market.body.defaultLocale, locale);

    const legal = resolveLegalRoutes({
      countryCode,
      marketRegion: 'EU',
      locale,
    });
    assert.equal(legal.status, 'live');

    const reg = await registerCountry(http.baseUrl, { countryCode, locale });
    result.registerStatus = reg.status;
    assert.equal(reg.status, 201, reg.text);
    assert.notEqual(reg.status, 402);

    const parentRow = await pg.query(
      `SELECT p.id, p.family_id, f.country_code, f.preferred_locale, f.timezone,
              f.is_lifetime_free
         FROM parent p JOIN family f ON f.id = p.family_id
        WHERE p.email = $1`,
      [reg.email.toLowerCase()]
    );
    const family = parentRow.rows[0];
    assert.equal(family.country_code, countryCode);
    assert.equal(family.preferred_locale, locale);
    assert.equal(family.timezone, timezone);
    assert.equal(family.is_lifetime_free, isLifetimeFree);

    let parent = await loginParent(http.baseUrl, reg.email);
    assert.equal(parent.status, 200, parent.text);

    const sub = await parseJson(await fetch(`${http.baseUrl}/api/subscription/status`, {
      headers: jsonHeaders(parent),
    }));
    assert.equal(sub.status, 200, sub.text);
    assert.equal(sub.body.premium?.active, true);
    assert.equal(sub.body.access_kind, accessKind);
    assert.equal(sub.body.requires_paywall, false);
    result.accessKind = sub.body.access_kind;

    const childRes = await parseJson(await fetch(`${http.baseUrl}/api/onboarding/child`, {
      method: 'POST',
      headers: jsonHeaders(parent),
      body: JSON.stringify({ name: childName, emoji: '🌟', birthday: '2018-05-01' }),
    }));
    assert.equal(childRes.status, 201, childRes.text);
    assert.notEqual(childRes.status, 402);
    const childId = childRes.body.id;
    const username = childRes.body.username;
    const pin = childRes.body.pin;

    const childTz = await pg.query('SELECT timezone FROM child WHERE id = $1', [childId]);
    assert.equal(childTz.rows[0].timezone, timezone);

    await seedTodaySchedule(pg, {
      familyId: family.family_id,
      childId,
      timezone,
      activityName,
    });

    const childLoginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin }),
    });
    const childLoginText = await childLoginRes.text();
    assert.equal(childLoginRes.status, 200, childLoginText);
    let childCookies = {};
    for (const header of getSetCookieHeaders(childLoginRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }
    const childLoginBody = childLoginText ? JSON.parse(childLoginText) : null;
    const childSession = { cookies: childCookies, csrfToken: childLoginBody?.csrfToken };

    const daily = await parseJson(await fetch(`${http.baseUrl}/api/me/daily-log`, {
      headers: jsonHeaders(childSession),
    }));
    assert.equal(daily.status, 200, daily.text);
    assert.notEqual(daily.status, 402);
    let itemId = daily.body?.items?.[0]?.id;
    if (!itemId) {
      itemId = await ensureDailyLogItem(pg, { childId, timezone, activityName });
      const retry = await parseJson(await fetch(`${http.baseUrl}/api/me/daily-log`, {
        headers: jsonHeaders(childSession),
      }));
      assert.equal(retry.status, 200, retry.text);
      itemId = retry.body?.items?.[0]?.id || itemId;
    }
    assert.ok(itemId, 'daily view must expose an activity');

    const complete = await parseJson(await fetch(
      `${http.baseUrl}/api/me/daily-log-items/${itemId}/complete`,
      { method: 'PUT', headers: jsonHeaders(childSession) }
    ));
    assert.equal(complete.status, 200, complete.text);
    assert.notEqual(complete.status, 402);
    result.firstStar = true;

    const parentReturn = await loginParent(http.baseUrl, reg.email);
    assert.equal(parentReturn.status, 200, parentReturn.text);
    parent = parentReturn;

    const settings = await parseJson(await fetch(`${http.baseUrl}/api/family`, {
      headers: jsonHeaders(parent),
    }));
    assert.equal(settings.status, 200, settings.text);
    assert.equal(settings.body.preferred_locale || settings.body.family?.preferred_locale || locale, locale);
    result.settingsOk = true;

    const loggedOut = await logout(http.baseUrl, parent);
    assert.ok([200, 204].includes(loggedOut.status), loggedOut.text);
    const relogin = await loginParent(http.baseUrl, reg.email);
    assert.equal(relogin.status, 200, relogin.text);
    result.reloginOk = true;

    const deleteProbe = await fetch(`${http.baseUrl}/api/family/delete-account`, {
      method: 'DELETE',
      headers: jsonHeaders(relogin),
    });
    const deleteText = await deleteProbe.text();
    assert.equal(deleteProbe.status, 200, deleteText);
    result.deleteAccess = true;

    const gone = await loginParent(http.baseUrl, reg.email);
    assert.ok(gone.status === 401 || gone.status === 403, `deleted account login ${gone.status}`);

    return result;
  } catch (err) {
    if (String(err.message || err).includes('402')) result.no402 = false;
    throw err;
  } finally {
    await resetLaunchFlags(pg, appSettings);
    await appSettings.setPaymentEnabled(false);
    await http.close();
    await db.cleanup();
  }
}

describe('Finnish locale aliases never introduce a Finnish bundle', () => {
  it('maps fi / fi-FI / fi_FI / Finnish Accept-Language to sv-SE', () => {
    for (const raw of ['fi', 'fi-FI', 'fi-fi', 'fi_FI', 'fi_fi']) {
      assert.equal(normalizeLocale(raw), 'sv-SE', raw);
    }
    assert.equal(parseAcceptLanguage('fi-FI,fi;q=0.9,sv;q=0.8'), 'sv-SE');
    assert.equal(parseAcceptLanguage('fi_FI'), 'sv-SE');
    assert.equal(resolvePreAuthLocale({ acceptLanguage: 'fi,en;q=0.5' }), 'sv-SE');
    assert.deepEqual([...SUPPORTED_LOCALES], ['sv-SE', 'en-GB']);
    assert.equal(fs.existsSync(path.join(__dirname, '../src/locales/fi.json')), false);
    assert.equal(fs.existsSync(path.join(__dirname, '../src/locales/fi-FI.json')), false);
  });
});

describe('child limited allowlist is explicit, not /api/me/', () => {
  it('enumerates first-star prefixes and denies Premium / parent / admin surfaces', () => {
    assert.equal(CHILD_LIMITED_ACCOUNT_ALLOWED_PREFIXES.includes('/api/me/'), false);
    assert.equal(CHILD_LIMITED_ACCOUNT_ALLOWED_PREFIXES.some((p) => p === '/api/me/daily-log'), true);
    assert.equal(isChildLimitedAccountPath('/api/me/daily-log'), true);
    assert.equal(isChildLimitedAccountPath('/api/me/daily-log-items/abc/complete'), true);
    assert.equal(isChildLimitedAccountPath('/api/me/weekly-schedule'), true);
    assert.equal(isChildLimitedAccountPath('/api/me/view-type'), true);
    for (const p of CHILD_DENIED_ME_PATHS) {
      assert.equal(isChildLimitedAccountPath(p), false, p);
    }
    for (const p of CHILD_ROLE_DENIED_PATHS) {
      assert.equal(isChildLimitedAccountPath(p), false, p);
    }
  });
});

test('default flags keep IE/FI closed at public entry', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }
  reloadRuntimeModules();
  const pg = require('../src/lib/db');
  const appSettings = require('../db/app-settings');
  await resetLaunchFlags(pg, appSettings);
  await appSettings.setPaymentEnabled(false);
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const gates = await parseJson(await fetch(`${http.baseUrl}/api/market/registration-gates`));
    assert.equal(gates.status, 200);
    assert.equal(gates.body.market_ie_open, false);
    assert.equal(gates.body.market_fi_open, false);
    assert.equal(gates.body.signup_allowed.IE, false);
    assert.equal(gates.body.signup_allowed.FI, false);
    assert.equal(gates.body.public_billing_usable, false);

    const ieClosed = await registerCountry(http.baseUrl, { countryCode: 'IE', locale: 'en-GB' });
    assert.equal(ieClosed.status, 403, ieClosed.text);
    assert.equal(ieClosed.body.code, 'MARKET_IE_CLOSED');

    const fiClosed = await registerCountry(http.baseUrl, { countryCode: 'FI', locale: 'sv-SE' });
    assert.equal(fiClosed.status, 403, fiClosed.text);
    assert.equal(fiClosed.body.code, 'MARKET_FI_CLOSED');

    const ieConfig = getMarketConfig({ countryCode: 'IE', locale: 'en-GB' });
    assert.equal(ieConfig.timezone, 'Europe/Dublin');
    assert.equal(ieConfig.currency, 'EUR');
    assert.equal(ieConfig.defaultLocale, 'en-GB');
    const fiConfig = getMarketConfig({ countryCode: 'FI', locale: 'sv-SE' });
    assert.equal(fiConfig.timezone, 'Europe/Helsinki');
    assert.equal(fiConfig.currency, 'EUR');
    assert.equal(fiConfig.defaultLocale, 'sv-SE');
    const ieLegal = resolveLegalRoutes({ countryCode: 'IE', marketRegion: 'EU', locale: 'en-GB' });
    const fiLegal = resolveLegalRoutes({ countryCode: 'FI', marketRegion: 'EU', locale: 'sv-SE' });
    assert.equal(ieLegal.privacy, '/en/eea/privacy');
    assert.equal(fiLegal.privacy, '/privacy');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('IE open + billing OFF: English prebilling acceptance path', async (t) => {
  await runAcceptancePath(t, {
    countryCode: 'IE',
    locale: 'en-GB',
    timezone: 'Europe/Dublin',
    currency: 'EUR',
    accessKind: 'prebilling',
    isLifetimeFree: false,
    childName: 'Aoife',
    activityName: 'Brush teeth',
  });
});

test('FI open + billing OFF: Swedish prebilling acceptance path', async (t) => {
  await runAcceptancePath(t, {
    countryCode: 'FI',
    locale: 'sv-SE',
    timezone: 'Europe/Helsinki',
    currency: 'EUR',
    accessKind: 'prebilling',
    isLifetimeFree: false,
    childName: 'Aino',
    activityName: 'Borsta tänderna',
  });
});

test('Sweden critical path stays grandfathered (no IE/FI flag flips)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }
  reloadRuntimeModules();
  const pg = require('../src/lib/db');
  const appSettings = require('../db/app-settings');
  await resetLaunchFlags(pg, appSettings);
  await appSettings.setPaymentEnabled(false);
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const gates = await parseJson(await fetch(`${http.baseUrl}/api/market/registration-gates`));
    assert.equal(gates.body.market_ie_open, false);
    assert.equal(gates.body.market_fi_open, false);
    assert.equal(gates.body.signup_allowed.SE, true);

    const reg = await registerCountry(http.baseUrl, {
      countryCode: 'SE',
      locale: 'sv-SE',
      name: 'Svensk Förälder',
    });
    assert.equal(reg.status, 201, reg.text);

    const fam = await pg.query(
      `SELECT f.country_code, f.preferred_locale, f.timezone, f.is_lifetime_free
         FROM family f JOIN parent p ON p.family_id = f.id
        WHERE p.email = $1`,
      [reg.email.toLowerCase()]
    );
    assert.equal(fam.rows[0].country_code, 'SE');
    assert.equal(fam.rows[0].preferred_locale, 'sv-SE');
    assert.equal(fam.rows[0].timezone, 'Europe/Stockholm');
    assert.equal(fam.rows[0].is_lifetime_free, true);

    const parent = await loginParent(http.baseUrl, reg.email);
    assert.equal(parent.status, 200, parent.text);
    const sub = await parseJson(await fetch(`${http.baseUrl}/api/subscription/status`, {
      headers: jsonHeaders(parent),
    }));
    assert.equal(sub.body.access_kind, 'grandfathered');
    assert.equal(sub.body.premium?.active, true);
    assert.equal(sub.body.premium?.is_grandfathered, true);

    const childRes = await parseJson(await fetch(`${http.baseUrl}/api/onboarding/child`, {
      method: 'POST',
      headers: jsonHeaders(parent),
      body: JSON.stringify({ name: 'Astrid', emoji: '🌟', birthday: '2018-05-01' }),
    }));
    assert.equal(childRes.status, 201, childRes.text);

    await seedTodaySchedule(pg, {
      familyId: (await pg.query('SELECT family_id FROM parent WHERE email = $1', [reg.email.toLowerCase()])).rows[0].family_id,
      childId: childRes.body.id,
      timezone: 'Europe/Stockholm',
      activityName: 'Frukost',
    });

    const childLoginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: childRes.body.username, pin: childRes.body.pin }),
    });
    assert.equal(childLoginRes.status, 200, await childLoginRes.clone().text());
    let childCookies = {};
    for (const header of getSetCookieHeaders(childLoginRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }
    const childJson = JSON.parse(await childLoginRes.text());
    const childSession = { cookies: childCookies, csrfToken: childJson.csrfToken };

    const daily = await parseJson(await fetch(`${http.baseUrl}/api/me/daily-log`, {
      headers: jsonHeaders(childSession),
    }));
    assert.equal(daily.status, 200, daily.text);
    let itemId = daily.body?.items?.[0]?.id;
    if (!itemId) {
      itemId = await ensureDailyLogItem(pg, {
        childId: childRes.body.id,
        timezone: 'Europe/Stockholm',
        activityName: 'Frukost',
      });
    }
    const complete = await parseJson(await fetch(
      `${http.baseUrl}/api/me/daily-log-items/${itemId}/complete`,
      { method: 'PUT', headers: jsonHeaders(childSession) }
    ));
    assert.equal(complete.status, 200, complete.text);

    const settings = await parseJson(await fetch(`${http.baseUrl}/api/family`, {
      headers: jsonHeaders(parent),
    }));
    assert.equal(settings.status, 200, settings.text);
    await logout(http.baseUrl, parent);
    const relogin = await loginParent(http.baseUrl, reg.email);
    assert.equal(relogin.status, 200, relogin.text);
  } finally {
    await resetLaunchFlags(pg, appSettings);
    await http.close();
    await db.cleanup();
  }
});

test('child cannot reach parent/admin/billing/premium surfaces (prebilling + limited)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }
  reloadRuntimeModules();
  const pg = require('../src/lib/db');
  const appSettings = require('../db/app-settings');
  await setMarketFlag(pg, 'market_ie_open', true);
  await setMarketFlag(pg, 'market_eu_open', false);
  await appSettings.upsertSetting('market_ie_payment_start_at', IE_FI_START);
  await appSettings.setPaymentEnabled(false);
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  let billingSnap;
  try {
    const reg = await registerCountry(http.baseUrl, { countryCode: 'IE', locale: 'en-GB' });
    assert.equal(reg.status, 201, reg.text);
    const parent = await loginParent(http.baseUrl, reg.email);
    const childRes = await parseJson(await fetch(`${http.baseUrl}/api/onboarding/child`, {
      method: 'POST',
      headers: jsonHeaders(parent),
      body: JSON.stringify({ name: 'Niamh', emoji: '🌟', birthday: '2018-05-01' }),
    }));
    assert.equal(childRes.status, 201, childRes.text);

    const childLoginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: childRes.body.username, pin: childRes.body.pin }),
    });
    assert.equal(childLoginRes.status, 200);
    let childCookies = {};
    for (const header of getSetCookieHeaders(childLoginRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }
    const childJson = JSON.parse(await childLoginRes.text());
    const childSession = { cookies: childCookies, csrfToken: childJson.csrfToken };

    async function probe(method, url) {
      return parseJson(await fetch(`${http.baseUrl}${url}`, {
        method,
        headers: jsonHeaders(childSession),
      }));
    }

    for (const url of CHILD_ROLE_DENIED_PATHS) {
      const method = url === '/api/family/delete-account' || url === '/api/iap/sync' ? 'POST' : 'GET';
      const actualMethod = url === '/api/family/delete-account' ? 'DELETE' : method;
      const res = await probe(actualMethod, url);
      assert.ok(
        [401, 403, 404, 405].includes(res.status),
        `prebilling child ${actualMethod} ${url} → ${res.status} ${res.text}`
      );
      assert.notEqual(res.status, 200, `child must not succeed on ${url}`);
    }

    const prebillingRewards = await probe('GET', '/api/me/rewards');
    assert.ok([200, 402].includes(prebillingRewards.status), prebillingRewards.text);

    billingSnap = await enablePublicBillingForTest();
    await appSettings.upsertSetting('market_ie_payment_start_at', '2026-01-01T00:00:00+02:00');

    const limitedDaily = await probe('GET', '/api/me/daily-log');
    assert.equal(limitedDaily.status, 200, limitedDaily.text);

    for (const url of CHILD_DENIED_ME_PATHS) {
      const res = await probe(url === '/api/me/profile-photo' ? 'DELETE' : 'GET', url);
      assert.equal(res.status, 402, `limited child ${url} → ${res.status} ${res.text}`);
      assert.equal(res.body?.code, 'PREMIUM_REQUIRED');
    }

    const limitedChildren = await probe('GET', '/api/children');
    assert.ok([402, 403].includes(limitedChildren.status), limitedChildren.text);
    const limitedDelete = await probe('DELETE', '/api/family/delete-account');
    assert.ok([402, 403].includes(limitedDelete.status), limitedDelete.text);
    const limitedAdmin = await probe('GET', '/api/admin/families');
    assert.ok([401, 403, 402].includes(limitedAdmin.status), limitedAdmin.text);
    const limitedIap = await probe('POST', '/api/iap/sync');
    assert.ok([401, 403, 402].includes(limitedIap.status), limitedIap.text);
    const limitedMessages = await probe('GET', '/api/messages/unread');
    assert.ok([401, 403, 402].includes(limitedMessages.status), limitedMessages.text);
  } finally {
    await appSettings.upsertSetting('market_ie_payment_start_at', IE_FI_START);
    if (billingSnap) await disablePublicBillingForTest(billingSnap);
    else await appSettings.setPaymentEnabled(false);
    await resetLaunchFlags(pg, appSettings);
    await http.close();
    await db.cleanup();
  }
});
