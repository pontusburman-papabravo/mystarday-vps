'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
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

test('child experience still requires english_child_experience when global ON', async (t) => {
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
