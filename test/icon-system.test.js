'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('icon-system v2', () => {
  it('icon-system.js exposes render helpers and nav keys', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/icon-system.js'), 'utf8');
    assert.match(src, /window\.IconSystem/);
    assert.match(src, /hem: 'navigation\/hem\.svg'/);
    assert.match(src, /notiser: 'parent\/notiser\.svg'/);
    assert.match(src, /childFallback/);
  });

  it('nav-config uses icon keys instead of emoji', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/nav-config.js'), 'utf8');
    assert.match(src, /icon: 'hem'/);
    assert.match(src, /icon: 'schema'/);
    assert.match(src, /icon: 'beloningar'/);
    assert.match(src, /icon: 'for-dig'/);
    assert.match(src, /icon: 'familj'/);
    assert.match(src, /icon: 'installningar'/);
    assert.doesNotMatch(src, /icon: '🏠'/);
  });

  it('platform-html injects icon-system before nav-config', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    const iconIdx = src.indexOf('icon-system.js');
    const navIdx = src.indexOf('nav-config.js');
    assert.ok(iconIdx > -1 && navIdx > iconIdx);
    assert.match(src, /icon-system\.css/);
  });

  it('manifest is premium v2', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'public/img/stjarnadag-icons/manifest.json'), 'utf8')
    );
    assert.equal(manifest.version, '2.0.0');
    assert.ok(manifest.icons.length >= 60);
  });

  it('manifest icons exist on disk', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'public/img/stjarnadag-icons/manifest.json'), 'utf8')
    );
    assert.ok(manifest.icons.length >= 60);
    for (const entry of manifest.icons) {
      const filePath = path.join(ROOT, 'public/img/stjarnadag-icons', entry.path);
      assert.ok(fs.existsSync(filePath), 'missing ' + entry.path);
    }
  });
});
