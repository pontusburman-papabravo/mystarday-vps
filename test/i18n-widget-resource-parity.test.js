'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_XML = path.join(
  ROOT,
  'plugins/capacitor-widget-bridge/android/src/main/res/values/strings.xml'
);
const EN_XML = path.join(
  ROOT,
  'plugins/capacitor-widget-bridge/android/src/main/res/values-en-rGB/strings.xml'
);

/**
 * Known en-rGB key drift. Must stay empty — add English strings instead of growing this list.
 */
const ALLOWED_MISSING_IN_EN_GB = Object.freeze([]);

function readXmlKeys(filePath) {
  const xml = fs.readFileSync(filePath, 'utf8');
  const keys = [];
  const re = /<string name="([^"]+)">/g;
  let m;
  while ((m = re.exec(xml)) !== null) keys.push(m[1]);
  return keys;
}

describe('Android widget string resource parity', () => {
  it('default and en-rGB templates exist', () => {
    assert.ok(fs.existsSync(DEFAULT_XML));
    assert.ok(fs.existsSync(EN_XML));
  });

  it('does not introduce new key drift beyond the PR-0 allowlist', () => {
    const def = readXmlKeys(DEFAULT_XML);
    const en = new Set(readXmlKeys(EN_XML));
    const allowed = new Set(ALLOWED_MISSING_IN_EN_GB);
    const missing = def.filter((k) => !en.has(k));
    const unexpected = missing.filter((k) => !allowed.has(k));
    const staleAllow = ALLOWED_MISSING_IN_EN_GB.filter((k) => en.has(k) || !def.includes(k));
    assert.deepEqual(unexpected, [], `new widget keys missing in en-rGB: ${unexpected.join(', ')}`);
    assert.deepEqual(staleAllow, [], `stale widget allowlist entries: ${staleAllow.join(', ')}`);
  });

  it('en-rGB has full key parity with default values', () => {
    const def = readXmlKeys(DEFAULT_XML);
    const en = new Set(readXmlKeys(EN_XML));
    assert.deepEqual(def.filter((k) => !en.has(k)), []);
    assert.equal(ALLOWED_MISSING_IN_EN_GB.length, 0);
  });

  it('en-rGB does not invent keys absent from default values', () => {
    const def = new Set(readXmlKeys(DEFAULT_XML));
    const extra = readXmlKeys(EN_XML).filter((k) => !def.has(k));
    assert.deepEqual(extra, []);
  });
});
