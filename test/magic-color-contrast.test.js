'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('magic color contrast', () => {
  it('for-dig section titles are light on parent magic dark', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/for-dig.css'), 'utf8');
    const common = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /for-dig-section-title[\s\S]*#f4f4ff/);
    assert.match(common, /for-dig-section-title[\s\S]*#f4f4ff !important/);
  });

  it('child profile tabs use semantic child-profile-tab classes', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/child-profile.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(js, /child-profile-tab/);
    assert.match(js, /is-active/);
    assert.match(css, /#childProfileTabBar \.child-profile-tab\.is-active/);
    assert.match(css, /#childProfileTabBar \.child-profile-tab:not\(\.is-active\)/);
  });

  it('premium v2 uses transparent icons without white tile backgrounds', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/icon-system.css'), 'utf8');
    assert.match(css, /Premium Icon System v2/);
    assert.doesNotMatch(css, /rgba\(255, 255, 255, 0\.94\)/);
    assert.match(css, /drop-shadow/);
  });
});
