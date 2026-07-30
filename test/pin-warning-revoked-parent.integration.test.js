'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'true';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

test('PIN warning email targets active parent, not revoked primary', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const pinHash = await hashPassword('9999');
  const revokedEmail = `revoked-primary-pin-${Date.now()}@example.com`;
  const activeEmail = `active-shared-pin-${Date.now()}@example.com`;
  const passwordHash = await hashPassword('parent-pass-pin-warn');

  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('PIN warn', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;

  const primaryRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
     VALUES ($1, $2, $3, 'Revoked primary', true, true) RETURNING id`,
    [revokedEmail, passwordHash, familyId]
  );
  const sharedRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
     VALUES ($1, $2, $3, 'Active shared', true, true) RETURNING id`,
    [activeEmail, passwordHash, familyId]
  );
  const childRes = await db.query(
    `INSERT INTO child (family_id, name, username, pin, emoji) VALUES ($1, 'Barn', 'pin_warn_child', $2, '⭐') RETURNING id`,
    [familyId, pinHash]
  );
  const childId = childRes.rows[0].id;

  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary'), ($3, $2, 'shared')`,
    [primaryRes.rows[0].id, childId, sharedRes.rows[0].id]
  );

  await db.query(
    `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $1 WHERE parent_id = $2 AND child_id = $3`,
    [sharedRes.rows[0].id, primaryRes.rows[0].id, childId]
  );

  let capturedTo = null;
  const pinLockout = require('../db/pin-lockout');
  const origRecordNotification = pinLockout.recordNotification;
  const origCooldown = pinLockout.isEmailCooldownActive;
  pinLockout.recordNotification = async () => {};
  pinLockout.isEmailCooldownActive = async () => false;

  const emailPath = require.resolve('../src/lib/email');
  delete require.cache[emailPath];
  const emailMod = require('../src/lib/email');
  const originalSend = emailMod.sendPinWarningEmail;
  emailMod.sendPinWarningEmail = async (to, childName, locale) => {
    capturedTo = to;
    return { success: true, provider: 'test_stub' };
  };

  delete require.cache[require.resolve('../app')];
  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${http.baseUrl}/api/auth/child-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'pin_warn_child', pin: '0000' }),
      });
      assert.equal(res.status, 401, `attempt ${i + 1}`);
    }
    assert.equal(capturedTo, activeEmail);
    assert.notEqual(capturedTo, revokedEmail);
  } finally {
    pinLockout.recordNotification = origRecordNotification;
    pinLockout.isEmailCooldownActive = origCooldown;
    emailMod.sendPinWarningEmail = originalSend;
    await http.close();
    await db.cleanup();
  }
});
