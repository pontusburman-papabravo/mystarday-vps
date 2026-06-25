'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { listenApp } = require('./helpers/http.js');

const WEBHOOK_SECRET = 'test-revenuecat-webhook-secret-32chars';

function signPayload(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64');
}

describe('IAP webhook (K1)', () => {
  it('is mounted before express.json with express.raw (same pattern as Resend)', () => {
    const src = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
    const jsonIdx = src.indexOf('app.use(express.json())');
    const iapIdx = src.indexOf("'/api/iap/webhook'");
    assert.ok(iapIdx > -1, 'IAP webhook route must exist in app.js');
    assert.ok(jsonIdx > -1, 'express.json must exist in app.js');
    assert.ok(iapIdx < jsonIdx, 'IAP webhook must be registered before express.json()');
    assert.match(src, /express\.raw\(\{ type: 'application\/json' \}\)/);
  });

  it('accepts valid HMAC and is not blocked by CSRF', async () => {
    process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_SECRET;
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const payload = JSON.stringify({
        event: { type: 'RENEWAL', data: { attributes: { app_user_id: '00000000-0000-0000-0000-000000000099' } } },
      });
      const sig = signPayload(WEBHOOK_SECRET, payload);

      const res = await fetch(`${http.baseUrl}/api/iap/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer rc_api_key:${sig}`,
        },
        body: payload,
      });

      const body = await res.json();
      assert.notEqual(body.code, 'CSRF_MISSING', 'external webhook must bypass CSRF middleware');
      assert.notEqual(res.status, 401, 'valid HMAC must not be rejected');
      assert.equal(body.received, true);
    } finally {
      await http.close();
    }
  });

  it('rejects invalid HMAC (not CSRF)', async () => {
    process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_SECRET;
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const payload = JSON.stringify({ event: { type: 'RENEWAL' } });
      const validSig = signPayload(WEBHOOK_SECRET, payload);
      const invalidSig = validSig.slice(0, -1) + (validSig.endsWith('A') ? 'B' : 'A');

      const res = await fetch(`${http.baseUrl}/api/iap/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer rc_api_key:${invalidSig}`,
        },
        body: payload,
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.notEqual(body.code, 'CSRF_MISSING');
    } finally {
      await http.close();
    }
  });
});
