'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const { loadLocales, t } = require('../src/lib/i18n');
const { resolvePasswordResetEmailLocale } = require('../src/lib/auth-email-locale');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function uniqueEmail() {
  return `i18n-email-${crypto.randomBytes(6).toString('hex')}@example.com`;
}

test('auth email locale — en-GB registration uses English verify subject key', () => {
  loadLocales();
  const subject = t('en-GB', 'email.verify.subject', { brand: 'My Starday' });
  assert.match(subject, /Verify your email/i);
  const sv = t('sv-SE', 'email.verify.subject', { brand: 'Stjärndag' });
  assert.match(sv, /Verifiera/i);
});

test('auth email locale — password reset resolution', () => {
  assert.equal(resolvePasswordResetEmailLocale({ familyPreferredLocale: 'en-GB' }), 'en-GB');
  assert.equal(resolvePasswordResetEmailLocale({ requestLocale: 'en' }), 'en-GB');
  assert.equal(resolvePasswordResetEmailLocale({ requestLocale: 'bogus' }), 'sv-SE');
});

test('forgot-password uses family locale when account exists', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  loadLocales();
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    const email = uniqueEmail();
    const reg = await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Reset Locale',
        email,
        password: 'testpass123',
        preferred_locale: 'en-GB',
      }),
    });
    assert.equal(reg.status, 201);

    const forgot = await fetch(`${http.baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, preferred_locale: 'sv-SE' }),
    });
    assert.equal(forgot.status, 200);
    // Family locale en-GB wins over request sv-SE (parent has single family_id)
    const fam = await pg.query(
      `SELECT f.preferred_locale FROM parent p JOIN family f ON f.id = p.family_id WHERE p.email = $1`,
      [email.toLowerCase()]
    );
    assert.equal(fam.rows[0].preferred_locale, 'en-GB');
  } finally {
    await http.close();
    await db.cleanup();
  }
});
