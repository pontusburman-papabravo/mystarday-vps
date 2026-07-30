'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function deleteAccount(http, session) {
  const res = await fetch(`${http.baseUrl}/api/family/delete-account`, {
    method: 'DELETE',
    headers: {
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : {} };
}

describe('family delete-account integration', () => {
  test('DELETE /api/family/delete-account removes family and invalidates login', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      const session = await registerAndLogin(http.baseUrl, { name: 'Delete Me Parent' });
      const parentBefore = await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email]);
      const familyId = parentBefore.rows[0].family_id;

      await createChild(http.baseUrl, session, { name: 'Delete Kid', emoji: '⭐', pin: '8642' });

      const del = await deleteAccount(http, session);
      assert.equal(del.status, 200);
      assert.equal(del.body.success, true);

      const parentAfter = await db.query('SELECT 1 FROM parent WHERE email = $1', [session.email]);
      assert.equal(parentAfter.rowCount, 0);
      const familyAfter = await db.query('SELECT 1 FROM family WHERE id = $1', [familyId]);
      assert.equal(familyAfter.rowCount, 0);
      const childAfter = await db.query('SELECT 1 FROM child WHERE family_id = $1', [familyId]);
      assert.equal(childAfter.rowCount, 0);

      const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email, password: session.password }),
      });
      assert.equal(loginRes.status, 401);
      const loginBody = await loginRes.json();
      assert.equal(loginBody.code, 'INVALID_CREDENTIALS');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('delete-account succeeds when pin_notification_log table is absent (prod drift)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const hadTable = await db.query(
      `SELECT to_regclass('public.pin_notification_log') IS NOT NULL AS exists`
    );
    const tableExisted = hadTable.rows[0].exists;
    if (tableExisted) {
      await db.query('DROP TABLE pin_notification_log CASCADE');
    }

    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      const session = await registerAndLogin(http.baseUrl, { name: 'No Pin Log Parent' });
      const del = await deleteAccount(http, session);
      assert.equal(del.status, 200, del.body);

      const parentAfter = await db.query('SELECT 1 FROM parent WHERE email = $1', [session.email]);
      assert.equal(parentAfter.rowCount, 0);
    } finally {
      await http.close();
      if (tableExisted) {
        const { execSync } = require('child_process');
        const path = require('path');
        execSync('npm run migrate', {
          cwd: path.join(__dirname, '..'),
          env: process.env,
          stdio: 'pipe',
        });
      }
      await db.cleanup();
    }
  });
});

describe('family-account-deletion module', () => {
  it('marks pin_notification_log as optional child-scoped table', () => {
    const mod = require('../src/lib/family-account-deletion');
    assert.ok(mod.OPTIONAL_CHILD_SCOPED_TABLES.has('pin_notification_log'));
  });
});
