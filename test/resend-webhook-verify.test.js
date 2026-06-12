const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { verifyResendWebhook } = require('../src/lib/resend-webhook-verify');

function signPayload(secret, payload, id, timestamp) {
  const key = Buffer.from(secret.replace('whsec_', ''), 'base64');
  const signed = `${id}.${timestamp}.${payload}`;
  const sig = crypto.createHmac('sha256', key).update(signed).digest('base64');
  return { id, timestamp, signature: `v1,${sig}` };
}

describe('verifyResendWebhook', () => {
  it('accepts valid signature', () => {
    const secret = 'whsec_' + Buffer.from('test-secret-key-32bytes!!!!').toString('base64');
    const payload = JSON.stringify({ type: 'email.opened', data: { email_id: 'abc' } });
    const ts = String(Math.floor(Date.now() / 1000));
    const { id, timestamp, signature } = signPayload(secret, payload, 'msg_test', ts);
    const event = verifyResendWebhook(payload, {
      'svix-id': id,
      'svix-timestamp': timestamp,
      'svix-signature': signature,
    }, secret);
    assert.equal(event.type, 'email.opened');
    assert.equal(event.data.email_id, 'abc');
  });

  it('rejects invalid signature', () => {
    const event = verifyResendWebhook('{}', {
      'svix-id': 'x',
      'svix-timestamp': String(Math.floor(Date.now() / 1000)),
      'svix-signature': 'v1,invalid',
    }, 'whsec_' + Buffer.from('test').toString('base64'));
    assert.equal(event, null);
  });
});
