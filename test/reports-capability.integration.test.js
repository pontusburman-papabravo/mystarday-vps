'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const familySubscriptions = require('../db/family-subscriptions');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function familyIdForEmail(db, email) {
  const { rows } = await db.query(
    'SELECT family_id FROM parent WHERE LOWER(email) = $1',
    [email.toLowerCase()]
  );
  return rows[0].family_id;
}

async function ensureReportingFeatureLive(db) {
  await db.query(
    `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
     VALUES ('klinisk_rapportering', 'Klinisk rapportering', 'Reports', 'live', '{}', 0, 1, 0)
     ON CONFLICT (slug) DO UPDATE SET status = 'live'`
  );
}

test('reports option B: no reporting component redirects /reports and blocks API', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const familyId = await familyIdForEmail(db, session.email);
    const hasReporting = await familySubscriptions.hasComponent(familyId, 'reporting');
    assert.equal(hasReporting, false, 'fresh trial family should lack reporting');

    const pageRes = await fetch(`${http.baseUrl}/reports`, {
      redirect: 'manual',
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    assert.equal(pageRes.status, 302, await pageRes.text());
    const location = pageRes.headers.get('location') || '';
    assert.match(location, /\/upgrade/);
    assert.match(location, /component=reporting/);

    const apiRes = await fetch(`${http.baseUrl}/api/reports`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const apiText = await apiRes.text();
    assert.equal(apiRes.status, 403, apiText);
    const apiBody = JSON.parse(apiText);
    assert.equal(apiBody.code, 'COMPONENT_MISSING');
    assert.equal(apiBody.component, 'reporting');

    const childProfileJs = fs.readFileSync(
      path.join(__dirname, '../public/js/child-profile.js'),
      'utf8'
    );
    assert.match(childProfileJs, /components\.reporting\.has/);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('reports: family with reporting component can load page and list API', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await ensureReportingFeatureLive(db);
    const session = await registerAndLogin(http.baseUrl);
    const familyId = await familyIdForEmail(db, session.email);
    await familySubscriptions.grantComponent(familyId, 'reporting');
    await db.query(
      `INSERT INTO family_features (family_id, feature_slug, enabled_at)
       VALUES ($1, 'klinisk_rapportering', NOW())
       ON CONFLICT (family_id, feature_slug) DO NOTHING`,
      [familyId]
    );

    const pageRes = await fetch(`${http.baseUrl}/reports`, {
      redirect: 'manual',
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    assert.equal(pageRes.status, 200, `expected HTML 200, got ${pageRes.status}`);
    const html = await pageRes.text();
    assert.match(html, /reports\.html|reportsMain|Rapporter/i);

    const apiRes = await fetch(`${http.baseUrl}/api/reports/active-count`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const apiText = await apiRes.text();
    assert.notEqual(apiRes.status, 403, apiText);
    const apiBody = JSON.parse(apiText);
    assert.ok(typeof apiBody.count === 'number');
  } finally {
    await http.close();
    await db.cleanup();
  }
});
