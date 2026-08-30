'use strict';

/**
 * E2 — Notiser archive is parent-scoped, 7-day, and hides revoked child rows.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function authFetch(baseUrl, session, urlPath) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    headers: {
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function insertArchiveRow(db, { parentId, title, childId = null, daysAgo = 0, isRead = false }) {
  await db.query(
    `INSERT INTO notification_log (parent_id, title, body, type, url, metadata, is_read, created_at)
     VALUES ($1, $2, $3, 'reminder', '/', $4::jsonb, $5, NOW() - ($6 * INTERVAL '1 day'))`,
    [
      parentId,
      title,
      title,
      JSON.stringify(childId ? { child_id: childId } : {}),
      isRead,
      daysAgo,
    ]
  );
}

describe('E2 Notiser archive integration', () => {
  test('parent scope, 7-day window, and revoked child rows stay hidden', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real TEST_DATABASE_URL');
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const parentA = await registerAndLogin(http.baseUrl, { name: 'E2 Parent A' });
      const parentB = await registerAndLogin(http.baseUrl, { name: 'E2 Parent B' });
      const childA = await createChild(http.baseUrl, parentA, { name: 'E2 A', birthday: '2018-03-01' });
      const childB = await createChild(http.baseUrl, parentB, { name: 'E2 B', birthday: '2018-04-01' });

      const parentARow = await db.query('SELECT id FROM parent WHERE email = $1', [parentA.email]);
      const parentBRow = await db.query('SELECT id FROM parent WHERE email = $1', [parentB.email]);
      const parentAId = parentARow.rows[0] && parentARow.rows[0].id;
      const parentBId = parentBRow.rows[0] && parentBRow.rows[0].id;
      assert.ok(parentAId && parentBId);

      await insertArchiveRow(db, { parentId: parentAId, title: 'A-family-news' });
      await insertArchiveRow(db, { parentId: parentAId, title: 'A-child', childId: childA });
      await insertArchiveRow(db, { parentId: parentAId, title: 'A-too-old', childId: childA, daysAgo: 8 });
      await insertArchiveRow(db, { parentId: parentBId, title: 'B-child', childId: childB });

      const listed = await authFetch(http.baseUrl, parentA, '/api/notifications');
      assert.equal(listed.res.status, 200, listed.text);
      assert.ok(Array.isArray(listed.json));
      const titles = listed.json.map((row) => row.title).sort();
      assert.deepEqual(titles, ['A-child', 'A-family-news']);
      assert.ok(listed.json.every((row) => !('metadata' in row)));

      const unread = await authFetch(http.baseUrl, parentA, '/api/notifications/unread-count');
      assert.equal(unread.res.status, 200, unread.text);
      assert.equal(unread.json.count, 2);

      await db.query(
        `UPDATE parent_child SET revoked_at = NOW()
         WHERE parent_id = $1 AND child_id = $2`,
        [parentAId, childA]
      );

      const afterRevoke = await authFetch(http.baseUrl, parentA, '/api/notifications');
      assert.equal(afterRevoke.res.status, 200, afterRevoke.text);
      assert.deepEqual(afterRevoke.json.map((row) => row.title), ['A-family-news']);
      const unreadAfter = await authFetch(http.baseUrl, parentA, '/api/notifications/unread-count');
      assert.equal(unreadAfter.json.count, 1);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
