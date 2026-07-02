'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('child bottom nav — barnmeny v2 visibility', () => {
  it('shows bottom nav when child-worlds-v2 or child-has-bottom-nav is active', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/child-bottom-nav.css'), 'utf8');
    assert.match(css, /body\.child-worlds-v2 \.child-bottom-nav/);
    assert.match(css, /body\.child-has-bottom-nav \.child-bottom-nav/);
    assert.match(css, /display:\s*flex/);
  });

  it('child-dashboard keeps bottom-nav class when v2 worlds enabled', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard.js'), 'utf8');
    assert.match(src, /ChildWorlds\.V2_ENABLED/);
    assert.match(src, /showChildBottomNav/);
  });

  it('app-view-mode keeps bottom-nav class for v2 child chrome', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/app-view-mode.js'), 'utf8');
    assert.match(src, /ChildWorlds\.V2_ENABLED/);
    assert.match(src, /childBottomNav/);
  });
});
