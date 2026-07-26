'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, getSetCookieHeaders, listenApp, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function enableJourneyContextApi(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ('family_journey_context_api', true, 'route-scope test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`
  );
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ('family_journey_registry_v2', true, 'route-scope test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`
  );
}

test('journey-context mount order: parent GET /api/me/journey-context is not blocked by child routers', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  await enableJourneyContextApi(db);
  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const res = await fetch(`${http.baseUrl}/api/me/journey-context`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const text = await res.text();
    assert.notEqual(res.status, 403, `parent should not get child-auth 403: ${text}`);
    assert.doesNotMatch(text, /kräver barninloggning/i, text);
    if (res.status === 200) {
      const body = JSON.parse(text);
      assert.ok(body.phase, 'expected journey phase in context');
    } else {
      assert.equal(res.status, 503, text);
    }
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('index.js mounts journey-context before childSelfRouter', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/routes/index.js'), 'utf8');
  const journeyIdx = src.indexOf("require('./journey-context')");
  const childIdx = src.indexOf("require('./daily-logs').childSelfRouter");
  assert.ok(journeyIdx > 0 && childIdx > 0, 'expected both mounts in index.js');
  assert.ok(journeyIdx < childIdx, 'journey-context must mount before childSelfRouter');
});

test('journey-context registry returns en-GB experience copy for English family', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  await enableJourneyContextApi(db);
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    const session = await registerAndLogin(http.baseUrl);
    const fam = await pg.query(
      `SELECT f.id FROM family f
       JOIN parent p ON p.family_id = f.id
       WHERE p.email = $1`,
      [session.email.toLowerCase()]
    );
    await pg.query('UPDATE family SET preferred_locale = $1 WHERE id = $2', ['en-GB', fam.rows[0].id]);

    const res = await fetch(`${http.baseUrl}/api/me/journey-context/registry`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const text = await res.text();
    assert.equal(res.status, 200, text);
    const registry = JSON.parse(text);
    const handoff = registry?.phases?.FIRST_USE?.handoff_to_child
      || registry?.phases?.BUILDING_ROUTINE?.handoff_to_child;
    assert.ok(handoff?.headline, 'expected handoff experience in registry');
    assert.doesNotMatch(handoff.headline, /[åäöÅÄÖ]/, handoff.headline);
    assert.doesNotMatch(handoff.cta || '', /[åäöÅÄÖ]/, handoff.cta);
    assert.match(handoff.headline, /child|routine/i, handoff.headline);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
