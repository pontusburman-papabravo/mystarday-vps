'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { loadLocales, t } = require('../src/lib/i18n');

describe('for-dig star singular/plural labels', () => {
  before(() => {
    loadLocales();
  });

  it('English: 1 star / 2 stars', () => {
    assert.equal(t('en-GB', 'forDig.decision.starSingular'), 'star');
    assert.equal(t('en-GB', 'forDig.decision.starPlural'), 'stars');
  });

  it('Swedish: 1 stjärna / 2 stjärnor', () => {
    assert.equal(t('sv-SE', 'forDig.decision.starSingular'), 'stjärna');
    assert.equal(t('sv-SE', 'forDig.decision.starPlural'), 'stjärnor');
  });
});
