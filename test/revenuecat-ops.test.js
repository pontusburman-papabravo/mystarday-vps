'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  authenticateRevenueCatWebhook,
  resolveAuthMode,
} = require('../src/lib/revenuecat-webhook-verify');
const { deriveSubscriptionStatusFromSubscriber } = require('../src/lib/revenuecat-subscriber-sync');

const STATIC = 'Bearer static-secret';
const HMAC_SECRET = 'hmac-signing-secret';

function signHmac(body, secret, ts = Math.floor(Date.now() / 1000)) {
  const crypto = require('crypto');
  const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const signedPayload = Buffer.concat([Buffer.from(`${ts}.`, 'utf8'), bodyBuffer]);
  const v1 = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return { signature: `t=${ts},v1=${v1}`, ts };
}

describe('resolveAuthMode', () => {
  test('defaults to both when both secrets are configured', () => {
    assert.equal(
      resolveAuthMode({ staticSecret: STATIC, signingSecret: HMAC_SECRET }),
      'both'
    );
  });

  test('respects explicit REVENUECAT_WEBHOOK_AUTH_MODE', () => {
    assert.equal(resolveAuthMode({ authMode: 'static' }), 'static');
  });
});

describe('authenticateRevenueCatWebhook auth modes', () => {
  const body = Buffer.from('{"event":{"type":"TEST"}}');

  test('both mode rejects static-only when HMAC is missing', () => {
    const ok = authenticateRevenueCatWebhook(
      { headers: { authorization: STATIC } },
      body,
      { staticSecret: STATIC, signingSecret: HMAC_SECRET, authMode: 'both' }
    );
    assert.equal(ok, false);
  });

  test('both mode accepts when static and HMAC verify', () => {
    const { signature } = signHmac(body, HMAC_SECRET);
    const ok = authenticateRevenueCatWebhook(
      {
        headers: {
          authorization: STATIC,
          'x-revenuecat-webhook-signature': signature,
        },
      },
      body,
      { staticSecret: STATIC, signingSecret: HMAC_SECRET, authMode: 'both' }
    );
    assert.equal(ok, true);
  });

  test('static mode ignores missing HMAC header', () => {
    const ok = authenticateRevenueCatWebhook(
      { headers: { authorization: STATIC } },
      body,
      { staticSecret: STATIC, signingSecret: HMAC_SECRET, authMode: 'static' }
    );
    assert.equal(ok, true);
  });
});

describe('deriveSubscriptionStatusFromSubscriber', () => {
  test('active entitlement with future expiry maps to active', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const status = deriveSubscriptionStatusFromSubscriber({
      entitlements: {
        basic: { expires_date: future, product_identifier: 'prod.basic' },
      },
      subscriptions: {},
    });
    assert.equal(status, 'active');
  });

  test('expired entitlement maps to expired', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const status = deriveSubscriptionStatusFromSubscriber({
      entitlements: {
        basic: { expires_date: past, product_identifier: 'prod.basic' },
      },
      subscriptions: {},
    });
    assert.equal(status, 'expired');
  });
});
