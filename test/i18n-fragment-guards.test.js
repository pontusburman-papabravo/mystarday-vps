'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { FRAGMENT_DOMAINS } = require('../src/lib/i18n');
const { SUPPORTED_LOCALES } = require('../src/lib/locale');
const { findUnregisteredDomains } = require('../scripts/lib/i18n-copy-ratchet');

const FRAGMENTS_DIR = path.join(__dirname, '..', 'config', 'i18n');

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

describe('i18n fragment domain registration', () => {
  it('runtime merge iterates FRAGMENT_DOMAINS from src/lib/i18n.js', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src/lib/i18n.js'), 'utf8');
    assert.match(src, /for \(const domain of FRAGMENT_DOMAINS\)/);
    assert.match(src, /module\.exports = \{[\s\S]*FRAGMENT_DOMAINS/);
  });

  it('supported locales remain sv-SE and en-GB', () => {
    assert.deepEqual([...SUPPORTED_LOCALES], ['sv-SE', 'en-GB']);
  });

  it('every registered fragment domain has sv-SE and en-GB files', () => {
    const result = findUnregisteredDomains(FRAGMENTS_DIR, FRAGMENT_DOMAINS, [...SUPPORTED_LOCALES]);
    assert.deepEqual(result.unregistered, []);
    assert.deepEqual(result.missingPartner, []);
  });

  it('each fragment domain has structural key parity', () => {
    for (const domain of FRAGMENT_DOMAINS) {
      const sv = JSON.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, `${domain}-sv-SE.json`), 'utf8'));
      const en = JSON.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, `${domain}-en-GB.json`), 'utf8'));
      const svKeys = new Set(flattenKeys(sv));
      const enKeys = new Set(flattenKeys(en));
      const missingInEn = [...svKeys].filter((k) => !enKeys.has(k));
      const missingInSv = [...enKeys].filter((k) => !svKeys.has(k));
      assert.deepEqual(missingInEn, [], `${domain}: missing in en-GB`);
      assert.deepEqual(missingInSv, [], `${domain}: missing in sv-SE`);
    }
  });

  it('a disk fragment without fragmentDomains registration fails the guard', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-fragments-'));
    fs.writeFileSync(path.join(dir, 'ghost-sv-SE.json'), '{}');
    fs.writeFileSync(path.join(dir, 'ghost-en-GB.json'), '{}');
    const result = findUnregisteredDomains(dir, FRAGMENT_DOMAINS);
    assert.ok(result.unregistered.some((u) => u.domain === 'ghost'));
  });

  it('a registered domain missing an en-GB partner file fails the guard', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-fragments-'));
    fs.writeFileSync(path.join(dir, 'onboarding-sv-SE.json'), '{}');
    const result = findUnregisteredDomains(dir, ['onboarding']);
    assert.ok(result.missingPartner.some((m) => m.domain === 'onboarding' && m.locale === 'en-GB'));
  });
});
