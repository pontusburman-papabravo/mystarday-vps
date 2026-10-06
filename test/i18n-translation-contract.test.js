'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

const {
  loadLocales,
  auditTranslationContract,
  plural,
  pluralCategory,
  ALLOW_EMPTY_TRANSLATIONS,
  ALLOW_PLACEHOLDER_MISMATCH,
} = require('../src/lib/i18n');

describe('translation contract', () => {
  before(() => {
    loadLocales();
  });

  it('sv-SE and en-GB share keys, non-empty strings, and placeholders', () => {
    const contract = auditTranslationContract();
    assert.equal(contract.ok, true, contract.errors.slice(0, 30).join('\n'));
  });

  it('keeps the known empty-suffix and market-copy exceptions frozen', () => {
    assert.deepEqual([...ALLOW_EMPTY_TRANSLATIONS].sort(), [
      'child.checkoff.score.1',
      'market.choice.hint',
      'today.bump.movedOne',
      'today.emotions.sliderSuffixMany',
      'today.emotions.sliderSuffixOne',
      'today.rating.labels[0]',
    ]);
    assert.deepEqual([...ALLOW_PLACEHOLDER_MISMATCH], []);
  });

  it('rejects empty strings and placeholder drift', () => {
    const broken = auditTranslationContract({
      'sv-SE': { greet: 'Hej {{name}}', empty: '' },
      'en-GB': { greet: 'Hello', empty: 'ok' },
    });
    assert.equal(broken.ok, false);
    assert.ok(broken.errors.some((line) => line.includes('placeholder mismatch greet')));
    assert.ok(broken.errors.some((line) => line.includes('empty in sv-SE: empty')));
  });

  it('plural categories stay one/other for Swedish and English', () => {
    assert.equal(pluralCategory('sv-SE', 1), 'one');
    assert.equal(pluralCategory('sv-SE', 2), 'other');
    assert.equal(pluralCategory('en-GB', 1), 'one');
    assert.equal(pluralCategory('en-GB', 5), 'other');
  });

  it('plural uses one and other on the live schedule strings', () => {
    assert.equal(plural('en-GB', 'schedule.activityCount', 1), '1 activity');
    assert.equal(plural('en-GB', 'schedule.activityCount', 5), '5 activities');
    assert.equal(plural('sv-SE', 'schedule.activityCount', 1), '1 aktivitet');
    assert.equal(plural('sv-SE', 'schedule.activityCount', 5), '5 aktiviteter');
  });
});
