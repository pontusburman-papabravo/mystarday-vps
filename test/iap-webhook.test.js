'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb, injectMockDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const {
  authenticateRevenueCatWebhook,
  verifyWebhookSignature,
} = require('../src/lib/revenuecat-webhook-verify');
const { resolveSubscriptionStatus } = require('../src/lib/revenuecat-webhook-process');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const WEBHOOK_AUTH = 'Bearer revenuecat-static-webhook-secret';
const SIGNING_SECRET = 'revenuecat-hmac-signing-secret';

function buildEventPayload(overrides = {}) {
  const event = {
    id: overrides.id || `evt_${crypto.randomUUID()}`,
    type: overrides.type || 'RENEWAL',
    app_user_id: overrides.app_user_id,
    original_app_user_id: overrides.original_app_user_id,
    aliases: overrides.aliases,
    expiration_at_ms: overrides.expiration_at_ms,
    environment: 'SANDBOX',
    ...overrides.event,
  };
  if (overrides.type) event.type = overrides.type;
  if (overrides.app_user_id !== undefined) event.app_user_id = overrides.app_user_id;
  if (overrides.id !== undefined) event.id = overrides.id;
  return JSON.stringify({ api_version: '1.0', event });
}

function signHmacWebhook(body, secret = SIGNING_SECRET, timestamp = Math.floor(Date.now() / 1000)) {
  const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const signedPayload = Buffer.concat([Buffer.from(`${timestamp}.`, 'utf8'), bodyBuffer]);
  const sig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return {
    authorization: WEBHOOK_AUTH,
    signature: `t=${timestamp},v1=${sig}`,
  };
}

function loadHandler(clearDbCache = false) {
  const handlerPath = require.resolve('../src/routes/iap-webhook-handler');
  delete require.cache[handlerPath];
  delete require.cache[require.resolve('../src/lib/revenuecat-webhook-process')];
  delete require.cache[require.resolve('../src/lib/revenuecat-webhook-verify')];
  if (clearDbCache) {
    delete require.cache[require.resolve('../src/lib/db')];
  }
  return require('../src/routes/iap-webhook-handler').handleIapWebhook;
}

async function invokeHandler(req, res) {
  const handleIapWebhook = loadHandler();
  await handleIapWebhook(req, res);
}

function makeRes() {
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
    get statusCode() { return statusCode; },
  };
  return res;
}

async function seedTestFamily(db, { subscriptionStatus = 'active', rcCustomerId = null } = {}) {
  const familyId = crypto.randomUUID();
  await db.query(
    `INSERT INTO family (id, name, is_lifetime_free, subscription_status, rc_customer_id)
     VALUES ($1, 'Webhook Test Family', false, $2, $3)`,
    [familyId, subscriptionStatus, rcCustomerId]
  );
  return familyId;
}

describe('revenuecat-webhook-verify', () => {
  test('static Authorization header matches configured secret', () => {
    assert.equal(
      authenticateRevenueCatWebhook(
        { headers: { authorization: WEBHOOK_AUTH } },
        Buffer.from('{}'),
        { staticSecret: WEBHOOK_AUTH }
      ),
      true
    );
  });

  test('HMAC signature validates raw body', () => {
    const body = Buffer.from('{"event":{"type":"TEST"}}');
    const ts = Math.floor(Date.now() / 1000);
    assert.equal(
      verifyWebhookSignature(
        body,
        signHmacWebhook(body, SIGNING_SECRET, ts).signature,
        SIGNING_SECRET
      ),
      true
    );
  });
});

describe('resolveSubscriptionStatus', () => {
  const future = Date.now() + 86_400_000;
  const past = Date.now() - 86_400_000;

  test('CANCELLATION with future expiration keeps active access', () => {
    assert.equal(resolveSubscriptionStatus('CANCELLATION', future), 'active');
  });

  test('EXPIRATION revokes access', () => {
    assert.equal(resolveSubscriptionStatus('EXPIRATION', past), 'expired');
  });
});

test('IAP webhook: valid static auth updates subscription_status', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;
  delete process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const familyId = await seedTestFamily(db, { subscriptionStatus: 'none' });

    const body = buildEventPayload({ type: 'RENEWAL', app_user_id: familyId });
    const res = await fetch(`${http.baseUrl}/api/iap/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: WEBHOOK_AUTH,
      },
      body,
    });
    assert.equal(res.status, 200);
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

test('IAP webhook: invalid authentication returns 401', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const body = buildEventPayload({
      app_user_id: '00000000-0000-4000-8000-000000000099',
    });
    const res = await fetch(`${http.baseUrl}/api/iap/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer wrong-secret',
      },
      body,
    });
    assert.equal(res.status, 401);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('IAP webhook: missing event returns 400', async () => {
  process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;
  const mock = injectMockDb();

  const body = JSON.stringify({ api_version: '1.0' });
  const res = makeRes();
  try {
    await invokeHandler(
      { headers: { authorization: WEBHOOK_AUTH }, body: Buffer.from(body) },
      res
    );
    assert.equal(res.statusCode, 400);
  } finally {
    mock.restore();
  }
});

test('IAP webhook: missing user identity returns 400', async () => {
  process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;
  const mock = injectMockDb();

  const body = JSON.stringify({
    api_version: '1.0',
    event: { id: 'evt-no-user', type: 'RENEWAL' },
  });
  const res = makeRes();
  try {
    await invokeHandler(
      { headers: { authorization: WEBHOOK_AUTH }, body: Buffer.from(body) },
      res
    );
    assert.equal(res.statusCode, 400);
  } finally {
    mock.restore();
  }
});

test('IAP webhook: duplicate event ID returns 200 without double update', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const familyId = await seedTestFamily(db, { subscriptionStatus: 'none' });

    const eventId = `evt_dup_${crypto.randomUUID()}`;
    const body = buildEventPayload({
      id: eventId,
      type: 'RENEWAL',
      app_user_id: familyId,
    });
    const headers = {
      'Content-Type': 'application/json',
      Authorization: WEBHOOK_AUTH,
    };

    const first = await fetch(`${http.baseUrl}/api/iap/webhook`, {
      method: 'POST',
      headers,
      body,
    });
    assert.equal(first.status, 200);

    await db.query(
      `UPDATE family SET subscription_status = 'expired' WHERE id = $1`,
      [familyId]
    );

    const second = await fetch(`${http.baseUrl}/api/iap/webhook`, {
      method: 'POST',
      headers,
      body,
    });
    assert.equal(second.status, 200);
    const secondJson = await second.json();
    assert.equal(secondJson.duplicate, true);

    const { rows } = await db.query(
      'SELECT subscription_status FROM family WHERE id = $1',
      [familyId]
    );
    assert.equal(rows[0].subscription_status, 'expired');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('IAP webhook: database failure returns 503', async () => {
  process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;
  const mock = injectMockDb();
  mock.setQuery(async (sql, params) => {
    if (String(sql).includes('FROM family WHERE id')) {
      return {
        rows: [{
          id: params[0],
          is_lifetime_free: false,
          subscription_status: 'none',
          rc_customer_id: null,
        }],
      };
    }
    if (String(sql).includes('INSERT INTO iap_webhook_log')) {
      throw new Error('simulated db outage');
    }
    return { rows: [] };
  });

  const familyId = crypto.randomUUID();
  const body = buildEventPayload({
    id: `evt_db_fail_${crypto.randomUUID()}`,
    type: 'RENEWAL',
    app_user_id: familyId,
  });
  const res = makeRes();
  try {
    await invokeHandler(
      { headers: { authorization: WEBHOOK_AUTH }, body: Buffer.from(body) },
      res
    );
    assert.equal(res.statusCode, 503);
  } finally {
    mock.restore();
  }
});

test('IAP webhook: CANCELLATION does not remove unexpired access', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const familyId = await seedTestFamily(db, { subscriptionStatus: 'active' });

    const body = buildEventPayload({
      type: 'CANCELLATION',
      app_user_id: familyId,
      expiration_at_ms: Date.now() + 7 * 86_400_000,
    });
    const res = await fetch(`${http.baseUrl}/api/iap/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: WEBHOOK_AUTH,
      },
      body,
    });
    assert.equal(res.status, 200);
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

test('IAP webhook: EXPIRATION removes access', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const familyId = await seedTestFamily(db, { subscriptionStatus: 'active' });

    const body = buildEventPayload({
      type: 'EXPIRATION',
      app_user_id: familyId,
      expiration_at_ms: Date.now() - 1000,
    });
    const res = await fetch(`${http.baseUrl}/api/iap/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: WEBHOOK_AUTH,
      },
      body,
    });
    assert.equal(res.status, 200);
    const { rows } = await db.query(
      'SELECT subscription_status FROM family WHERE id = $1',
      [familyId]
    );
    assert.equal(rows[0].subscription_status, 'expired');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('IAP webhook: original_app_user_id alias resolves family', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const familyId = await seedTestFamily(db, { subscriptionStatus: 'none' });
    const aliasId = crypto.randomUUID();
    await db.query(
      'UPDATE family SET rc_customer_id = $2 WHERE id = $1',
      [familyId, aliasId]
    );

    const body = buildEventPayload({
      type: 'RENEWAL',
      app_user_id: aliasId,
      original_app_user_id: familyId,
    });
    const res = await fetch(`${http.baseUrl}/api/iap/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: WEBHOOK_AUTH,
      },
      body,
    });
    assert.equal(res.status, 200);
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

test('IAP webhook: does not log secrets or full payload', async () => {
  process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;
  const mock = injectMockDb();

  const logs = [];
  const origError = console.error;
  const origLog = console.log;
  const origWarn = console.warn;
  console.error = (...args) => logs.push(args.join(' '));
  console.log = (...args) => logs.push(args.join(' '));
  console.warn = (...args) => logs.push(args.join(' '));

  try {
    const body = buildEventPayload({
      app_user_id: '00000000-0000-4000-8000-000000000077',
    });
    const res = makeRes();
    await invokeHandler(
      {
        headers: { authorization: 'Bearer wrong-secret' },
        body: Buffer.from(body),
      },
      res
    );
    assert.equal(res.statusCode, 401);
    const joined = logs.join('\n');
    assert.doesNotMatch(joined, /revenuecat-static-webhook-secret/);
    assert.doesNotMatch(joined, /subscriber_attributes/);
    assert.doesNotMatch(joined, /"app_user_id":"00000000/);
  } finally {
    console.error = origError;
    console.log = origLog;
    console.warn = origWarn;
    mock.restore();
  }
});

test('IAP webhook: HMAC auth path accepts valid signature', async () => {
  delete process.env.REVENUECAT_WEBHOOK_SECRET;
  process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET = SIGNING_SECRET;
  const mock = injectMockDb();
  mock.setQuery(async (sql, params) => {
    if (String(sql).includes('FROM family WHERE id')) {
      return {
        rows: [{
          id: params[0],
          is_lifetime_free: true,
          subscription_status: 'active',
          rc_customer_id: null,
        }],
      };
    }
    return { rows: [], rowCount: 0 };
  });

  const familyId = crypto.randomUUID();
  const body = buildEventPayload({
    type: 'RENEWAL',
    app_user_id: familyId,
  });
  const bodyBuffer = Buffer.from(body);
  const { signature } = signHmacWebhook(bodyBuffer);

  const res = makeRes();
  try {
    await invokeHandler(
      {
        headers: {
          authorization: WEBHOOK_AUTH,
          'x-revenuecat-webhook-signature': signature,
        },
        body: bodyBuffer,
      },
      res
    );
    assert.equal(res.statusCode, 200);
  } finally {
    mock.restore();
    delete process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;
  }
});
