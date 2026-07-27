'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

describe('child locale parity', () => {
  it('child-en-GB.json and child-sv-SE.json share the same keys', () => {
    const root = path.join(__dirname, '..', 'config', 'i18n');
    const en = JSON.parse(fs.readFileSync(path.join(root, 'child-en-GB.json'), 'utf8'));
    const sv = JSON.parse(fs.readFileSync(path.join(root, 'child-sv-SE.json'), 'utf8'));
    const enKeys = new Set(flattenKeys(en));
    const svKeys = new Set(flattenKeys(sv));
    const missingInSv = [...enKeys].filter((k) => !svKeys.has(k));
    const missingInEn = [...svKeys].filter((k) => !enKeys.has(k));
    assert.deepEqual(missingInSv, [], `missing in sv-SE: ${missingInSv.join(', ')}`);
    assert.deepEqual(missingInEn, [], `missing in en-GB: ${missingInEn.join(', ')}`);
  });
});
