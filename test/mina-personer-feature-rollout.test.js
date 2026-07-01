'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIG = path.join(ROOT, 'migrations/1809190000000_mina_personer_10_10_feature.js');

describe('mina_personer_10_10 feature rollout', () => {
  it('migration registers dev feature and allowlists pontus@burman.cc', () => {
    const src = fs.readFileSync(MIG, 'utf8');
    assert.match(src, /mina_personer_10_10/);
    assert.match(src, /status = 'dev'/);
    assert.match(src, /pontus@burman\.cc/i);
    assert.match(src, /family_features/);
  });
});
