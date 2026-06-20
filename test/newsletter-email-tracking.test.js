'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const express = require('express');
const { injectMockDb } = require('./helpers/setup.js');
const { verifyResendWebhook } = require('../src/lib/resend-webhook-verify');

function signPayload(secret, payload, id, timestamp) {
  const key = Buffer.from(secret.replace('whsec_', ''), 'base64');
  const signed = `${id}.${timestamp}.${payload}`;
  const sig = crypto.createHmac('sha256', key).update(signed).digest('base64');
  return { id, timestamp, signature: `v1,${sig}` };
}

test('Resend webhook marks opened on matching newsletter_email_send row', async () => {
  const mock = injectMockDb();
  const emailId = 'resend-email-123';
  let openUpdates = 0;

  mock.setQuery(async (sql, params) => {
    if (String(sql).includes('UPDATE newsletter_email_send') && String(sql).includes('first_opened_at')) {
      openUpdates++;
      assert.equal(params[0], emailId);
      return { rowCount: 1, rows: [] };
    }
    return { rowCount: 0, rows: [] };
  });

  process.env.RESEND_WEBHOOK_SECRET = 'whsec_' + Buffer.from('test-secret-key-32bytes!!!!').toString('base64');

  const webhookPath = require.resolve('../src/routes/resend-webhook');
  delete require.cache[webhookPath];
  const { handleResendWebhook } = require('../src/routes/resend-webhook');

  const payload = JSON.stringify({
    type: 'email.opened',
    created_at: new Date().toISOString(),
    data: { email_id: emailId },
  });
  const ts = String(Math.floor(Date.now() / 1000));
  const { id, timestamp, signature } = signPayload(process.env.RESEND_WEBHOOK_SECRET, payload, 'msg_open', ts);

  const app = express();
  app.post('/api/resend/webhook', express.raw({ type: 'application/json' }), handleResendWebhook);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/api/resend/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'svix-id': id,
        'svix-timestamp': timestamp,
        'svix-signature': signature,
      },
      body: payload,
    });
    assert.equal(res.status, 200);
    assert.equal(openUpdates, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
    delete process.env.RESEND_WEBHOOK_SECRET;
  }
});

test('getCampaignStats includes tracking diagnostics', async () => {
  const mock = injectMockDb();
  process.env.RESEND_WEBHOOK_SECRET = 'whsec_test';
  process.env.APP_URL = 'https://example.test';

  mock.setQuery(async (sql) => {
    if (String(sql).includes('FROM newsletter_email_send') && String(sql).includes('campaign_type')) {
      return {
        rows: [{
          sent: 10,
          delivered: 0,
          opened_unique: 0,
          opened_total: 0,
          clicked_unique: 0,
          clicked_total: 0,
        }],
      };
    }
    if (String(sql).includes('INTERVAL \'30 days\'')) {
      return { rows: [{ sent: 10, delivered: 0 }] };
    }
    return { rows: [] };
  });

  const trackingPath = require.resolve('../db/newsletter-email-tracking');
  delete require.cache[trackingPath];
  const { getCampaignStats } = require('../db/newsletter-email-tracking');

  const stats = await getCampaignStats('dagens_nyhet', '00000000-0000-4000-8000-000000000001');
  assert.equal(stats.sent, 10);
  assert.equal(stats.tracking.webhook_configured, true);
  assert.equal(stats.tracking.webhook_url, 'https://example.test/api/resend/webhook');
  assert.equal(stats.tracking.webhook_receiving_events, false);

  mock.restore();
  delete process.env.RESEND_WEBHOOK_SECRET;
  delete process.env.APP_URL;
});
