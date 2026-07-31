'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('landing mobile layout', () => {
  it('home tab paths exclude public landing / and daily-log sub-page', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/nav-config.js'), 'utf8');
    assert.match(src, /paths: \['\/dashboard'\]/);
    assert.match(src, /PARENT_SHELL_PATHS[\s\S]*'\/daily-log'/);
    assert.doesNotMatch(src, /paths: \['\/dashboard', '\/daily-log'\]/);
  });

  it('native-tab-bar skips public landing page', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
    assert.match(src, /landing-nav/);
    assert.match(src, /landing-page/);
  });

  it('landing mobile menu is scrollable full-height overlay', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/landing.css'), 'utf8');
    assert.match(css, /overflow-y:\s*auto/);
    assert.match(css, /--landing-nav-offset/);
    assert.match(css, /z-index:\s*10350/);
  });

  it('index.html marks landing-page body', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
    assert.match(html, /class="[^"]*landing-page/);
  });
});
