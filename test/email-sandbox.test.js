'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

describe('email sandbox', () => {
  const emailPath = path.join(__dirname, '../src/lib/email.js');

  test('isTestMailbox matches RFC 2606 example domains', () => {
    delete require.cache[require.resolve(emailPath)];
    const { isTestMailbox } = require(emailPath);
    assert.equal(isTestMailbox('anna@example.com'), true);
    assert.equal(isTestMailbox('Guest@Example.com'), true);
    assert.equal(isTestMailbox('user@example.org'), true);
    assert.equal(isTestMailbox('parent@test.com'), true);
    assert.equal(isTestMailbox('real@school.se'), false);
  });

  test('sendEmail suppresses test mailbox recipients', async () => {
    delete require.cache[require.resolve(emailPath)];
    const { sendEmail } = require(emailPath);

    const result = await sendEmail({
      to: 'anna@example.com',
      subject: 'Should not send',
      html: '<p>test</p>',
    });

    assert.equal(result.provider, 'suppressed_test_mailbox');
    delete require.cache[require.resolve(emailPath)];
  });

  test('getResendApiKey weekly prefers RESEND_API_KEY_WEEKLY', () => {
    const prevDefault = process.env.RESEND_API_KEY;
    const prevWeekly = process.env.RESEND_API_KEY_WEEKLY;
    process.env.RESEND_API_KEY = 're_default';
    process.env.RESEND_API_KEY_WEEKLY = 're_weekly';

    delete require.cache[require.resolve(emailPath)];
    const { getResendApiKey } = require(emailPath);

    assert.equal(getResendApiKey('default'), 're_default');
    assert.equal(getResendApiKey('weekly'), 're_weekly');

    delete require.cache[require.resolve(emailPath)];
    if (prevDefault === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevDefault;
    if (prevWeekly === undefined) delete process.env.RESEND_API_KEY_WEEKLY;
    else process.env.RESEND_API_KEY_WEEKLY = prevWeekly;
  });

  test('getResendApiKey weekly falls back to RESEND_API_KEY', () => {
    const prevDefault = process.env.RESEND_API_KEY;
    const prevWeekly = process.env.RESEND_API_KEY_WEEKLY;
    process.env.RESEND_API_KEY = 're_default';
    delete process.env.RESEND_API_KEY_WEEKLY;

    delete require.cache[require.resolve(emailPath)];
    const { getResendApiKey } = require(emailPath);

    assert.equal(getResendApiKey('weekly'), 're_default');

    delete require.cache[require.resolve(emailPath)];
    if (prevDefault === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevDefault;
    if (prevWeekly === undefined) delete process.env.RESEND_API_KEY_WEEKLY;
    else process.env.RESEND_API_KEY_WEEKLY = prevWeekly;
  });

  async function withMockResendFetch(fn) {
    const prevKey = process.env.RESEND_API_KEY;
    const prevEnabled = process.env.EMAIL_ENABLED;
    process.env.RESEND_API_KEY = 're_test_sandbox_key';
    process.env.EMAIL_ENABLED = 'true';
    const calls = [];
    const originalFetch = global.fetch;
    global.fetch = async (url, opts) => {
      if (url !== 'https://api.resend.com/emails') {
        throw new Error(`unexpected fetch: ${url}`);
      }
      calls.push({
        url,
        httpHeaders: { ...(opts.headers || {}) },
        body: JSON.parse(opts.body),
      });
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: `re_test_${calls.length}` }),
      };
    };
    delete require.cache[require.resolve(emailPath)];
    const email = require(emailPath);
    try {
      return await fn({ email, calls });
    } finally {
      global.fetch = originalFetch;
      delete require.cache[require.resolve(emailPath)];
      if (prevKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = prevKey;
      if (prevEnabled === undefined) delete process.env.EMAIL_ENABLED;
      else process.env.EMAIL_ENABLED = prevEnabled;
    }
  }

  test('sendEmail puts Idempotency-Key on HTTP request, not email JSON headers', async () => {
    await withMockResendFetch(async ({ email, calls }) => {
      const result = await email.sendEmail({
        to: 'parent@acme.se',
        subject: 'Follow-up',
        html: '<p>hi</p>',
        unsubscribeUrl: 'https://example.test/for-dig/followup-unsubscribe?t=token',
        idempotencyKey: 'for-dig-followup:batch-1:rec-1',
      });
      assert.equal(result.success, true);
      assert.equal(calls.length, 1);
      const { httpHeaders, body } = calls[0];
      assert.equal(httpHeaders['Content-Type'], 'application/json');
      assert.equal(httpHeaders.Authorization, 'Bearer re_test_sandbox_key');
      assert.equal(httpHeaders['Idempotency-Key'], 'for-dig-followup:batch-1:rec-1');
      assert.equal(body.headers['List-Unsubscribe'], '<https://example.test/for-dig/followup-unsubscribe?t=token>');
      assert.equal(body.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
      assert.equal(body.headers['Idempotency-Key'], undefined);
    });
  });

  test('sendEmail retry uses the same HTTP Idempotency-Key; other recipients and batches differ', async () => {
    await withMockResendFetch(async ({ email, calls }) => {
      const base = {
        to: 'parent@acme.se',
        subject: 'Follow-up',
        html: '<p>hi</p>',
      };
      await email.sendEmail({ ...base, idempotencyKey: 'for-dig-followup:batch-1:rec-1' });
      await email.sendEmail({ ...base, idempotencyKey: 'for-dig-followup:batch-1:rec-1' });
      await email.sendEmail({ ...base, idempotencyKey: 'for-dig-followup:batch-1:rec-2' });
      await email.sendEmail({ ...base, idempotencyKey: 'for-dig-followup:batch-2:rec-1' });
      const keys = calls.map((row) => row.httpHeaders['Idempotency-Key']);
      assert.deepEqual(keys, [
        'for-dig-followup:batch-1:rec-1',
        'for-dig-followup:batch-1:rec-1',
        'for-dig-followup:batch-1:rec-2',
        'for-dig-followup:batch-2:rec-1',
      ]);
      assert.equal(keys[0], keys[1]);
      assert.notEqual(keys[0], keys[2]);
      assert.notEqual(keys[0], keys[3]);
      for (const call of calls) {
        assert.equal(call.body.headers, undefined);
        assert.equal(Object.prototype.hasOwnProperty.call(call.httpHeaders, 'Idempotency-Key'), true);
      }
    });
  });

  test('sendEmail without idempotencyKey does not set a global HTTP key', async () => {
    await withMockResendFetch(async ({ email, calls }) => {
      await email.sendEmail({
        to: 'parent@acme.se',
        subject: 'Welcome',
        html: '<p>hi</p>',
        unsubscribeUrl: 'https://example.test/api/newsletter/unsubscribe?token=abc',
      });
      assert.equal(calls.length, 1);
      assert.equal(calls[0].httpHeaders['Idempotency-Key'], undefined);
      assert.equal(Object.prototype.hasOwnProperty.call(calls[0].httpHeaders, 'Idempotency-Key'), false);
      assert.equal(calls[0].httpHeaders['Content-Type'], 'application/json');
      assert.equal(calls[0].httpHeaders.Authorization, 'Bearer re_test_sandbox_key');
      assert.equal(
        calls[0].body.headers['List-Unsubscribe'],
        '<https://example.test/api/newsletter/unsubscribe?token=abc>'
      );
      assert.equal(calls[0].body.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
      assert.equal(calls[0].body.headers['Idempotency-Key'], undefined);
    });
  });
});
