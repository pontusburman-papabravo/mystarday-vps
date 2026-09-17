'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { injectMockDb } = require('./helpers/setup.js');

const TOKEN = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const PARENT_ID = '11111111-1111-4111-8111-111111111111';

test('isolated delivery campaigns include for-dig follow-up only', () => {
  delete require.cache[require.resolve('../src/lib/newsletter-unsubscribe')];
  const { ISOLATED_DELIVERY_CAMPAIGN_TYPES } = require('../src/lib/newsletter-unsubscribe');
  assert.deepEqual([...ISOLATED_DELIVERY_CAMPAIGN_TYPES], ['for_dig_outcome_followup']);
});

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

function mockNewsletterSend({ campaignType, parentId = PARENT_ID, email = 'parent@example.com' }) {
  const mock = injectMockDb();
  let unsubscribed = false;
  let parentFlagUpdated = false;
  let sendLookups = 0;

  mock.setQuery(async (sql) => {
    if (String(sql).includes('FROM newsletter_email_send') && String(sql).includes('resend_email_id')) {
      sendLookups += 1;
      return {
        rows: [{
          parent_id: parentId,
          recipient_email: email,
          campaign_type: campaignType,
        }],
      };
    }
    if (String(sql).includes('UPDATE email_subscriptions')) {
      unsubscribed = true;
      return { rows: [{ parent_id: parentId, email }] };
    }
    if (String(sql).includes('UPDATE parent SET newsletter_subscribed')) {
      parentFlagUpdated = true;
      return { rowCount: 1, rows: [] };
    }
    return { rows: [] };
  });

  delete require.cache[require.resolve('../src/lib/newsletter-unsubscribe')];
  const unsub = require('../src/lib/newsletter-unsubscribe');
  return {
    mock,
    unsub,
    stats: () => ({ unsubscribed, parentFlagUpdated, sendLookups }),
  };
}

test('autoUnsubscribeFromDeliveryEvent unsubscribes on newsletter complaint', async () => {
  const harness = mockNewsletterSend({ campaignType: 'standalone' });
  const result = await harness.unsub.autoUnsubscribeFromDeliveryEvent({
    resendEmailId: 'email-complaint-1',
    reason: 'complaint',
  });
  assert.equal(result.ok, true);
  assert.equal(result.skipped, undefined);
  assert.equal(harness.stats().unsubscribed, true);
  assert.equal(harness.stats().parentFlagUpdated, true);
  harness.mock.restore();
});

test('autoUnsubscribeFromDeliveryEvent unsubscribes on newsletter hard bounce', async () => {
  const harness = mockNewsletterSend({ campaignType: 'dagens_nyhet' });
  const result = await harness.unsub.autoUnsubscribeFromDeliveryEvent({
    resendEmailId: 'email-bounce-news-1',
    recipientEmail: 'parent@example.com',
    reason: 'bounce',
    bounceType: 'Permanent',
  });
  assert.equal(result.ok, true);
  assert.equal(harness.stats().unsubscribed, true);
  assert.equal(harness.stats().parentFlagUpdated, true);
  harness.mock.restore();
});

test('autoUnsubscribeFromDeliveryEvent does not mutate newsletter for for-dig bounce', async () => {
  const harness = mockNewsletterSend({ campaignType: 'for_dig_outcome_followup' });
  const result = await harness.unsub.autoUnsubscribeFromDeliveryEvent({
    resendEmailId: 'email-fordig-bounce-1',
    recipientEmail: 'parent@example.com',
    reason: 'bounce',
    bounceType: 'Permanent',
  });
  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'isolated_campaign');
  assert.equal(result.campaignType, 'for_dig_outcome_followup');
  assert.equal(harness.stats().sendLookups, 1);
  assert.equal(harness.stats().unsubscribed, false);
  assert.equal(harness.stats().parentFlagUpdated, false);
  harness.mock.restore();
});

test('autoUnsubscribeFromDeliveryEvent does not mutate newsletter for for-dig complaint', async () => {
  const harness = mockNewsletterSend({ campaignType: 'for_dig_outcome_followup' });
  const result = await harness.unsub.autoUnsubscribeFromDeliveryEvent({
    resendEmailId: 'email-fordig-complaint-1',
    recipientEmail: 'parent@example.com',
    reason: 'complaint',
  });
  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'isolated_campaign');
  assert.equal(harness.stats().unsubscribed, false);
  assert.equal(harness.stats().parentFlagUpdated, false);
  harness.mock.restore();
});

test('for-dig delivery skip is idempotent on webhook replay', async () => {
  const harness = mockNewsletterSend({ campaignType: 'for_dig_outcome_followup' });
  const first = await harness.unsub.autoUnsubscribeFromDeliveryEvent({
    resendEmailId: 'email-fordig-replay-1',
    reason: 'bounce',
  });
  const second = await harness.unsub.autoUnsubscribeFromDeliveryEvent({
    resendEmailId: 'email-fordig-replay-1',
    reason: 'bounce',
  });
  assert.equal(first.skipped, true);
  assert.equal(second.skipped, true);
  assert.equal(harness.stats().sendLookups, 2);
  assert.equal(harness.stats().unsubscribed, false);
  assert.equal(harness.stats().parentFlagUpdated, false);
  harness.mock.restore();
});

test('service/account mail bounce still auto-unsubscribes newsletter by recipient email', async () => {
  const mock = injectMockDb();
  let unsubscribed = false;
  let parentFlagUpdated = false;

  mock.setQuery(async (sql) => {
    if (String(sql).includes('FROM newsletter_email_send') && String(sql).includes('resend_email_id')) {
      return { rows: [] };
    }
    if (String(sql).includes('UPDATE email_subscriptions')) {
      unsubscribed = true;
      return { rows: [{ parent_id: PARENT_ID, email: 'parent@example.com' }] };
    }
    if (String(sql).includes('UPDATE parent SET newsletter_subscribed')) {
      parentFlagUpdated = true;
      return { rowCount: 1, rows: [] };
    }
    return { rows: [] };
  });

  delete require.cache[require.resolve('../src/lib/newsletter-unsubscribe')];
  const { autoUnsubscribeFromDeliveryEvent } = require('../src/lib/newsletter-unsubscribe');
  const result = await autoUnsubscribeFromDeliveryEvent({
    resendEmailId: 'email-welcome-bounce-1',
    recipientEmail: 'parent@example.com',
    reason: 'bounce',
    bounceType: 'Permanent',
  });
  assert.equal(result.ok, true);
  assert.equal(unsubscribed, true);
  assert.equal(parentFlagUpdated, true);
  mock.restore();
});
