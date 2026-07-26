'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('give extra stars modal contrast', () => {
  it('dashboard giveStarsCount field has explicit readable classes', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/dashboard.html'), 'utf8');
    assert.match(html, /id="giveStarsCount"[\s\S]*text-navy/);
    assert.match(html, /id="giveStarsCount"[\s\S]*bg-white/);
  });

  it('magic CSS styles number inputs on dark shell', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /input\[type="number"\]/);
    assert.match(css, /#giveStarsModal #giveStarsCount/);
    assert.match(css, /#manualStarModal input/);
  });

  it('light magic theme keeps dark text on give-stars modal', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /parent-theme-light #giveStarsModal #giveStarsCount/);
    assert.match(css, /color: #1b2340 !important/);
  });

  it('dark magic shell gives ledig dag modal a solid panel background', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(css, /#ledigDagModal > div[\s\S]*#141432/);
  });
});
