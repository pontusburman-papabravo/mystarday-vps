'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('library reward edit mobile overflow menu', () => {
  it('uses openRewardModalById instead of inline JSON in reward edit actions', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/reward-editor.js'), 'utf8');
    assert.match(src, /function openRewardModalById\(id\)/);
    assert.match(src, /rewards\.find\(function \(r\) \{ return String\(r\.id\) === String\(id\); \}\)/);
    assert.match(src, /window\.openRewardModalById = openRewardModalById/);
    assert.match(src, /closeOverflowMenus\(\);openRewardModalById\(\\'/ );
    assert.match(src, /onclick="openRewardModalById\(\\'/);
    assert.doesNotMatch(src, /openRewardModal\(\$\{JSON\.stringify\(r\)/);
    assert.doesNotMatch(src, /openRewardModal\(JSON\.stringify\(r\)/);
  });
});
