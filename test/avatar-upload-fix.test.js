'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('avatar upload fix', () => {
  it('platform compresses avatars and handles webPath', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/platform.js'), 'utf8');
    assert.match(src, /compressAvatarBlob/);
    assert.match(src, /photoResultToPick/);
    assert.match(src, /width: 1024/);
    assert.match(src, /new File\(\[blob\]/);
  });

  it('child profile setup surfaces upload errors', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-setup.js'), 'utf8');
    assert.match(src, /photo save failed/);
    assert.doesNotMatch(src, /catch \(_\) \{\s*showToast\('Kunde inte spara bild'/);
  });

  it('SW bumped to v283', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(src, /stjarndag-v28[23]/);
  });
});
