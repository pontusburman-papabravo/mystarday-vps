'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLandingRequestGuard, registerSearch, preservedCampaignParams } = require('../public/js/landing-choice-guards');

function delayed(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

test('a late country response cannot replace the newest choice', async () => {
  const guard = createLandingRequestGuard();
  const shown = [];

  function load(code, ms, payload) {
    const ticket = guard.next();
    return delayed(ms).then(() => {
      if (!ticket.current()) return null;
      shown.push({ code, payload });
      return payload;
    });
  }

  const first = load('FI', 40, { country_code: 'FI', slots_remaining: 18, cta: 'Get 12 months free' });
  const second = load('DE', 15, { country_code: 'DE', slots_remaining: null, cta: null });
  const third = load('FI', 5, { country_code: 'FI', slots_remaining: 1, cta: 'Get 12 months free' });
  await Promise.all([first, second, third]);

  assert.deepEqual(shown, [{
    code: 'FI',
    payload: { country_code: 'FI', slots_remaining: 1, cta: 'Get 12 months free' },
  }]);
  assert.equal(shown.some((row) => row.payload.country_code === 'DE'), false);
  assert.equal(shown.some((row) => row.payload.slots_remaining === 18), false);
});

test('registration keeps the original campaign and records the offer separately', () => {
  const search = new URLSearchParams('utm_source=ads&utm_medium=paid&utm_campaign=ie-launch&utm_content=hero');
  const params = registerSearch({
    country: 'FI',
    appLocale: 'en-GB',
    status: 'launch_cohort',
    searchParams: search,
    stored: { utm_campaign: 'stored-should-not-win', utm_term: 'spring' },
  });
  assert.equal(params.get('utm_source'), 'ads');
  assert.equal(params.get('utm_medium'), 'paid');
  assert.equal(params.get('utm_campaign'), 'ie-launch');
  assert.equal(params.get('utm_content'), 'hero');
  assert.equal(params.get('utm_term'), 'spring');
  assert.equal(params.get('landing_offer'), 'launch_cohort_offer_v1');
  assert.equal(params.get('residence'), 'FI');
  assert.equal(params.get('residence_explicit'), '0');
  assert.equal(params.get('display_locale'), 'en-GB');
});

test('a language change keeps the country and the original UTM', () => {
  const search = new URLSearchParams('utm_source=newsletter&utm_campaign=spring&residence=DE&residence_explicit=1');
  const params = preservedCampaignParams(search, { utm_medium: 'email' });
  params.set('residence', 'DE');
  params.set('residence_explicit', '1');
  assert.equal(params.get('utm_source'), 'newsletter');
  assert.equal(params.get('utm_campaign'), 'spring');
  assert.equal(params.get('utm_medium'), 'email');
  assert.equal(params.get('residence'), 'DE');
  assert.equal(params.get('landing_offer'), null);
});
