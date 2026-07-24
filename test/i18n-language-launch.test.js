'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function uniqueEmail() {
  return `i18n-launch-${crypto.randomBytes(6).toString('hex')}@example.com`;
}

describe('locale-selection helpers', () => {
  const {
    shouldShowEnglishBetaOffer,
    OFFER_STATES,
    SELECTION_SOURCES,
    buildLocaleContextRow,
  } = require('../src/lib/locale-selection');

  test('shows offer for legacy sv-SE families', () => {
    assert.equal(
      shouldShowEnglishBetaOffer({
        preferred_locale: 'sv-SE',
        english_beta_offer_state: OFFER_STATES.NOT_SHOWN,
        locale_selection_source: SELECTION_SOURCES.LEGACY_DEFAULT,
      }),
      true
    );
  });

  test('hides offer after registration_decided', () => {
    assert.equal(
      shouldShowEnglishBetaOffer({
        preferred_locale: 'sv-SE',
        english_beta_offer_state: OFFER_STATES.REGISTRATION_DECIDED,
        locale_selection_source: SELECTION_SOURCES.REGISTRATION,
      }),
      false
    );
  });

  test('hides offer after decline', () => {
    assert.equal(
      shouldShowEnglishBetaOffer({
        preferred_locale: 'sv-SE',
        english_beta_offer_state: OFFER_STATES.DECLINED_ENGLISH,
        locale_selection_source: SELECTION_SOURCES.LEGACY_DEFAULT,
      }),
      false
    );
  });

  test('buildLocaleContextRow flags english beta', () => {
    const ctx = buildLocaleContextRow({
      preferred_locale: 'en-GB',
      english_beta_offer_state: OFFER_STATES.ACCEPTED_ENGLISH,
      locale_selection_source: SELECTION_SOURCES.SETTINGS,
    });
    assert.equal(ctx.english_is_beta, true);
    assert.equal(ctx.show_english_beta_offer, false);
  });
});

test('registration with explicit locale sets registration_decided state', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    const email = uniqueEmail();
    const res = await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Launch Parent',
        email,
        password: 'testpass123',
        preferred_locale: 'en-GB',
      }),
    });
    assert.equal(res.status, 201, await res.text());

    const fam = await pg.query(
      `SELECT f.preferred_locale, f.locale_selection_source, f.english_beta_offer_state
       FROM family f JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
      [email.toLowerCase()]
    );
    assert.equal(fam.rows[0].preferred_locale, 'en-GB');
    assert.equal(fam.rows[0].locale_selection_source, 'registration');
    assert.equal(fam.rows[0].english_beta_offer_state, 'registration_decided');

    const flags = await pg.query(
      `SELECT 1 FROM family_features WHERE family_id = (
         SELECT family_id FROM parent WHERE email = $1
       ) AND feature_slug = 'english_app'`,
      [email.toLowerCase()]
    );
    assert.equal(flags.rows.length, 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('english beta offer API declines without switching locale', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    const email = uniqueEmail();
    await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Legacy', email, password: 'testpass123' }),
    });

    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'testpass123' }),
    });
    assert.equal(loginRes.status, 200);
    const loginBody = await loginRes.json();
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    const ctxRes = await fetch(`${http.baseUrl}/api/family/locale-context`, {
      headers: { Cookie: cookieHeader(cookies) },
    });
    const ctx = await ctxRes.json();
    assert.equal(ctxRes.status, 200, JSON.stringify(ctx));
    assert.equal(ctx.show_english_beta_offer, true);

    const declineRes = await fetch(`${http.baseUrl}/api/family/english-beta-offer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': loginBody.csrfToken,
      },
      body: JSON.stringify({ action: 'decline' }),
    });
    assert.equal(declineRes.status, 200);

    const fam = await pg.query(
      `SELECT preferred_locale, english_beta_offer_state FROM family f
       JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
      [email.toLowerCase()]
    );
    assert.equal(fam.rows[0].preferred_locale, 'sv-SE');
    assert.equal(fam.rows[0].english_beta_offer_state, 'declined_english_beta');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('feedback accepts language type with metadata', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    const email = uniqueEmail();
    await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Reporter', email, password: 'testpass123' }),
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

    await pg.query(`
      INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours, documentation)
      VALUES ('feedback_formular', 'Feedback', 'Feedback form', 'live', '{}', 'low', 1, 1, '{}')
      ON CONFLICT (slug) DO UPDATE SET status = 'live'
    `);

    const res = await fetch(`${http.baseUrl}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': loginBody.csrfToken,
      },
      body: JSON.stringify({
        type: 'language',
        title: 'Wrong nav label',
        message: 'Today tab still shows Swedish text on Home screen.',
        metadata: { route: '/dashboard', locale: 'en-GB' },
      }),
    });
    assert.equal(res.status, 201, await res.text());

    const row = await pg.query(
      `SELECT message_type, metadata FROM contact_message
       WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [email.toLowerCase()]
    );
    assert.equal(row.rows[0].message_type, 'language');
    assert.equal(row.rows[0].metadata.locale, 'sv-SE');
    assert.equal(row.rows[0].metadata.route, '/dashboard');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('public web routes config includes English FAQ', () => {
  const { PUBLIC_WEB_ROUTES } = require('../config/public-web-routes');
  const faq = PUBLIC_WEB_ROUTES.find((r) => r.sv === '/faq');
  assert.ok(faq);
  assert.equal(faq.en, '/en/faq');
  assert.equal(faq.fileEn, 'en-faq.html');
});

describe('feedback metadata sanitization', () => {
  const { sanitizeMetadata, buildFeedbackMetadata } = require('../src/routes/feedback');

  test('strips sensitive and unknown keys', () => {
    const safe = sanitizeMetadata({
      route: '/dashboard',
      password: 'secret',
      pin: '1234',
      access_token: 'jwt',
      session_cookie: 'abc',
      child_name: 'Anna',
      activity_text: 'Brush teeth',
    });
    assert.equal(safe.route, '/dashboard');
    assert.equal(safe.password, undefined);
    assert.equal(safe.pin, undefined);
    assert.equal(safe.access_token, undefined);
    assert.equal(safe.child_name, undefined);
  });

  test('truncates long metadata strings', () => {
    const safe = sanitizeMetadata({ visible_text: 'x'.repeat(1000) });
    assert.equal(safe.visible_text.length, 500);
  });

  test('rejects oversized combined metadata payload', () => {
    const huge = {};
    for (let i = 0; i < 30; i++) {
      huge[`field_${i}`] = 'x'.repeat(100);
    }
    assert.throws(() => {
      buildFeedbackMetadata(huge, 'en-GB', true, false, 'family-id');
    }, /METADATA_TOO_LARGE/);
  });
});

describe('english beta offer state machine', () => {
  const {
    shouldShowEnglishBetaOffer,
    OFFER_STATES,
    SELECTION_SOURCES,
    remindLaterTimestamp,
  } = require('../src/lib/locale-selection');

  test('remind_later hides until server remind timestamp', () => {
    const future = new Date('2030-01-01T00:00:00Z');
    assert.equal(
      shouldShowEnglishBetaOffer({
        preferred_locale: 'sv-SE',
        english_beta_offer_state: OFFER_STATES.REMIND_LATER,
        english_beta_offer_remind_at: future.toISOString(),
        locale_selection_source: SELECTION_SOURCES.LEGACY_DEFAULT,
      }, new Date('2026-01-01')),
      false
    );
    assert.equal(
      shouldShowEnglishBetaOffer({
        preferred_locale: 'sv-SE',
        english_beta_offer_state: OFFER_STATES.REMIND_LATER,
        english_beta_offer_remind_at: future.toISOString(),
        locale_selection_source: SELECTION_SOURCES.LEGACY_DEFAULT,
      }, new Date('2031-01-01')),
      true
    );
  });

  test('remind_later timestamp is seven days ahead', () => {
    const now = new Date('2026-07-24T12:00:00Z');
    const remind = remindLaterTimestamp(now);
    assert.equal(remind.toISOString(), '2026-07-31T12:00:00.000Z');
  });

  test('english families never see offer', () => {
    assert.equal(
      shouldShowEnglishBetaOffer({
        preferred_locale: 'en-GB',
        english_beta_offer_state: OFFER_STATES.NOT_SHOWN,
        locale_selection_source: SELECTION_SOURCES.LEGACY_DEFAULT,
      }),
      false
    );
  });
});

test('legacy registration without locale defaults sv-SE', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    const email = uniqueEmail();
    const res = await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Language': 'en-GB,en;q=0.9' },
      body: JSON.stringify({ name: 'Legacy Client', email, password: 'testpass123' }),
    });
    assert.equal(res.status, 201, await res.text());

    const fam = await pg.query(
      `SELECT preferred_locale, locale_selection_source, english_beta_offer_state
       FROM family f JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
      [email.toLowerCase()]
    );
    assert.equal(fam.rows[0].preferred_locale, 'sv-SE');
    assert.equal(fam.rows[0].locale_selection_source, 'legacy_default');
    assert.equal(fam.rows[0].english_beta_offer_state, 'not_shown');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('english beta offer accept enables english_app and switches locale', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    const email = uniqueEmail();
    await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Offer Parent', email, password: 'testpass123' }),
    });

    await pg.query(`
      UPDATE family SET english_beta_offer_state = 'not_shown',
        locale_selection_source = 'legacy_default'
      FROM parent p WHERE p.family_id = family.id AND p.email = $1
    `, [email.toLowerCase()]);

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

    const acceptRes = await fetch(`${http.baseUrl}/api/family/english-beta-offer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': loginBody.csrfToken,
      },
      body: JSON.stringify({ action: 'accept_english' }),
    });
    assert.equal(acceptRes.status, 200, await acceptRes.text());

    const fam = await pg.query(
      `SELECT preferred_locale, english_beta_offer_state, locale_selection_source
       FROM family f JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
      [email.toLowerCase()]
    );
    assert.equal(fam.rows[0].preferred_locale, 'en-GB');
    assert.equal(fam.rows[0].english_beta_offer_state, 'accepted_english_beta');
    assert.equal(fam.rows[0].locale_selection_source, 'existing_user_offer');

    const flags = await pg.query(
      `SELECT 1 FROM family_features ff
       JOIN parent p ON p.family_id = ff.family_id
       WHERE p.email = $1 AND ff.feature_slug = 'english_app'`,
      [email.toLowerCase()]
    );
    assert.equal(flags.rows.length, 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('english_language_offer kill switch hides offer', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    await pg.query(`
      INSERT INTO feature_flag (key, enabled, description)
      VALUES ('english_language_offer', false, 'test')
      ON CONFLICT (key) DO UPDATE SET enabled = false
    `);

    const email = uniqueEmail();
    await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Kill', email, password: 'testpass123' }),
    });

    await pg.query(`
      UPDATE family SET english_beta_offer_state = 'not_shown',
        locale_selection_source = 'legacy_default'
      FROM parent p WHERE p.family_id = family.id AND p.email = $1
    `, [email.toLowerCase()]);

    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'testpass123' }),
    });
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    const ctxRes = await fetch(`${http.baseUrl}/api/family/locale-context`, {
      headers: { Cookie: cookieHeader(cookies) },
    });
    const ctx = await ctxRes.json();
    assert.equal(ctx.show_english_beta_offer, false);
  } finally {
    await pg.query(`
      INSERT INTO feature_flag (key, enabled, description)
      VALUES ('english_language_offer', true, 'test')
      ON CONFLICT (key) DO UPDATE SET enabled = true
    `);
    await http.close();
    await db.cleanup();
  }
});

test('registration stores independent locale and country (en-GB + SE)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    const email = uniqueEmail();
    const res = await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'English Sweden',
        email,
        password: 'testpass123',
        preferred_locale: 'en-GB',
        country_code: 'SE',
      }),
    });
    assert.equal(res.status, 201, await res.text());

    const fam = await pg.query(
      `SELECT preferred_locale, country_code, market_region
       FROM family f JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
      [email.toLowerCase()]
    );
    assert.equal(fam.rows[0].preferred_locale, 'en-GB');
    assert.equal(fam.rows[0].country_code, 'SE');
    assert.equal(fam.rows[0].market_region, 'EU');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('registration from US blocked when market_us_open is OFF', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    await pg.query(`
      INSERT INTO feature_flag (key, enabled, description)
      VALUES ('market_us_open', false, 'test')
      ON CONFLICT (key) DO UPDATE SET enabled = false
    `);

    const email = uniqueEmail();
    const res = await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'US Parent',
        email,
        password: 'testpass123',
        preferred_locale: 'en-GB',
        country_code: 'US',
      }),
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.code, 'MARKET_US_CLOSED');
    assert.equal(body.market_region, 'US');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('registration from DE blocked when market_eu_open is OFF', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    await pg.query(`
      INSERT INTO feature_flag (key, enabled, description)
      VALUES ('market_eu_open', false, 'test')
      ON CONFLICT (key) DO UPDATE SET enabled = false
    `);

    const email = uniqueEmail();
    const res = await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'DE Parent',
        email,
        password: 'testpass123',
        preferred_locale: 'sv-SE',
        country_code: 'DE',
      }),
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.code, 'MARKET_EU_CLOSED');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('audit:i18n:strict has zero hits', () => {
  const { execSync } = require('child_process');
  const out = execSync('npm run audit:i18n:strict', {
    cwd: require('path').join(__dirname, '..'),
    encoding: 'utf8',
    env: { ...process.env, PATH: process.env.PATH },
  });
  assert.match(out, /STRICT: 0 hit/);
});

