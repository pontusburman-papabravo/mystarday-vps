'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb, injectMockDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');

async function registerWithLocale(baseUrl, { preferred_locale, country_code = 'SE' }) {
  const email = `global-en-${crypto.randomBytes(6).toString('hex')}@example.com`;
  const password = 'integration-test-pass-1';
  const reg = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      name: 'Parent',
      preferred_locale,
      country_code,
    }),
  });
  assert.equal(reg.status, 201, await reg.text());

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginText = await loginRes.text();
  assert.equal(loginRes.status, 200, loginText);
  const loginBody = JSON.parse(loginText);
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { email, cookies, csrfToken: loginBody.csrfToken, loginBody };
}

async function putSettings(baseUrl, session, body) {
  return fetch(`${baseUrl}/api/family/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify(body),
  });
}
const { applyLoginLocaleChoice } = require('../src/lib/apply-login-locale');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const GLOBAL_KEY = 'english_app_global_enabled';

async function setGlobalFlag(pg, enabled) {
  await pg.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, $2, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
    [GLOBAL_KEY, enabled]
  );
}

async function seedEnglishFeatures(pg) {
  await pg.query(
    `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
     VALUES
       ('english_app', 'English app', 'Parent/auth en-GB', 'dev', '{i18n}', 'high', 5, 8),
       ('english_child_experience', 'English child pack', 'child_en QA gate', 'dev', '{i18n}', 'high', 5, 8)
     ON CONFLICT (slug) DO UPDATE SET status = 'dev', updated_at = NOW()`
  );
}

async function createFamily(pg, locale = 'sv-SE') {
  const fam = await pg.query(
    `INSERT INTO family (name, preferred_locale) VALUES ($1, $2) RETURNING id`,
    [`fam-${crypto.randomBytes(4).toString('hex')}`, locale]
  );
  return fam.rows[0].id;
}

test('global OFF: sv family without english_app cannot select en-GB', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  const { isEnglishAppEnabled, canSelectEnglishLocale, isEnglishChildExperienceEnabled } =
    require('../src/lib/i18n-flags');

  try {
    await seedEnglishFeatures(pg);
    await setGlobalFlag(pg, false);
    const familyId = await createFamily(pg, 'sv-SE');

    assert.equal(await isEnglishAppEnabled(familyId), false);
    assert.equal(await canSelectEnglishLocale(familyId), false);
    assert.equal(await isEnglishChildExperienceEnabled(familyId), false);
    assert.equal(await isEnglishAppEnabled(null), true);
  } finally {
    await db.cleanup();
  }
});

test('global OFF: beta family with english_app row', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  const { isEnglishAppEnabled, canSelectEnglishLocale } = require('../src/lib/i18n-flags');
  let familyId;

  try {
    await seedEnglishFeatures(pg);
    await setGlobalFlag(pg, false);
    familyId = await createFamily(pg, 'sv-SE');
    await pg.query(
      `INSERT INTO family_features (family_id, feature_slug) VALUES ($1, 'english_app') ON CONFLICT DO NOTHING`,
      [familyId]
    );

    assert.equal(await isEnglishAppEnabled(familyId), true);
    assert.equal(await canSelectEnglishLocale(familyId), true);
  } finally {
    if (familyId) {
      await pg.query('DELETE FROM family_features WHERE family_id = $1', [familyId]);
      await pg.query('DELETE FROM family WHERE id = $1', [familyId]);
    }
    await db.cleanup();
  }
});

test('global ON: sv family may select en-GB without family_features row', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  const { isEnglishAppEnabled, canSelectEnglishLocale } = require('../src/lib/i18n-flags');
  let familyId;

  try {
    await seedEnglishFeatures(pg);
    await setGlobalFlag(pg, true);
    familyId = await createFamily(pg, 'sv-SE');

    assert.equal(await isEnglishAppEnabled(familyId), true);
    assert.equal(await canSelectEnglishLocale(familyId), true);

    const row = await pg.query(
      'SELECT 1 FROM family_features WHERE family_id = $1 AND feature_slug = $2',
      [familyId, 'english_app']
    );
    assert.equal(row.rows.length, 0);
  } finally {
    if (familyId) await pg.query('DELETE FROM family WHERE id = $1', [familyId]);
    await db.cleanup();
  }
});

test('global OFF grandfather: en-GB family without row keeps UI access', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  const { isEnglishAppEnabled, canSelectEnglishLocale } = require('../src/lib/i18n-flags');
  let familyId;

  try {
    await seedEnglishFeatures(pg);
    await setGlobalFlag(pg, false);
    familyId = await createFamily(pg, 'en-GB');

    assert.equal(await isEnglishAppEnabled(familyId), true);
    assert.equal(await canSelectEnglishLocale(familyId), false);
  } finally {
    if (familyId) await pg.query('DELETE FROM family WHERE id = $1', [familyId]);
    await db.cleanup();
  }
});

test('global OFF blocks new en-GB switch via settings API', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    await seedEnglishFeatures(pg);
    await setGlobalFlag(pg, true);

    const session = await registerWithLocale(http.baseUrl, { preferred_locale: 'sv-SE' });

    await setGlobalFlag(pg, false);

    const put = await putSettings(http.baseUrl, session, { preferred_locale: 'en-GB' });
    assert.equal(put.status, 403);
    const body = await put.json();
    assert.equal(body.error, 'ENGLISH_NOT_AVAILABLE');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('global ON: settings switch to en-GB persists', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    await seedEnglishFeatures(pg);
    await setGlobalFlag(pg, true);

    const session = await registerWithLocale(http.baseUrl, { preferred_locale: 'sv-SE' });

    const put = await putSettings(http.baseUrl, session, { preferred_locale: 'en-GB' });
    assert.equal(put.status, 200);

    const opts = await fetch(`${http.baseUrl}/api/family/locale-options`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const optsBody = await opts.json();
    assert.equal(optsBody.preferred_locale, 'en-GB');
    assert.equal(optsBody.english_app_enabled, true);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('registration en-GB with global OFF still allowed', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    await seedEnglishFeatures(pg);
    await setGlobalFlag(pg, false);

    const session = await registerWithLocale(http.baseUrl, { preferred_locale: 'en-GB' });
    assert.equal(session.loginBody.user.preferred_locale, 'en-GB');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('english_language_offer OFF keeps English access when global ON', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    await seedEnglishFeatures(pg);
    await setGlobalFlag(pg, true);
    await pg.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ('english_language_offer', false, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`
    );

    const session = await registerWithLocale(http.baseUrl, { preferred_locale: 'sv-SE' });

    const ctx = await fetch(`${http.baseUrl}/api/family/locale-context`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const ctxBody = await ctx.json();
    assert.equal(ctxBody.show_english_beta_offer, false);
    assert.equal(ctxBody.english_app_enabled, true);

    const opts = await fetch(`${http.baseUrl}/api/family/locale-options`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const optsBody = await opts.json();
    assert.equal(optsBody.english_app_enabled, true);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('child experience gated when feature status dev (rollback path)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  const { isEnglishChildExperienceEnabled } = require('../src/lib/i18n-flags');
  const { resolveChildUiLocale } = require('../src/lib/child-ui-locale');
  let familyId;

  try {
    await seedEnglishFeatures(pg);
    await setGlobalFlag(pg, true);
    familyId = await createFamily(pg, 'en-GB');

    assert.equal(await isEnglishChildExperienceEnabled(familyId), false);
    assert.equal(resolveChildUiLocale('en-GB', false), 'sv-SE');

    await pg.query(
      `INSERT INTO family_features (family_id, feature_slug) VALUES ($1, 'english_child_experience')
       ON CONFLICT DO NOTHING`,
      [familyId]
    );
    assert.equal(await isEnglishChildExperienceEnabled(familyId), true);
    assert.equal(resolveChildUiLocale('en-GB', true), 'en-GB');
  } finally {
    if (familyId) {
      await pg.query('DELETE FROM family_features WHERE family_id = $1', [familyId]);
      await pg.query('DELETE FROM family WHERE id = $1', [familyId]);
    }
    await db.cleanup();
  }
});

test('child experience live: en-GB family gets child_en without family_features row', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  const { isEnglishChildExperienceEnabled } = require('../src/lib/i18n-flags');
  const { resolveChildUiLocale } = require('../src/lib/child-ui-locale');
  let familyId;

  try {
    await pg.query(
      `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
       VALUES
         ('english_app', 'English app', 'Parent/auth en-GB', 'live', '{i18n}', 'high', 5, 8),
         ('english_child_experience', 'English child pack', 'child_en', 'live', '{i18n}', 'high', 5, 8)
       ON CONFLICT (slug) DO UPDATE SET status = 'live', updated_at = NOW()`
    );
    await setGlobalFlag(pg, true);
    familyId = await createFamily(pg, 'en-GB');

    assert.equal(await isEnglishChildExperienceEnabled(familyId), true);
    assert.equal(resolveChildUiLocale('en-GB', true), 'en-GB');
  } finally {
    if (familyId) await pg.query('DELETE FROM family WHERE id = $1', [familyId]);
    await db.cleanup();
  }
});

test('applyLoginLocaleChoice respects canSelect when global OFF', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  let familyId;

  try {
    await seedEnglishFeatures(pg);
    await setGlobalFlag(pg, false);
    familyId = await createFamily(pg, 'sv-SE');

    const result = await applyLoginLocaleChoice({
      familyId,
      explicitLocale: 'en-GB',
    });
    assert.equal(result, 'sv-SE');

    const row = await pg.query('SELECT preferred_locale FROM family WHERE id = $1', [familyId]);
    assert.equal(row.rows[0].preferred_locale, 'sv-SE');
  } finally {
    if (familyId) await pg.query('DELETE FROM family WHERE id = $1', [familyId]);
    await db.cleanup();
  }
});

test('applyLoginLocaleChoice allows en-GB when global ON', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  let familyId;

  try {
    await seedEnglishFeatures(pg);
    await setGlobalFlag(pg, true);
    familyId = await createFamily(pg, 'sv-SE');

    const result = await applyLoginLocaleChoice({
      familyId,
      explicitLocale: 'en-GB',
    });
    assert.equal(result, 'en-GB');
  } finally {
    if (familyId) await pg.query('DELETE FROM family WHERE id = $1', [familyId]);
    await db.cleanup();
  }
});

async function logout(baseUrl, session) {
  const res = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
  });
  assert.ok(res.status === 200 || res.status === 204, await res.text());
}

async function loginAgain(baseUrl, email, password) {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginText = await loginRes.text();
  assert.equal(loginRes.status, 200, loginText);
  const loginBody = JSON.parse(loginText);
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { cookies, csrfToken: loginBody.csrfToken, loginBody };
}

test('grandfather: en-GB persists after global OFF, logout, re-login, and child login', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const { createChild } = require('./helpers/auth-session.js');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');
  const password = 'integration-test-pass-1';

  try {
    await seedEnglishFeatures(pg);
    await setGlobalFlag(pg, true);

    const session = await registerWithLocale(http.baseUrl, { preferred_locale: 'sv-SE' });
    const email = session.email;

    const put = await putSettings(http.baseUrl, session, { preferred_locale: 'en-GB' });
    assert.equal(put.status, 200);

    const parentRow = await pg.query(
      'SELECT family_id FROM parent WHERE LOWER(email) = $1',
      [email.toLowerCase()]
    );
    const familyId = parentRow.rows[0].family_id;

    await pg.query(
      `INSERT INTO family_features (family_id, feature_slug) VALUES ($1, 'english_child_experience')
       ON CONFLICT DO NOTHING`,
      [familyId]
    );

    const childId = await createChild(http.baseUrl, session, {
      name: 'Grandchild',
      username: `gc${crypto.randomBytes(3).toString('hex')}`,
      pin: '2468',
      birthday: '2018-06-01',
    });
    const childRow = await pg.query('SELECT username FROM child WHERE id = $1', [childId]);
    const childUsername = childRow.rows[0].username;

    await pg.query(
      'DELETE FROM family_features WHERE family_id = $1 AND feature_slug = $2',
      [familyId, 'english_app']
    );
    await setGlobalFlag(pg, false);

    await logout(http.baseUrl, session);

    const session2 = await loginAgain(http.baseUrl, email, password);
    assert.equal(session2.loginBody.user.preferred_locale, 'en-GB');

    const opts1 = await fetch(`${http.baseUrl}/api/family/locale-options`, {
      headers: { Cookie: cookieHeader(session2.cookies) },
    });
    const optsBody1 = await opts1.json();
    assert.equal(optsBody1.preferred_locale, 'en-GB');
    assert.equal(optsBody1.english_app_enabled, true);

    await logout(http.baseUrl, session2);

    const session3 = await loginAgain(http.baseUrl, email, password);
    assert.equal(session3.loginBody.user.preferred_locale, 'en-GB');

    const childLoginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: childUsername, pin: '2468' }),
    });
    const childLoginText = await childLoginRes.text();
    assert.equal(childLoginRes.status, 200, childLoginText);
    const childBody = JSON.parse(childLoginText);
    assert.equal(childBody.user.type, 'child');
    let childCookies = {};
    for (const header of getSetCookieHeaders(childLoginRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }
    const childMeRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(childCookies) },
    });
    const childMeText = await childMeRes.text();
    assert.equal(childMeRes.status, 200, childMeText);
    const childMe = JSON.parse(childMeText);
    assert.equal(childMe.preferred_locale, 'en-GB');
    assert.equal(childMe.english_child_experience_enabled, true);
    assert.equal(childMe.child_ui_locale, 'en-GB');

    const famLocale = await pg.query('SELECT preferred_locale FROM family WHERE id = $1', [familyId]);
    assert.equal(famLocale.rows[0].preferred_locale, 'en-GB');

    const parentAgain = await loginAgain(http.baseUrl, email, password);
    assert.equal(parentAgain.loginBody.user.preferred_locale, 'en-GB');
    const opts2 = await fetch(`${http.baseUrl}/api/family/locale-options`, {
      headers: { Cookie: cookieHeader(parentAgain.cookies) },
    });
    const optsBody2 = await opts2.json();
    assert.equal(optsBody2.preferred_locale, 'en-GB');
    assert.equal(optsBody2.english_app_enabled, true);
    assert.equal(optsBody2.english_child_experience_enabled, true);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('english global flag read fail-closed exposes ENGLISH_GLOBAL_FLAG_READ_FAILED', async () => {
  const mock = injectMockDb();
  mock.setQuery(async () => {
    throw new Error('timeout');
  });
  const flagPath = require.resolve('../src/lib/english-app-global-flag');
  delete require.cache[flagPath];

  try {
    const {
      readEnglishAppGlobalFlagState,
      READ_FAILED_CODE,
      getEnglishGlobalAvailabilityReadiness,
    } = require('../src/lib/english-app-global-flag');
    const state = await readEnglishAppGlobalFlagState();
    assert.equal(state.readOk, false);
    assert.equal(state.enabled, false);
    const readiness = await getEnglishGlobalAvailabilityReadiness();
    assert.equal(readiness.english_global_flag_read_ok, false);
    assert.equal(readiness.english_global_flag_enabled, false);
    assert.equal(readiness.english_global_flag_read_error, READ_FAILED_CODE);
  } finally {
    mock.restore();
    delete require.cache[flagPath];
  }
});

test('/health exposes english global flag readiness', async () => {
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const res = await fetch(`${http.baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.english_global_flag_key, GLOBAL_KEY);
    assert.equal(typeof body.english_global_flag_read_ok, 'boolean');
    assert.equal(typeof body.english_global_flag_enabled, 'boolean');
    if (!body.english_global_flag_read_ok) {
      assert.equal(body.english_global_flag_read_error, 'ENGLISH_GLOBAL_FLAG_READ_FAILED');
    }
  } finally {
    await http.close();
  }
});
