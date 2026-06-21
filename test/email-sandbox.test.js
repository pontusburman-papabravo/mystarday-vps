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
});
