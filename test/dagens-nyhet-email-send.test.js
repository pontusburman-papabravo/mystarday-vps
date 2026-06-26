'use strict';

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { injectMockDb } = require('./helpers/setup.js');

const NYHET_ID = '11111111-1111-4111-8111-111111111111';

function clearModule(relativePath) {
  const resolved = require.resolve(path.join(__dirname, '..', relativePath));
  delete require.cache[resolved];
}

afterEach(() => {
  clearModule('src/lib/dagens-nyhet-email-send.js');
  clearModule('db/dagens-nyhet.js');
});

test('getNyhetEmailSendStatus returns done when email_sent_at is set', async () => {
  const mock = injectMockDb();
  mock.setQuery(async (sql) => {
    if (String(sql).includes('newsletter_email_send')) {
      return { rows: [{ c: 12 }] };
    }
    if (String(sql).includes('FROM dagens_nyhet')) {
      return {
        rows: [{
          email_sent_at: new Date('2026-06-26T12:00:00Z'),
          email_sent_count: 12,
          email_failed_count: 0,
          email_failed: false,
        }],
      };
    }
    return { rows: [] };
  });

  const { getNyhetEmailSendStatus, resetJobsForTest } = require('../src/lib/dagens-nyhet-email-send.js');
  resetJobsForTest();

  const status = await getNyhetEmailSendStatus(NYHET_ID);
  assert.equal(status.status, 'done');
  assert.equal(status.sent, 12);
  mock.restore();
});

test('startNyhetEmailSend returns 202-style job and completes in background', async () => {
  const mock = injectMockDb();
  let markEmailCalled = false;

  mock.setQuery(async (sql) => {
    if (String(sql).includes('newsletter_email_send')) {
      return { rows: [{ c: 0 }] };
    }
    if (String(sql).includes('UPDATE dagens_nyhet') && String(sql).includes('email_sent_count')) {
      markEmailCalled = true;
      return { rows: [] };
    }
    return { rows: [] };
  });

  const mailerPath = require.resolve('../src/lib/newsletter-mailer');
  const originalMailer = require.cache[mailerPath];
  require.cache[mailerPath] = {
    id: mailerPath,
    filename: mailerPath,
    loaded: true,
    exports: {
      sendNewsletterToRecipients: async () => ({ sent: 2, failed: 0 }),
    },
    children: [],
    parent: null,
    paths: [],
  };

  clearModule('src/lib/dagens-nyhet-email-send.js');
  const {
    startNyhetEmailSend,
    getNyhetEmailSendStatus,
    resetJobsForTest,
  } = require('../src/lib/dagens-nyhet-email-send.js');
  resetJobsForTest();

  const nyhet = { id: NYHET_ID, title: 'Test', body: 'Hej' };
  const start = await startNyhetEmailSend(nyhet, ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']);
  assert.equal(start.started, true);
  assert.equal(start.job.status, 'sending');

  const duplicate = await startNyhetEmailSend(nyhet, ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']);
  assert.equal(duplicate.alreadyRunning, true);

  await new Promise((resolve) => setTimeout(resolve, 50));

  const status = await getNyhetEmailSendStatus(NYHET_ID);
  assert.equal(status.status, 'done');
  assert.equal(status.sent, 2);
  assert.equal(markEmailCalled, true);

  if (originalMailer) {
    require.cache[mailerPath] = originalMailer;
  } else {
    delete require.cache[mailerPath];
  }
  mock.restore();
});
