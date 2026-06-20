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
});
