'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('node:path');

const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Home journey coach i18n', () => {
  loadLocales();

  const modules = [
    'public/js/engine-coach.js',
    'public/js/engine-voice.js',
    'public/js/engine-coach-change.js',
    'public/js/journey-first-week.js',
    'public/js/journey-parent-ack.js',
  ];

  for (const file of modules) {
    it(`${file} uses pt() — no hardcoded Swedish coach copy`, () => {
      const src = read(file);
      assert.match(src, /function pt\(/);
      assert.doesNotMatch(src, /\bNästa steg\b/);
      assert.doesNotMatch(src, /\bNytt\b/);
      assert.doesNotMatch(src, /Stäng förklaring/);
      assert.doesNotMatch(src, /Barnet klarade en aktivitet/);
      assert.doesNotMatch(src, /Låt barnet testa sin rutin/);
    });
  }

  it('engine-voice maps all engine policies via journey.engineVoice.*', () => {
    const policies = [
      'SHOW_CHILD',
      'ADD_EVENING',
      'INVITE_CO_PARENT',
      'SIMPLIFY_ROUTINE',
      'CUSTOMIZE_ROUTINE',
      'TRIGGER_CELEBRATION',
    ];
    for (const policy of policies) {
      const headline = t('en-GB', 'journey.engineVoice.' + policy + '.headline');
      assert.ok(headline && headline.length > 2, policy + ' headline');
      assert.doesNotMatch(headline, /[åäöÅÄÖ]/, headline);
      const cta = t('en-GB', 'journey.engineVoice.' + policy + '.cta');
      assert.ok(cta && cta.length > 1, policy + ' cta');
      assert.doesNotMatch(cta, /[åäöÅÄÖ]/, cta);
    }
  });

  it('en-GB journey coach chrome is English', () => {
    assert.equal(t('en-GB', 'journey.coach.nextStep'), 'Next step');
    assert.equal(t('en-GB', 'journey.coachChange.badgeNew'), 'New');
    assert.equal(t('en-GB', 'journey.ack.defaultCta'), 'Got it');
    assert.match(
      t('en-GB', 'journey.coachChange.releases.coach_primary_v1.userVisibleIntent'),
      /next step/i
    );
  });

  it('sv-SE journey coach chrome stays Swedish', () => {
    assert.equal(t('sv-SE', 'journey.coach.nextStep'), 'Nästa steg');
    assert.equal(t('sv-SE', 'journey.coachChange.badgeNew'), 'Nytt');
    assert.equal(t('sv-SE', 'journey.ack.defaultCta'), 'Det ser jag');
  });
});
