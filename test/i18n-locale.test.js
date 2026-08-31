'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeLocale,
  validateLocale,
  parseAcceptLanguage,
  resolvePreAuthLocale,
  resolveFamilyLocale,
  journeyLocaleCandidates,
  experiencePackIdForLocale,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
} = require('../src/lib/locale');

const { loadLocales, t, getLocale, compareLocaleStructures } = require('../src/lib/i18n');
const { loadDefaultContent } = require('../src/lib/default-content');

describe('locale normalization', () => {
  it('normalizes legacy aliases', () => {
    assert.equal(normalizeLocale('sv'), 'sv-SE');
    assert.equal(normalizeLocale('en'), 'en-GB');
    assert.equal(normalizeLocale('sv-SE'), 'sv-SE');
    assert.equal(normalizeLocale('en-GB'), 'en-GB');
  });

  it('rejects unsupported locales', () => {
    assert.equal(normalizeLocale('fr-FR'), null);
    assert.equal(normalizeLocale(''), null);
  });

  it('maps fi-FI to sv-SE (Finland Swedish-speaking market, no Finnish locale)', () => {
    assert.equal(normalizeLocale('fi-FI'), 'sv-SE');
    assert.equal(parseAcceptLanguage('fi-FI'), 'sv-SE');
  });

  it('validateLocale falls back to sv-SE', () => {
    assert.equal(validateLocale('bogus'), DEFAULT_LOCALE);
    assert.equal(validateLocale('en-GB'), 'en-GB');
  });
});

describe('Accept-Language resolution', () => {
  it('prefers en-GB when listed first', () => {
    assert.equal(parseAcceptLanguage('en-GB,sv-SE;q=0.9'), 'en-GB');
  });

  it('falls back to sv from base language', () => {
    assert.equal(parseAcceptLanguage('sv'), 'sv-SE');
  });

  it('resolvePreAuthLocale uses explicit over header', () => {
    assert.equal(resolvePreAuthLocale({
      explicit: 'en-GB',
      acceptLanguage: 'sv-SE',
    }), 'en-GB');
  });

  it('resolvePreAuthLocale defaults to sv-SE', () => {
    assert.equal(resolvePreAuthLocale({}), DEFAULT_LOCALE);
  });
});

describe('family locale', () => {
  it('resolveFamilyLocale never auto-switches', () => {
    assert.equal(resolveFamilyLocale('en-GB'), 'en-GB');
    assert.equal(resolveFamilyLocale(null), DEFAULT_LOCALE);
  });

  it('journeyLocaleCandidates includes legacy sv', () => {
    assert.ok(journeyLocaleCandidates('sv-SE').includes('sv'));
    assert.ok(journeyLocaleCandidates('en-GB').includes('en-GB'));
  });

  it('experiencePackIdForLocale defaults en-GB to child_se until child flag on', () => {
    assert.equal(experiencePackIdForLocale('en-GB'), 'child_se');
    assert.equal(
      experiencePackIdForLocale('en-GB', { englishChildExperienceEnabled: true }),
      'child_en'
    );
    assert.equal(experiencePackIdForLocale('sv-SE'), 'child_se');
  });

  it('loads child_en experience pack with en-GB locale', () => {
    const { loadPack, clearPackCache } = require('../src/lib/experience-pack');
    clearPackCache();
    const pack = loadPack('child_en');
    assert.equal(pack.manifest.pack_id, 'child_en');
    assert.equal(pack.manifest.locale, 'en-GB');
    assert.ok(pack.copy.experiences.parent_ack_completion);
    clearPackCache();
  });
});

describe('i18n bundles', () => {
  it('loads sv-SE and en-GB with matching structure', () => {
    loadLocales();
    assert.ok(SUPPORTED_LOCALES.every((l) => Object.keys(getLocale(l)).length > 0));
    const { missingInEn, missingInSv } = compareLocaleStructures();
    assert.deepEqual(missingInEn, [], `en-GB missing keys: ${missingInEn.join(', ')}`);
    assert.deepEqual(missingInSv, [], `sv-SE missing keys: ${missingInSv.join(', ')}`);
  });

  it('t() returns en-GB app name when key exists', () => {
    loadLocales();
    const result = t('en-GB', 'app.name');
    assert.equal(result, 'My Starday');
  });

  it('getLocale merges en-GB over sv-SE fallback', () => {
    loadLocales();
    const en = getLocale('en-GB');
    assert.equal(en.app.name, 'My Starday');
  });
});

describe('default content loader', () => {
  it('loads locale-specific activities', () => {
    const sv = loadDefaultContent('sv-SE');
    const en = loadDefaultContent('en-GB');
    assert.equal(sv.activities.length, en.activities.length);
    assert.notEqual(sv.activities[0].name, en.activities[0].name);
  });

  it('falls back unknown locale to sv-SE', () => {
    const content = loadDefaultContent('xx-XX');
    assert.equal(content.locale, 'sv-SE');
  });
});
