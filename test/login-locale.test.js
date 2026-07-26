'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function uniqueEmail() {
  return `login-locale-${crypto.randomBytes(6).toString('hex')}@example.com`;
}

describe('login-locale client helper', () => {
  test('login.html loads helper before auth handlers', () => {
    const fs = require('fs');
    const path = require('path');
    const html = fs.readFileSync(path.join(__dirname, '..', 'public/login.html'), 'utf8');
    assert.match(html, /login-locale\.js/);
    assert.match(html, /LoginLocale\.withLoginLocale/);
  });

  test('helper only sends locale when explicit choice flag is set', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'public/js/login-locale.js'), 'utf8');
    assert.match(src, /sd_locale_explicit_choice/);
    assert.match(src, /hasExplicitChoice/);
    assert.match(src, /if \(!hasExplicitChoice\(\)\) return null/);
  });
});

describe('applyLoginLocaleChoice unit', () => {
  test('ignores invalid locale strings', async () => {
    const { applyLoginLocaleChoice } = require('../src/lib/apply-login-locale');
    const result = await applyLoginLocaleChoice({
      familyId: null,
      explicitLocale: 'fr-FR',
    });
    assert.equal(result, 'sv-SE');
  });

  test('normalizes sv and en aliases', async () => {
    const db = await setupTestDb();
    if (db.skip) return;

    const pg = require('../src/lib/db');
    const { applyLoginLocaleChoice } = require('../src/lib/apply-login-locale');

    const fam = await pg.query(
      `INSERT INTO family (name, preferred_locale) VALUES ('Alias Test', 'sv-SE') RETURNING id`
    );
    const familyId = fam.rows[0].id;

    const en = await applyLoginLocaleChoice({ familyId, explicitLocale: 'en' });
    assert.equal(en, 'en-GB');

    const sv = await applyLoginLocaleChoice({ familyId, explicitLocale: 'sv' });
    assert.equal(sv, 'sv-SE');

    await pg.query('DELETE FROM family WHERE id = $1', [familyId]);
    await db.cleanup();
  });
});

describe('login locale integration', () => {
  test('explicit sv-SE overrides stale en-GB (scenario A)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    const pg = require('../src/lib/db');
    const { SELECTION_SOURCES } = require('../src/lib/locale-selection');

    try {
      const email = uniqueEmail();
      await fetch(`${http.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Parent A',
          email,
          password: 'testpass123',
          preferred_locale: 'en-GB',
        }),
      });

      const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'testpass123',
          preferred_locale: 'sv-SE',
        }),
      });
      const loginBody = JSON.parse(await loginRes.text());
      assert.equal(loginRes.status, 200);
      assert.equal(loginBody.user.preferred_locale, 'sv-SE');

      const fam = await pg.query(
        `SELECT preferred_locale, locale_selection_source
         FROM family f JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
        [email.toLowerCase()]
      );
      assert.equal(fam.rows[0].preferred_locale, 'sv-SE');
      assert.equal(fam.rows[0].locale_selection_source, SELECTION_SOURCES.LOGIN);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('no preferred_locale in body keeps DB locale (scenario B)', async (t) => {
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
        body: JSON.stringify({
          name: 'Parent B',
          email,
          password: 'testpass123',
          preferred_locale: 'en-GB',
        }),
      });

      await pg.query(
        `UPDATE family SET locale_selection_source = 'registration'
         FROM parent p WHERE p.family_id = family.id AND p.email = $1`,
        [email.toLowerCase()]
      );

      const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'testpass123' }),
      });
      const loginBody = JSON.parse(await loginRes.text());
      assert.equal(loginRes.status, 200);
      assert.equal(loginBody.user.preferred_locale, 'en-GB');

      const fam = await pg.query(
        `SELECT preferred_locale, locale_selection_source
         FROM family f JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
        [email.toLowerCase()]
      );
      assert.equal(fam.rows[0].preferred_locale, 'en-GB');
      assert.equal(fam.rows[0].locale_selection_source, 'registration');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('explicit en-GB overrides sv-SE and enables english_app (scenario C)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    const pg = require('../src/lib/db');
    const { SELECTION_SOURCES } = require('../src/lib/locale-selection');

    try {
      const email = uniqueEmail();
      await fetch(`${http.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Parent C',
          email,
          password: 'testpass123',
        }),
      });

      const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'testpass123',
          preferred_locale: 'en-GB',
        }),
      });
      const loginBody = JSON.parse(await loginRes.text());
      assert.equal(loginRes.status, 200);
      assert.equal(loginBody.user.preferred_locale, 'en-GB');

      const fam = await pg.query(
        `SELECT f.preferred_locale, f.locale_selection_source
         FROM family f JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
        [email.toLowerCase()]
      );
      assert.equal(fam.rows[0].preferred_locale, 'en-GB');
      assert.equal(fam.rows[0].locale_selection_source, SELECTION_SOURCES.LOGIN);

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

  test('invalid preferred_locale is rejected by schema (scenario D)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      const email = uniqueEmail();
      await fetch(`${http.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Parent D', email, password: 'testpass123' }),
      });

      const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'testpass123',
          preferred_locale: 'fr-FR',
        }),
      });
      assert.equal(loginRes.status, 400);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('failed login does not change family locale (scenario F)', async (t) => {
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
        body: JSON.stringify({
          name: 'Parent F',
          email,
          password: 'testpass123',
          preferred_locale: 'en-GB',
        }),
      });

      const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'wrong-password',
          preferred_locale: 'sv-SE',
        }),
      });
      assert.equal(loginRes.status, 401);

      const fam = await pg.query(
        `SELECT preferred_locale, locale_selection_source
         FROM family f JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
        [email.toLowerCase()]
      );
      assert.equal(fam.rows[0].preferred_locale, 'en-GB');
      assert.equal(fam.rows[0].locale_selection_source, 'registration');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('same locale does not rewrite locale_selection_source', async (t) => {
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
        body: JSON.stringify({
          name: 'Parent Same',
          email,
          password: 'testpass123',
          preferred_locale: 'en-GB',
        }),
      });

      await fetch(`${http.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'testpass123',
          preferred_locale: 'en-GB',
        }),
      });

      const fam = await pg.query(
        `SELECT locale_selection_source
         FROM family f JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
        [email.toLowerCase()]
      );
      assert.equal(fam.rows[0].locale_selection_source, 'registration');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
