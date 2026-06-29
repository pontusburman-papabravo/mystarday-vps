'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('build garage customization', () => {
  it('migration defines child_build_project + catalog', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1808920000000_child_build_garage.js'),
      'utf8'
    );
    assert.match(src, /child_build_project/);
    assert.match(src, /build_project_catalog/);
    assert.match(src, /racerbil/);
  });

  it('build-loop route mounted under /api/me/build', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /\/api\/me\/build/);
    assert.match(src, /\/child\/garage/);
  });

  it('garage page uses brand CSS and child auth', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/build-garage.html'), 'utf8');
    assert.match(html, /build-garage\.css/);
    assert.match(html, /auth\.js/);
    assert.match(html, /build-car-hero\.png/);
  });

  it('normalizeCustomization clamps tune and cleanliness', () => {
    const { normalizeCustomization } = require('../src/lib/build-catalog');
    const c = normalizeCustomization({ cleanliness: 200, tune_level: 9, color_id: 'bogus' });
    assert.equal(c.cleanliness, 100);
    assert.equal(c.tune_level, 5);
    assert.equal(c.color_id, 'racer_red');
  });
});
