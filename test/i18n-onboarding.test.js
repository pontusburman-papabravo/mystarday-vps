'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { loadLocales, compareLocaleStructures, t, plural, getLocale } = require('../src/lib/i18n');

const FRAGMENTS_DIR = path.join(__dirname, '../config/i18n');
const SWEDISH_RE = /[åäöÅÄÖ]/;

function flattenStrings(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flattenStrings(v, key));
    } else if (typeof v === 'string') {
      out.push({ key, value: v });
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'string') out.push({ key: `${key}[${i}]`, value: item });
      });
    }
  }
  return out;
}

describe('onboarding locale fragments', () => {
  it('sv-SE and en-GB have identical key structure', () => {
    const sv = JSON.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, 'onboarding-sv-SE.json'), 'utf8'));
    const en = JSON.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, 'onboarding-en-GB.json'), 'utf8'));
    const svKeys = flattenStrings(sv).map((x) => x.key).sort();
    const enKeys = flattenStrings(en).map((x) => x.key).sort();
    assert.deepEqual(enKeys, svKeys);
  });

  it('no empty English onboarding values', () => {
    const en = JSON.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, 'onboarding-en-GB.json'), 'utf8'));
    const empty = flattenStrings(en).filter((x) => !x.value.trim());
    assert.equal(empty.length, 0, `Empty keys: ${empty.map((x) => x.key).join(', ')}`);
  });

  it('English onboarding strings avoid obvious Swedish (åäö)', () => {
    const en = JSON.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, 'onboarding-en-GB.json'), 'utf8'));
    const swedishHits = flattenStrings(en).filter((x) => SWEDISH_RE.test(x.value));
    assert.equal(swedishHits.length, 0, swedishHits.slice(0, 5).map((x) => `${x.key}: ${x.value}`).join('\n'));
  });

  it('merged bundles expose onboarding.* via getLocale', () => {
    loadLocales();
    const en = getLocale('en-GB');
    assert.ok(en.onboarding?.common?.brand);
    assert.equal(en.onboarding.common.brand, 'My Starday');
    const sv = getLocale('sv-SE');
    assert.ok(sv.onboarding?.common?.brand);
  });
});

describe('onboarding server messages', () => {
  loadLocales();

  it('returns English error for en-GB family', () => {
    const msg = t('en-GB', 'onboarding.errors.childNameRequired');
    assert.match(msg, /name/i);
    assert.doesNotMatch(msg, SWEDISH_RE);
  });

  it('returns Swedish error for sv-SE', () => {
    const msg = t('sv-SE', 'onboarding.errors.childNameRequired');
    assert.match(msg, /namn/i);
  });

  it('plural helper works for reward count', () => {
    const one = plural('en-GB', 'onboarding.rewards.selectCount', 1, { count: 1 });
    const many = plural('en-GB', 'onboarding.rewards.selectCount', 3, { count: 3 });
    assert.notEqual(one, many);
    assert.match(one, /1/);
    assert.match(many, /3/);
  });
});

describe('onboarding HTML i18n wiring', () => {
  it('loads i18n scripts and manual init flag', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/onboarding.html'), 'utf8');
    assert.match(html, /onboarding-i18n\.js/);
    assert.match(html, /data-i18n-manual-init="true"/);
    assert.match(html, /data-i18n-title="onboarding\.pageTitle\.welcome"/);
  });

  it('onboarding.js initializes i18n after auth', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/onboarding.js'), 'utf8');
    assert.match(js, /initOnboardingI18n/);
    assert.match(js, /onboarding-i18n-ready/);
  });
});

describe('locale structure parity (full bundles)', () => {
  it('main sv-SE / en-GB bundles remain aligned', () => {
    loadLocales();
    const { missingInEn, missingInSv } = compareLocaleStructures();
    assert.deepEqual(missingInEn, []);
    assert.deepEqual(missingInSv, []);
  });
});
