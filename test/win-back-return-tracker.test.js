'use strict';

/**
 * N7 — win-back attribution (`win_back_email_log.returned_at`) must only be set
 * from an authenticated request. An unauthenticated POST /api/analytics/event
 * with a spoofed `session_id` (guessed/leaked family_id) must not be able to
 * mark a family as "returned".
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, getSetCookieHeaders, mergeCookies, listenApp } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function familyAndParentId(db, email) {
  const { rows } = await db.query(
    'SELECT id, family_id FROM parent WHERE LOWER(email) = $1',
    [email.toLowerCase()]
  );
  return { parentId: rows[0].id, familyId: rows[0].family_id };
}

async function insertSentWinBackRecord(db, { familyId, parentId }) {
  const { rows } = await db.query(
    `INSERT INTO win_back_email_log
       (family_id, parent_id, parent_email, parent_name, status, sent_at)
     VALUES ($1, $2, 'winback-test@example.com', 'Test Parent', 'sent', NOW() - INTERVAL '1 day')
     RETURNING id`,
    [familyId, parentId]
  );
  return rows[0].id;
}

async function fetchCsrfCookie(baseUrl) {
  const res = await fetch(`${baseUrl}/api/auth/csrf-token`);
  const body = await res.json();
  let cookies = {};
  for (const header of getSetCookieHeaders(res)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { csrfToken: body.csrfToken, cookies };
}

test('win-back attribution: unauthenticated spoofed session_id does not set returned_at', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl, { name: 'Win-back Test' });
    const { parentId, familyId } = await familyAndParentId(db, session.email);
    const logId = await insertSentWinBackRecord(db, { familyId, parentId });

    // Anonymous visitor can fetch a CSRF token without authenticating, then
    // spoof session_id = a family_id they merely know/guessed.
    const { csrfToken, cookies } = await fetchCsrfCookie(http.baseUrl);

    const spoofRes = await fetch(`${http.baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ event_type: 'win_back_landing', session_id: familyId }),
    });
    assert.equal(spoofRes.status, 204);

    const { rows: afterSpoof } = await db.query(
      'SELECT returned_at FROM win_back_email_log WHERE id = $1',
      [logId]
    );
    assert.equal(afterSpoof[0].returned_at, null, 'spoofed unauthenticated request must not set returned_at');

    // The legitimate, authenticated family visiting the same page DOES attribute.
    const authedRes = await fetch(`${http.baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({ event_type: 'win_back_landing' }),
    });
    assert.equal(authedRes.status, 204);

    const { rows: afterAuthed } = await db.query(
      'SELECT returned_at FROM win_back_email_log WHERE id = $1',
      [logId]
    );
    assert.ok(afterAuthed[0].returned_at, 'authenticated request should set returned_at');
  } finally {
    await http.close();
    await db.cleanup();
  }
});
