'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('landing dagens nyhet banner', () => {
  it('index uses fixed top chrome wrapper (no duplicate banner)', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
    assert.match(html, /id="landingTopChrome"/);
    assert.match(html, /landing-dagens-nyhet\.css/);
    assert.match(html, /landing-dagens-nyhet\.js/);
    assert.equal((html.match(/id="dagensNyhetBanner"/g) || []).length, 1);
    assert.doesNotMatch(html, /dagensNyhetBanner[^>]*position:fixed/);
  });

  it('chrome CSS stacks nav and banner in flow', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/landing-dagens-nyhet.css'), 'utf8');
    assert.match(css, /\.landing-top-chrome/);
    assert.match(css, /position:\s*fixed/);
    assert.match(css, /#dagensNyhetBanner/);
  });

  it('banner script syncs spacer via chrome height', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/landing-dagens-nyhet.js'), 'utf8');
    assert.match(js, /syncChromeSpacer/);
    assert.match(js, /ResizeObserver/);
    assert.match(js, /landingTopChrome/);
  });
});
