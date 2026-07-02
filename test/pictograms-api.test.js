'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const { listPictogramsForApi } = require('../config/pictogram-library');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

test('GET /api/pictograms requires parent session', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const anon = await fetch(`${http.baseUrl}/api/pictograms`);
    assert.equal(anon.status, 401);

    const session = await registerAndLogin(http.baseUrl);
    const res = await fetch(`${http.baseUrl}/api/pictograms`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length >= 80);
    const brush = body.find((p) => p.key === 'brush_teeth');
    assert.ok(brush);
    assert.equal(brush.label, 'Borsta tänder');
    assert.equal(brush.emoji, '🪥');
    assert.match(brush.url, /brush_teeth/);
    assert.deepEqual(body.map((p) => p.key).sort(), listPictogramsForApi().map((p) => p.key).sort());
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('POST /api/activities validates icon_key and round-trips save', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);

    const badRes = await fetch(`${http.baseUrl}/api/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({ name: 'Ogiltig bild', icon: '📌', icon_key: 'does_not_exist' }),
    });
    assert.equal(badRes.status, 400);
    const badBody = await badRes.json();
    assert.match(badBody.error, /bildnyckel/i);

    const goodRes = await fetch(`${http.baseUrl}/api/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({ name: 'Borsta', icon: '📌', icon_key: 'brush_teeth', star_value: 1 }),
    });
    const created = await goodRes.json();
    assert.equal(goodRes.status, 201);
    assert.equal(created.icon_key, 'brush_teeth');
    assert.equal(created.pictogram_emoji, '🪥');

    const listRes = await fetch(`${http.baseUrl}/api/activities`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const activities = await listRes.json();
    const saved = activities.find((a) => a.id === created.id);
    assert.ok(saved);
    assert.equal(saved.icon_key, 'brush_teeth');
    assert.equal(saved.pictogram_emoji, '🪥');

    const photoRes = await fetch(`${http.baseUrl}/api/activities/${created.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({ image_url: 'https://mystarday.se/uploads/family/test.jpg' }),
    });
    const withPhoto = await photoRes.json();
    assert.equal(photoRes.status, 200);
    assert.equal(withPhoto.image_url, 'https://mystarday.se/uploads/family/test.jpg');
    assert.equal(withPhoto.pictogram_emoji, undefined);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
