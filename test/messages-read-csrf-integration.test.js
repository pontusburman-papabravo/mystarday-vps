'use strict';

/**
 * Integration: PUT /api/messages/:id/read + CSRF contract.
 * Requires real Postgres (skips on mock DATABASE_URL).
 *
 * Client CSRF flow: docs/messages-csrf.md
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const csrfSrc = fs.readFileSync(path.join(__dirname, '../src/middleware/csrf.js'), 'utf8');
const messagesCsrfExempt = csrfSrc.includes("'/messages/'");

async function insertSystemMessage(db, familyId, text) {
  const result = await db.query(
    `INSERT INTO system_messages (family_id, message) VALUES ($1, $2) RETURNING id`,
    [familyId, text]
  );
  return result.rows[0].id;
}

test('messages read flow: unread → mark read → gone from unread list', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const parent = await db.query(
      'SELECT id, family_id FROM parent WHERE LOWER(email) = $1',
      [session.email.toLowerCase()]
    );
    const familyId = parent.rows[0].family_id;
    const messageId = await insertSystemMessage(db, familyId, 'G4e integration test message');

    const unreadRes = await fetch(`${http.baseUrl}/api/messages/unread`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const unreadText = await unreadRes.text();
    assert.equal(unreadRes.status, 200, unreadText);
    const unread = JSON.parse(unreadText);
    assert.ok(unread.some((m) => m.id === messageId), 'message should appear in unread list');

    const readRes = await fetch(`${http.baseUrl}/api/messages/${messageId}/read`, {
      method: 'PUT',
      headers: {
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
    });
    const readText = await readRes.text();
    assert.equal(readRes.status, 200, readText);
    const readBody = JSON.parse(readText);
    assert.equal(readBody.success, true);

    const unreadAfter = await fetch(`${http.baseUrl}/api/messages/unread`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const unreadAfterText = await unreadAfter.text();
    assert.equal(unreadAfter.status, 200, unreadAfterText);
    const listAfter = JSON.parse(unreadAfterText);
    assert.ok(!listAfter.some((m) => m.id === messageId), 'dismissed message should not reappear');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('PUT /api/messages/:id/read without CSRF header is rejected when enforced', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  if (messagesCsrfExempt) {
    t.skip('messages routes still CSRF-exempt in csrf.js — remove in D4');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const parent = await db.query(
      'SELECT family_id FROM parent WHERE LOWER(email) = $1',
      [session.email.toLowerCase()]
    );
    const messageId = await insertSystemMessage(db, parent.rows[0].family_id, 'CSRF negative test');

    const noCsrfRes = await fetch(`${http.baseUrl}/api/messages/${messageId}/read`, {
      method: 'PUT',
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const noCsrfText = await noCsrfRes.text();
    assert.equal(noCsrfRes.status, 403, noCsrfText);
    const noCsrfBody = JSON.parse(noCsrfText);
    assert.equal(noCsrfBody.code, 'CSRF_MISSING');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('PUT /api/messages/:id/read with wrong CSRF token is rejected when enforced', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  if (messagesCsrfExempt) {
    t.skip('messages routes still CSRF-exempt in csrf.js — remove in D4');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const parent = await db.query(
      'SELECT family_id FROM parent WHERE LOWER(email) = $1',
      [session.email.toLowerCase()]
    );
    const messageId = await insertSystemMessage(db, parent.rows[0].family_id, 'CSRF invalid test');

    const badCsrfRes = await fetch(`${http.baseUrl}/api/messages/${messageId}/read`, {
      method: 'PUT',
      headers: {
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': 'deadbeef'.repeat(8),
      },
    });
    const badCsrfText = await badCsrfRes.text();
    assert.equal(badCsrfRes.status, 403, badCsrfText);
    const badCsrfBody = JSON.parse(badCsrfText);
    assert.equal(badCsrfBody.code, 'CSRF_INVALID');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('dashboard client sends X-CSRF-Token on message dismiss', () => {
  const src = fs.readFileSync(path.join(__dirname, '../public/js/dashboard-system-messages.js'), 'utf8');
  assert.match(src, /\/api\/messages\/' \+ id \+ '\/read/);
  assert.match(src, /X-CSRF-Token/);
  assert.match(src, /csrf_token/);
});
