'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const path = require('path');

process.env.DATABASE_URL = 'REDACTED/mock_test';

const { verifyResendWebhook } = require('../src/lib/resend-webhook-verify');

let markDeliveredCalls = [];
let markOpenedCalls = [];
let markClickedCalls = [];

const trackingPath = require.resolve(path.join(__dirname, '../db/newsletter-email-tracking'));
require.cache[trackingPath] = {
  id: trackingPath,
  filename: trackingPath,
  loaded: true,
  exports: {
    markDelivered: async (id, at) => { markDeliveredCalls.push({ id, at }); },
    markOpened: async (id, at) => { markOpenedCalls.push({ id, at }); },
    markClicked: async (id, at, url) => { markClickedCalls.push({ id, at, url }); },
  },
  children: [],
  parent: null,
  paths: [],
};

const webhookPath = require.resolve(path.join(__dirname, '../src/routes/resend-webhook'));
delete require.cache[webhookPath];
const { handleResendWebhook } = require(webhookPath);

function signPayload(secret, payload, id, timestamp) {
  const key = Buffer.from(secret.replace('whsec_', ''), 'base64');
  const signed = `${id}.${timestamp}.${payload}`;
  const sig = crypto.createHmac('sha256', key).update(signed).digest('base64');
  return { id, timestamp, signature: `v1,${sig}` };
}

function mockReqRes({ body, headers, secret }) {
  const req = { body, headers };
  let statusCode;
  let jsonBody;
  const res = {
    status(code) {
      statusCode = code;
      return {
        json(body) {
          jsonBody = body;
          return body;
        },
      };
    },
  };
  if (secret !== undefined) {
    process.env.RESEND_WEBHOOK_SECRET = secret;
  }
  return {
    req,
    res,
    async run() {
      await handleResendWebhook(req, res);
      return { status: statusCode, body: jsonBody };
    },
  };
}

describe('handleResendWebhook', () => {
  const secret = 'whsec_' + Buffer.from('test-secret-key-32bytes!!!!').toString('base64');

  beforeEach(() => {
    markDeliveredCalls = [];
    markOpenedCalls = [];
    markClickedCalls = [];
    process.env.RESEND_WEBHOOK_SECRET = secret;
  });

  it('returns 500 when RESEND_WEBHOOK_SECRET is unset', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const { status, body } = await mockReqRes({ body: '{}', headers: {} }).run();
    assert.equal(status, 500);
    assert.equal(body.error, 'Webhook not configured');
  });

  it('returns 400 on invalid signature', async () => {
    const { status, body } = await mockReqRes({
      body: '{}',
      headers: {
        'svix-id': 'x',
        'svix-timestamp': String(Math.floor(Date.now() / 1000)),
        'svix-signature': 'v1,bad',
      },
    }).run();
    assert.equal(status, 400);
    assert.equal(body.error, 'Invalid signature');
  });

  it('skips events without email_id', async () => {
    const payload = JSON.stringify({ type: 'email.opened', data: {} });
    const ts = String(Math.floor(Date.now() / 1000));
    const { id, timestamp, signature } = signPayload(secret, payload, 'msg_skip', ts);
    const { status, body } = await mockReqRes({
      body: payload,
      headers: {
        'svix-id': id,
        'svix-timestamp': timestamp,
        'svix-signature': signature,
      },
    }).run();
    assert.equal(status, 200);
    assert.equal(body.skipped, 'no email_id');
    assert.equal(markOpenedCalls.length, 0);
  });

  it('routes email.opened to markOpened', async () => {
    const payload = JSON.stringify({
      type: 'email.opened',
      created_at: '2026-06-12T10:00:00Z',
      data: { email_id: 'em_open_1' },
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const { id, timestamp, signature } = signPayload(secret, payload, 'msg_open', ts);
    const { status, body } = await mockReqRes({
      body: payload,
      headers: {
        'svix-id': id,
        'svix-timestamp': timestamp,
        'svix-signature': signature,
      },
    }).run();
    assert.equal(status, 200);
    assert.equal(body.received, true);
    assert.equal(markOpenedCalls.length, 1);
    assert.equal(markOpenedCalls[0].id, 'em_open_1');
  });

  it('routes email.clicked with link to markClicked', async () => {
    const payload = JSON.stringify({
      type: 'email.clicked',
      created_at: '2026-06-12T10:05:00Z',
      data: { email_id: 'em_click_1', click: { link: 'https://example.com/news' } },
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const { id, timestamp, signature } = signPayload(secret, payload, 'msg_click', ts);
    const { status } = await mockReqRes({
      body: payload,
      headers: {
        'svix-id': id,
        'svix-timestamp': timestamp,
        'svix-signature': signature,
      },
    }).run();
    assert.equal(status, 200);
    assert.equal(markClickedCalls.length, 1);
    assert.equal(markClickedCalls[0].id, 'em_click_1');
    assert.equal(markClickedCalls[0].url, 'https://example.com/news');
  });

  it('routes email.delivered to markDelivered', async () => {
    const payload = JSON.stringify({
      type: 'email.delivered',
      data: { email_id: 'em_del_1' },
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const { id, timestamp, signature } = signPayload(secret, payload, 'msg_del', ts);
    const { status } = await mockReqRes({
      body: payload,
      headers: {
        'svix-id': id,
        'svix-timestamp': timestamp,
        'svix-signature': signature,
      },
    }).run();
    assert.equal(status, 200);
    assert.equal(markDeliveredCalls.length, 1);
    assert.equal(markDeliveredCalls[0].id, 'em_del_1');
  });
});

// Sanity: verify helper still works (covered in resend-webhook-verify.test.js too)
describe('verifyResendWebhook integration', () => {
  it('parses signed payload', () => {
    const secret = 'whsec_' + Buffer.from('test-secret-key-32bytes!!!!').toString('base64');
    const payload = JSON.stringify({ type: 'email.opened', data: { email_id: 'x' } });
    const ts = String(Math.floor(Date.now() / 1000));
    const key = Buffer.from(secret.replace('whsec_', ''), 'base64');
    const signed = `id.${ts}.${payload}`;
    const sig = crypto.createHmac('sha256', key).update(signed).digest('base64');
    const event = verifyResendWebhook(payload, {
      'svix-id': 'id',
      'svix-timestamp': ts,
      'svix-signature': `v1,${sig}`,
    }, secret);
    assert.equal(event.data.email_id, 'x');
  });
});
