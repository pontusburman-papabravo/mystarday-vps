'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('library reward edit mobile overflow menu', () => {
  it('uses openRewardModalById instead of inline JSON in reward overflow edit', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    assert.match(src, /function openRewardModalById\(id\)/);
    assert.match(src, /window\.openRewardModalById = openRewardModalById/);
    assert.match(src, /closeOverflowMenus\(\);openRewardModalById\('\$\{r\.id\}'\)/);
    assert.doesNotMatch(src, /closeOverflowMenus\(\);openRewardModal\(\$\{JSON\.stringify\(r\)/);
  });
});
