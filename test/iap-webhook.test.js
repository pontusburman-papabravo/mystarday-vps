'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb, injectMockDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const WEBHOOK_SECRET = 'test-revenuecat-webhook-secret';

function signIapWebhook(body, secret = WEBHOOK_SECRET) {
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64');
  return `Bearer test-key:${sig}`;
}

function buildRenewalPayload(familyId) {
  return JSON.stringify({
    event: {
      type: 'RENEWAL',
      data: {
        attributes: {
          app_user_id: familyId,
        },
      },
    },
  });
}

async function familyIdForSession(db, email) {
  const { rows } = await db.query(
    'SELECT family_id FROM parent WHERE LOWER(email) = $1',
    [email.toLowerCase()]
  );
  return rows[0].family_id;
}

test('IAP webhook: valid HMAC raw body without CSRF returns 200 and updates subscription_status', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_SECRET;

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const familyId = await familyIdForSession(db, session.email);

    await db.query(
      `UPDATE family SET is_lifetime_free = false, subscription_status = 'none' WHERE id = $1`,
      [familyId]
    );

    const body = buildRenewalPayload(familyId);
    const res = await fetch(`${http.baseUrl}/api/iap/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: signIapWebhook(body),
      },
      body,
    });
    const text = await res.text();
    assert.equal(res.status, 200, text);
    assert.deepEqual(JSON.parse(text), { received: true });

    const { rows } = await db.query(
      'SELECT subscription_status FROM family WHERE id = $1',
      [familyId]
    );
    assert.equal(rows[0].subscription_status, 'active');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('IAP webhook: invalid signature returns 401', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_SECRET;

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const body = buildRenewalPayload('00000000-0000-0000-0000-000000000099');
    const res = await fetch(`${http.baseUrl}/api/iap/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key:invalid-signature',
      },
      body,
    });
    assert.equal(res.status, 401);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('IAP webhook: req.body is Buffer so JSON.parse works on raw payload', async () => {
  process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_SECRET;
  injectMockDb();

  const handlerPath = require.resolve('../src/routes/iap-webhook-handler');
  delete require.cache[handlerPath];
  const { handleIapWebhook } = require('../src/routes/iap-webhook-handler');

  const familyId = '00000000-0000-0000-0000-000000000088';
  const body = buildRenewalPayload(familyId);
  const bodyBuffer = Buffer.from(body);

  let statusCode;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  await handleIapWebhook(
    {
      headers: { authorization: signIapWebhook(bodyBuffer) },
      body: bodyBuffer,
    },
    res
  );

  assert.equal(statusCode, 200);
  assert.deepEqual(res.body, { received: true });
  assert.ok(Buffer.isBuffer(bodyBuffer));
});
