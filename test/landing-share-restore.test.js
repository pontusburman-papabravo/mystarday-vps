'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('landing share restore', () => {
  it('index.html exposes Tipsa controls with icon system assets', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
    assert.match(html, /data-landing-share/);
    assert.match(html, /landing-nav__tipsa/);
    assert.match(html, /landing-tipsa-fixed/);
    assert.match(html, /icon-system\.css/);
    assert.match(html, /icon-system\.js/);
    assert.match(html, /landing-share\.js/);
    assert.match(html, /mobile-nav\.css/);
  });

  it('landing-share.js opens public share popup flow', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/landing-share.js'), 'utf8');
    assert.match(src, /LandingShare/);
    assert.match(src, /share-popup-overlay/);
    assert.match(src, /\/api\/contact/);
    assert.match(src, /landing_share_click/);
  });

  it('landing-events tracks landing_share_click', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/landing-events.js'), 'utf8');
    assert.match(src, /landing_share_click/);
  });
});
