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

  it('MVP migration defines 7 adventures + part grant table', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1808930000000_build_mvp_adventures.js'),
      'utf8'
    );
    assert.match(src, /husdjur/);
    assert.match(src, /dockhus/);
    assert.match(src, /fiske/);
    assert.match(src, /laxor/);
    assert.match(src, /vardag/);
    assert.match(src, /build_part_grant/);
  });

  it('build-adventures lib lists 7 MVP slugs', () => {
    const { MVP_ADVENTURE_SLUGS, BUILD_PARTS_REQUIRED } = require('../src/lib/build-adventures');
    assert.equal(MVP_ADVENTURE_SLUGS.length, 7);
    assert.equal(BUILD_PARTS_REQUIRED, 75);
    assert.ok(MVP_ADVENTURE_SLUGS.includes('vardag'));
  });

  it('build-loop route mounted under /api/me/build', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /\/api\/me\/build/);
    assert.match(src, /\/child\/garage/);
    assert.match(src, /\/child\/play\/:slug/);
    assert.match(src, /\/child\/adventures/);
  });

  it('garage page uses brand CSS and child auth', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/build-garage.html'), 'utf8');
    assert.match(html, /build-garage\.css/);
    assert.match(html, /build-game-mobile\.js/);
    assert.match(html, /auth\.js/);
    assert.match(html, /build-car-hero\.png/);
  });

  it('child build hype + ceremony + world map on dashboard', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.match(html, /child-build-hype\.js/);
    assert.match(html, /child-build-ceremony\.js/);
    assert.match(html, /child-world-map\.js/);
  });

  it('build-progress lib exposes milestones at 75', () => {
    const bp = require('../src/lib/build-progress');
    assert.deepEqual(bp.BUILD_MILESTONES, [15, 30, 45, 60, 75]);
    assert.equal(bp.getStageForParts('racerbil', 75).key, 'done');
  });

  it('garage workshop CSS hides overlay when [hidden]', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/build-garage.css'), 'utf8');
    assert.match(css, /\.garage-workshop\[hidden\][\s\S]*display:\s*none\s*!important/);
  });

  it('workshop updateArena does not redeclare step (TDZ)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/build-garage-workshop.js'), 'utf8');
    const fn = src.slice(src.indexOf('function updateArena'), src.indexOf('function refresh'));
    assert.equal((fn.match(/const step/g) || []).length, 1);
  });

  it('normalizeCustomization clamps tune and cleanliness', () => {
    const { normalizeCustomization } = require('../src/lib/build-catalog');
    const c = normalizeCustomization({ cleanliness: 200, tune_level: 9, color_id: 'bogus' });
    assert.equal(c.cleanliness, 100);
    assert.equal(c.tune_level, 5);
    assert.equal(c.color_id, 'racer_red');
  });
});
