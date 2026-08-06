/**
 * RC-1 R2 — library image archive upload/copy uses i18n (en-GB parity).
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('i18n library images (RC-1 R2)', () => {
  it('library-images.js uses lpt() and avoids hardcoded Swedish UI strings', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library-images.js'), 'utf8');
    assert.match(src, /function lpt\(/);
    assert.doesNotMatch(src, /'[^']*[åäöÅÄÖ][^']*'/);
    assert.doesNotMatch(src, /`[^`]*[åäöÅÄÖ][^`]*`/);
  });

  it('library.images keys exist in sv-SE and en-GB with matching structure', () => {
    const sv = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/i18n/library-sv-SE.json'), 'utf8'));
    const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/i18n/library-en-GB.json'), 'utf8'));
    assert.ok(sv.images && en.images);
    const keys = Object.keys(sv.images).sort();
    assert.deepEqual(keys, Object.keys(en.images).sort());
    assert.equal(en.images.uploadBtn, '📷 Upload image');
    assert.match(en.images.uploading, /Uploading/);
    assert.match(en.images.deleteConfirm, /Remove this image/);
  });

  it('library.html wires data-i18n on image archive upload chrome', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/library.html'), 'utf8');
    assert.match(html, /data-i18n="library\.images\.uploadBtn"/);
    assert.match(html, /data-i18n-placeholder="library\.images\.labelPlaceholder"/);
  });
});
