'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('family image library', () => {
  it('migration adds family_image and image_url columns', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1808690000000_family_image_library.js'),
      'utf8'
    );
    assert.match(src, /family_image/);
    assert.match(src, /activity_template/);
    assert.match(src, /image_url/);
    assert.match(src, /daily_log_item/);
  });

  it('family images API route exists', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/family-images.js'), 'utf8');
    assert.match(src, /GET.*\/images/);
    assert.match(src, /family_image/);
  });

  it('activities schema accepts image_url', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/schemas.js'), 'utf8');
    assert.match(src, /CreateActivitySchema[\s\S]*image_url/);
  });

  it('upload route exposes /image alias', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/upload.js'), 'utf8');
    assert.match(src, /router\.post\('\/image'/);
  });

  it('library has bildarkiv UI and scripts', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/library.html'), 'utf8');
    assert.match(html, /familyImageGrid/);
    assert.match(html, /familyImageArchive/);
    assert.match(html, /library-images\.js/);
    assert.match(html, /activity-visual\.js/);
  });

  it('library magic hub exports switchTab on window', () => {
    const lib = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    const hub = fs.readFileSync(path.join(ROOT, 'public/js/library-magic-hub.js'), 'utf8');
    assert.match(lib, /window\.switchTab\s*=\s*switchTab/);
    assert.match(hub, /data-library-section.*bilder|menuCard\('bilder'\)/);
  });

  it('daily log generator snapshots image_url', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/daily-log-generator.js'), 'utf8');
    assert.match(src, /image_url/);
    assert.match(src, /COALESCE\(dli\.image_url, at\.image_url\)/);
  });
});
