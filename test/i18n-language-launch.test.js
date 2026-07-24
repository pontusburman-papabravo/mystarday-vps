'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
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
    const loginBody = await loginRes.json();
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
