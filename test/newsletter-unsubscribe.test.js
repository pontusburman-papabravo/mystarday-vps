'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { injectMockDb } = require('./helpers/setup.js');

const TOKEN = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const PARENT_ID = '11111111-1111-4111-8111-111111111111';

test('unsubscribeByToken opts out parent and syncs newsletter_subscribed', async () => {
  const mock = injectMockDb();
  let parentUpdated = false;

  mock.setQuery(async (sql, params) => {
    if (String(sql).includes('UPDATE email_subscriptions') && String(sql).includes('unsubscribe_token')) {
      assert.equal(params[0], TOKEN);
      return { rows: [{ parent_id: PARENT_ID, email: 'parent@example.com' }] };
    }
    if (String(sql).includes('UPDATE parent SET newsletter_subscribed = false')) {
      parentUpdated = true;
      assert.equal(params[0], PARENT_ID);
      return { rowCount: 1, rows: [] };
    }
    return { rows: [] };
  });

  delete require.cache[require.resolve('../src/lib/newsletter-unsubscribe')];
  const { unsubscribeByToken } = require('../src/lib/newsletter-unsubscribe');
  const result = await unsubscribeByToken(TOKEN);
  assert.equal(result.ok, true);
  assert.equal(result.email, 'parent@example.com');
  assert.equal(parentUpdated, true);
  mock.restore();
});

test('autoUnsubscribeFromDeliveryEvent skips temporary bounces', async () => {
  const mock = injectMockDb();
  mock.setQuery(async () => ({ rows: [] }));

  delete require.cache[require.resolve('../src/lib/newsletter-unsubscribe')];
  const { autoUnsubscribeFromDeliveryEvent } = require('../src/lib/newsletter-unsubscribe');
  const result = await autoUnsubscribeFromDeliveryEvent({
    resendEmailId: 'email-1',
    recipientEmail: 'x@example.com',
    reason: 'bounce',
    bounceType: 'Temporary',
  });
  assert.equal(result.skipped, true);
  mock.restore();
});

test('autoUnsubscribeFromDeliveryEvent unsubscribes on complaint', async () => {
  const mock = injectMockDb();
  let unsubscribed = false;

  mock.setQuery(async (sql) => {
    if (String(sql).includes('newsletter_email_send') && String(sql).includes('resend_email_id')) {
      return { rows: [{ parent_id: PARENT_ID, recipient_email: 'parent@example.com' }] };
    }
    if (String(sql).includes('UPDATE email_subscriptions')) {
      unsubscribed = true;
      return { rows: [{ parent_id: PARENT_ID, email: 'parent@example.com' }] };
    }
    if (String(sql).includes('UPDATE parent SET newsletter_subscribed')) {
      return { rowCount: 1, rows: [] };
    }
    return { rows: [] };
  });

  delete require.cache[require.resolve('../src/lib/newsletter-unsubscribe')];
  const { autoUnsubscribeFromDeliveryEvent } = require('../src/lib/newsletter-unsubscribe');
  const result = await autoUnsubscribeFromDeliveryEvent({
    resendEmailId: 'email-complaint-1',
    reason: 'complaint',
  });
  assert.equal(result.ok, true);
  assert.equal(unsubscribed, true);
  mock.restore();
});
