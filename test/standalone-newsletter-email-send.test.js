'use strict';

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { injectMockDb } = require('./helpers/setup.js');

const NEWSLETTER_ID = '22222222-2222-4222-8222-222222222222';

function clearModule(relativePath) {
  const resolved = require.resolve(path.join(__dirname, '..', relativePath));
  delete require.cache[resolved];
}

afterEach(() => {
  clearModule('src/lib/standalone-newsletter-email-send.js');
});

test('getStandaloneNewsletterSendStatus returns done when sent_at is set', async () => {
  const mock = injectMockDb();
  mock.setQuery(async (sql) => {
    if (String(sql).includes('newsletter_email_send')) {
      return { rows: [{ c: 8 }] };
    }
    if (String(sql).includes('FROM newsletters')) {
      return {
        rows: [{
          status: 'sent',
          sent_at: new Date('2026-07-20T12:00:00Z'),
          sent_count: 8,
          failed_count: 0,
        }],
      };
    }
    return { rows: [] };
  });

  const { getStandaloneNewsletterSendStatus, resetJobsForTest } = require('../src/lib/standalone-newsletter-email-send.js');
  resetJobsForTest();

  const status = await getStandaloneNewsletterSendStatus(NEWSLETTER_ID);
  assert.equal(status.status, 'done');
  assert.equal(status.sent, 8);
  mock.restore();
});

test('startStandaloneNewsletterSend returns job and completes in background', async () => {
  const mock = injectMockDb();
  let updateCalled = false;

  mock.setQuery(async (sql) => {
    if (String(sql).includes('newsletter_email_send')) {
      return { rows: [{ c: 0 }] };
    }
    if (String(sql).includes('UPDATE newsletters') && String(sql).includes('sent_count')) {
      updateCalled = true;
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
      sendStandaloneNewsletter: async () => ({ sent: 3, failed: 0 }),
    },
    children: [],
    parent: null,
    paths: [],
  };

  clearModule('src/lib/standalone-newsletter-email-send.js');
  const {
    startStandaloneNewsletterSend,
    getStandaloneNewsletterSendStatus,
    resetJobsForTest,
  } = require('../src/lib/standalone-newsletter-email-send.js');
  resetJobsForTest();

  const newsletter = { id: NEWSLETTER_ID, subject: 'Test', body: 'Hej' };
  const start = await startStandaloneNewsletterSend(newsletter, [
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  ]);
  assert.equal(start.started, true);
  assert.equal(start.job.status, 'sending');

  const duplicate = await startStandaloneNewsletterSend(newsletter, ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']);
  assert.equal(duplicate.alreadyRunning, true);

  await new Promise((resolve) => setTimeout(resolve, 50));

  const status = await getStandaloneNewsletterSendStatus(NEWSLETTER_ID);
  assert.equal(status.status, 'done');
  assert.equal(status.sent, 3);
  assert.equal(updateCalled, true);

  if (originalMailer) {
    require.cache[mailerPath] = originalMailer;
  } else {
    delete require.cache[mailerPath];
  }
  mock.restore();
});
