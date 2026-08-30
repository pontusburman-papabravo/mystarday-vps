'use strict';

/**
 * E2 — native send result semantics.
 * Archive is allowed only after at least one actual successful delivery.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('crypto');
const { sendAPNs, sendFCM, sendPushNotification } = require('../src/lib/push-notifications');

const PARENT_ID = '11111111-1111-4111-8111-111111111111';
const PAYLOAD = { title: 'E2 title', body: 'E2 body', url: '/', type: 'general' };

function p256Pem() {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return privateKey.export({ type: 'pkcs8', format: 'pem' });
}

function configuredApnsEnv(overrides = {}) {
  return {
    APNS_KEY_ID: 'KEYID12345',
    APNS_TEAM_ID: 'TEAMID1234',
    APNS_KEY_CONTENT: p256Pem(),
    APNS_BUNDLE_ID: 'com.example.app',
    ...overrides,
  };
}

function createHttp2Mock({ status = 200, error = null, timeout = false, body = '{"reason":"Unregistered"}' } = {}) {
  const calls = [];
  return {
    calls,
    connect(url) {
      calls.push({ url });
      const client = {
        close() { this.closed = true; },
        request(headers) {
          calls.push({ headers });
          const listeners = {};
          const req = {
            on(event, fn) {
              listeners[event] = listeners[event] || [];
              listeners[event].push(fn);
              return req;
            },
            emit(event, ...args) {
              (listeners[event] || []).forEach((fn) => fn(...args));
            },
            end(payload) {
              calls.push({ payload });
              if (error) {
                queueMicrotask(() => req.emit('error', error));
                return;
              }
              if (timeout) return;
              queueMicrotask(() => {
                req.emit('response', { ':status': status });
                if (status !== 200) {
                  queueMicrotask(() => {
                    req.emit('data', Buffer.from(body));
                    req.emit('end');
                  });
                }
              });
            },
            setTimeout(_ms, cb) {
              if (timeout) queueMicrotask(cb);
            },
            destroy() { calls.push({ destroyed: true }); },
          };
          return req;
        },
      };
      return client;
    },
  };
}

const NOOP_SUBSCRIPTIONS = {
  async deleteNativeSubscriptionByToken() {},
  async deleteExpiredNativeSubscription() {},
};

async function sendWithArchive(deps) {
  const archived = [];
  const result = await sendPushNotification(PARENT_ID, PAYLOAD, {
    logNotification: async (parentId, payload) => {
      archived.push({ parentId, payload });
    },
    pushSubscriptions: NOOP_SUBSCRIPTIONS,
    ...deps,
  });
  await Promise.resolve();
  return { result, archived };
}

describe('E2 native delivery result contract', () => {
  describe('sendAPNs', () => {
    it('returns not_configured when key or real team id is missing', async () => {
      const missingKey = await sendAPNs('token-apns', PAYLOAD, {
        env: { APNS_TEAM_ID: 'TEAMID1234' },
      });
      assert.deepEqual(missingKey, { delivered: false, reason: 'not_configured' });

      const missingTeam = await sendAPNs('token-apns', PAYLOAD, {
        env: { APNS_KEY_ID: 'KEYID12345' },
      });
      assert.deepEqual(missingTeam, { delivered: false, reason: 'not_configured' });

      const placeholderTeam = await sendAPNs('token-apns', PAYLOAD, {
        env: { APNS_KEY_ID: 'KEYID12345', APNS_TEAM_ID: '[REDACTED]' },
      });
      assert.deepEqual(placeholderTeam, { delivered: false, reason: 'not_configured' });
    });

    it('returns not_configured when key material is missing or unreadable', async () => {
      const noKey = await sendAPNs('token-apns', PAYLOAD, {
        env: { APNS_KEY_ID: 'KEYID12345', APNS_TEAM_ID: 'TEAMID1234' },
      });
      assert.deepEqual(noKey, { delivered: false, reason: 'not_configured' });

      const unread = await sendAPNs('token-apns', PAYLOAD, {
        env: {
          APNS_KEY_ID: 'KEYID12345',
          APNS_TEAM_ID: 'TEAMID1234',
          APNS_KEY_PATH: '/tmp/missing-apns.p8',
        },
        fs: {
          readFileSync() { throw new Error('ENOENT'); },
        },
      });
      assert.deepEqual(unread, { delivered: false, reason: 'not_configured' });
    });

    it('returns delivered true only after APNs HTTP 200', async () => {
      const http2 = createHttp2Mock({ status: 200 });
      const result = await sendAPNs('abcd1234efgh5678', PAYLOAD, {
        env: configuredApnsEnv(),
        http2,
      });
      assert.deepEqual(result, { delivered: true });
      assert.ok(http2.calls.some((c) => c.url && c.url.includes('api.push.apple.com')));
    });

    it('returns provider_error on APNs non-200 and still cleans invalid tokens', async () => {
      const deleted = [];
      const http2 = createHttp2Mock({ status: 410, body: '{"reason":"Unregistered"}' });
      const result = await sendAPNs('abcd1234efgh5678', PAYLOAD, {
        env: configuredApnsEnv(),
        http2,
        pushSubscriptions: {
          async deleteNativeSubscriptionByToken(token, platform) {
            deleted.push({ token, platform });
          },
        },
      });
      assert.deepEqual(result, { delivered: false, reason: 'provider_error' });
      assert.deepEqual(deleted, [{ token: 'abcd1234efgh5678', platform: 'ios' }]);
    });

    it('returns timeout / transport_error without counting delivery', async () => {
      const timeout = await sendAPNs('abcd1234efgh5678', PAYLOAD, {
        env: configuredApnsEnv(),
        http2: createHttp2Mock({ timeout: true }),
      });
      assert.deepEqual(timeout, { delivered: false, reason: 'timeout' });

      const transport = await sendAPNs('abcd1234efgh5678', PAYLOAD, {
        env: configuredApnsEnv(),
        http2: createHttp2Mock({ error: new Error('socket hang up') }),
      });
      assert.deepEqual(transport, { delivered: false, reason: 'transport_error' });
    });
  });

  describe('sendFCM', () => {
    it('returns not_configured when FCM_SERVER_KEY is missing at call time', async () => {
      const result = await sendFCM('android-token', PAYLOAD, { env: {} });
      assert.deepEqual(result, { delivered: false, reason: 'not_configured' });
    });

    it('returns delivered true only after an FCM 2xx response', async () => {
      const result = await sendFCM('android-token', PAYLOAD, {
        env: { FCM_SERVER_KEY: 'test-fcm-key' },
        fetch: async () => ({ ok: true, status: 200, text: async () => 'ok' }),
      });
      assert.deepEqual(result, { delivered: true });
    });

    it('returns provider_error on FCM non-2xx and transport_error on fetch failure', async () => {
      const non2xx = await sendFCM('android-token', PAYLOAD, {
        env: { FCM_SERVER_KEY: 'test-fcm-key' },
        fetch: async () => ({ ok: false, status: 503, text: async () => 'unavailable' }),
      });
      assert.deepEqual(non2xx, { delivered: false, reason: 'provider_error' });

      const transport = await sendFCM('android-token', PAYLOAD, {
        env: { FCM_SERVER_KEY: 'test-fcm-key' },
        fetch: async () => { throw new Error('network down'); },
      });
      assert.deepEqual(transport, { delivered: false, reason: 'transport_error' });
    });
  });

  describe('sendPushNotification archive + sent count', () => {
    it('1. web successful + native failed => archive allowed', async () => {
      const { result, archived } = await sendWithArchive({
        vapidPublicKey: 'vapid-pub',
        vapidPrivateKey: 'vapid-priv',
        getWebSubscriptions: async () => [{ id: 'w1', subscriptionJson: {} }],
        getNativeSubscriptions: async () => [{ id: 'n1', platform: 'ios', nativeToken: 'tok' }],
        sendWebNotification: async () => ({ statusCode: 201 }),
        sendAPNs: async () => ({ delivered: false, reason: 'provider_error' }),
      });
      assert.equal(result.sent, 1);
      assert.equal(archived.length, 1);
    });

    it('2. native APNs HTTP 200 => archived', async () => {
      const { result, archived } = await sendWithArchive({
        getWebSubscriptions: async () => [],
        getNativeSubscriptions: async () => [{ id: 'n1', platform: 'ios', nativeToken: 'abcd1234efgh5678' }],
        env: configuredApnsEnv(),
        http2: createHttp2Mock({ status: 200 }),
      });
      assert.equal(result.sent, 1);
      assert.equal(archived.length, 1);
    });

    it('3. APNs not configured => sent=0 and not archived', async () => {
      const { result, archived } = await sendWithArchive({
        getWebSubscriptions: async () => [],
        getNativeSubscriptions: async () => [{ id: 'n1', platform: 'ios', nativeToken: 'tok' }],
        env: {},
      });
      assert.equal(result.sent, 0);
      assert.deepEqual(archived, []);
    });

    it('4. APNs non-200 => not archived', async () => {
      const { result, archived } = await sendWithArchive({
        getWebSubscriptions: async () => [],
        getNativeSubscriptions: async () => [{ id: 'n1', platform: 'ios', nativeToken: 'abcd1234efgh5678' }],
        env: configuredApnsEnv(),
        http2: createHttp2Mock({ status: 400, body: '{"reason":"BadDeviceToken"}' }),
      });
      assert.equal(result.sent, 0);
      assert.deepEqual(archived, []);
    });

    it('5. APNs timeout / transport failure => not archived', async () => {
      const timeout = await sendWithArchive({
        getWebSubscriptions: async () => [],
        getNativeSubscriptions: async () => [{ id: 'n1', platform: 'ios', nativeToken: 'abcd1234efgh5678' }],
        env: configuredApnsEnv(),
        http2: createHttp2Mock({ timeout: true }),
      });
      assert.equal(timeout.result.sent, 0);
      assert.deepEqual(timeout.archived, []);

      const transport = await sendWithArchive({
        getWebSubscriptions: async () => [],
        getNativeSubscriptions: async () => [{ id: 'n1', platform: 'ios', nativeToken: 'abcd1234efgh5678' }],
        env: configuredApnsEnv(),
        http2: createHttp2Mock({ error: new Error('ECONNRESET') }),
      });
      assert.equal(transport.result.sent, 0);
      assert.deepEqual(transport.archived, []);
    });

    it('6. FCM not configured => not archived', async () => {
      const { result, archived } = await sendWithArchive({
        getWebSubscriptions: async () => [],
        getNativeSubscriptions: async () => [{ id: 'n1', platform: 'android', nativeToken: 'atok' }],
        env: {},
      });
      assert.equal(result.sent, 0);
      assert.deepEqual(archived, []);
    });

    it('7. FCM non-2xx => not archived', async () => {
      const { result, archived } = await sendWithArchive({
        getWebSubscriptions: async () => [],
        getNativeSubscriptions: async () => [{ id: 'n1', platform: 'android', nativeToken: 'atok' }],
        env: { FCM_SERVER_KEY: 'test-fcm-key' },
        fetch: async () => ({ ok: false, status: 500, text: async () => 'fail' }),
      });
      assert.equal(result.sent, 0);
      assert.deepEqual(archived, []);
    });

    it('8. no successful delivery anywhere => archive not called', async () => {
      const { result, archived } = await sendWithArchive({
        vapidPublicKey: 'vapid-pub',
        vapidPrivateKey: 'vapid-priv',
        getWebSubscriptions: async () => [{ id: 'w1', subscriptionJson: {} }],
        getNativeSubscriptions: async () => [
          { id: 'n1', platform: 'ios', nativeToken: 'tok' },
          { id: 'n2', platform: 'android', nativeToken: 'atok' },
        ],
        sendWebNotification: async () => {
          throw new Error('web provider failed');
        },
        sendAPNs: async () => ({ delivered: false, reason: 'not_configured' }),
        sendFCM: async () => ({ delivered: false, reason: 'provider_error' }),
      });
      assert.equal(result.sent, 0);
      assert.deepEqual(archived, []);
    });

    it('9. sent count matches actual delivered subscription count', async () => {
      const { result, archived } = await sendWithArchive({
        vapidPublicKey: 'vapid-pub',
        vapidPrivateKey: 'vapid-priv',
        getWebSubscriptions: async () => [
          { id: 'w1', subscriptionJson: {} },
          { id: 'w2', subscriptionJson: {} },
        ],
        getNativeSubscriptions: async () => [
          { id: 'n1', platform: 'ios', nativeToken: 'ok' },
          { id: 'n2', platform: 'ios', nativeToken: 'fail' },
          { id: 'n3', platform: 'android', nativeToken: 'ok-android' },
          { id: 'n4', platform: 'webos', nativeToken: 'unknown' },
        ],
        sendWebNotification: async () => ({ statusCode: 201 }),
        sendAPNs: async (token) => (
          token === 'ok'
            ? { delivered: true }
            : { delivered: false, reason: 'provider_error' }
        ),
        sendFCM: async () => ({ delivered: true }),
      });
      assert.equal(result.sent, 4);
      assert.equal(archived.length, 1);
    });
  });
});
