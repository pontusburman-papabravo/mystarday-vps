'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isActiveNewsletterSubscriber } = require('../src/lib/newsletter-subscribe');
const { computeCampaignRates } = require('../src/lib/newsletter-campaign-stats');

describe('isActiveNewsletterSubscriber', () => {
  it('treats null/undefined as subscribed (missing email_subscriptions row)', () => {
    assert.equal(isActiveNewsletterSubscriber(null), true);
    assert.equal(isActiveNewsletterSubscriber(undefined), true);
  });

  it('treats explicit true as subscribed', () => {
    assert.equal(isActiveNewsletterSubscriber(true), true);
  });

  it('treats explicit false as unsubscribed', () => {
    assert.equal(isActiveNewsletterSubscriber(false), false);
  });
});

describe('computeCampaignRates', () => {
  it('returns zero rates when nothing sent', () => {
    assert.deepEqual(computeCampaignRates(0, 0, 0), { open_rate: 0, click_rate: 0 });
  });

  it('computes one-decimal percentages', () => {
    assert.deepEqual(computeCampaignRates(200, 50, 10), {
      open_rate: 25,
      click_rate: 5,
    });
  });

  it('rounds to one decimal place', () => {
    assert.deepEqual(computeCampaignRates(3, 1, 1), {
      open_rate: 33.3,
      click_rate: 33.3,
    });
  });
});
