'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('För dig magic contrast', () => {
  it('parent-magic-common overrides for-dig-section-title on dark shell', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /\.for-dig-section-title[\s\S]*#f4f4ff/);
    assert.match(css, /\.for-dig-recommend-highlight[\s\S]*rgba\(244, 244, 255/);
  });

  it('for-dig.css mirrors magic shell section title colors', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/for-dig.css'), 'utf8');
    assert.match(css, /parent-magic-view:not\(\.parent-theme-light\) \.for-dig-section-title/);
    assert.match(css, /#f4f4ff/);
  });

  it('for-dig.html bumps stylesheet cache versions', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/for-dig.html'), 'utf8');
    assert.match(html, /parent-magic-common\.css\?v=15/);
    assert.match(html, /for-dig\.css\?v=5/);
  });
});
