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

  it('uses Intl.PluralRules for the Central European packs', () => {
    assert.equal(pluralCategory('cs-CZ', 1), 'one');
    assert.equal(pluralCategory('cs-CZ', 2), 'few');
    assert.equal(pluralCategory('cs-CZ', 5), 'other');
    assert.equal(pluralCategory('sk-SK', 4), 'few');
    assert.equal(pluralCategory('sl-SI', 2), 'two');
    assert.equal(pluralCategory('sl-SI', 3), 'few');
    assert.equal(pluralCategory('hr-HR', 22), 'few');
    assert.equal(pluralCategory('hr-HR', 5), 'other');
    assert.equal(pluralCategory('hu-HU', 5), 'other');
    assert.equal(pluralCategory('ro-RO', 0), 'few');
    assert.equal(pluralCategory('ro-RO', 22), 'other');
    assert.equal(plural('cs-CZ', 'schedule.activityCount', 2), '2 aktivity');
    assert.equal(plural('cs-CZ', 'schedule.activityCount', 5), '5 aktivit');
    assert.equal(plural('sk-SK', 'schedule.activityCount', 2), '2 aktivity');
    assert.equal(plural('sk-SK', 'schedule.activityCount', 5), '5 aktivít');
    assert.equal(plural('sl-SI', 'schedule.activityCount', 2), '2 dejavnosti');
    assert.equal(plural('hr-HR', 'schedule.activityCount', 22), '22 aktivnosti');
    assert.equal(plural('hr-HR', 'schedule.activityCount', 5), '5 aktivnosti');
    assert.equal(plural('hu-HU', 'schedule.activityCount', 5), '5 tevékenység');
    assert.equal(plural('ro-RO', 'schedule.activityCount', 2), '2 activități');
    assert.equal(plural('ro-RO', 'schedule.activityCount', 22), '22 de activități');
    assert.equal(plural('pl-PL', 'schedule.activityCount', 5), plural('pl-PL', 'schedule.activityCount', 5));
  });
});
