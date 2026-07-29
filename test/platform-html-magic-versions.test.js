'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('platform-html magic asset versions', () => {
  it('rewrites stale magic CSS/JS query strings on serve', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /bumpMagicAssetVersions/);
    assert.match(src, /parent-magic-auto\.js\?v=/);
    assert.match(src, /app-view-toggle\.css\?v=/);
    assert.match(src, /dashboard-magic\.css\?v=/);
    assert.match(src, /MAGIC_VERSION = '28'/);
  });

  it('dashboard HTML references bumped parent-magic-auto', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/dashboard.html'), 'utf8');
    assert.match(html, /parent-magic-auto\.js\?v=10/);
  });
});
