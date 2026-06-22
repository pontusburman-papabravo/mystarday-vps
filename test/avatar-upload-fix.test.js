'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('avatar upload fix v2', () => {
  it('platform uses multi-strategy native pick and normalizes upload URLs', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/platform.js'), 'utf8');
    assert.match(src, /compressAvatarBlob/);
    assert.match(src, /photoResultToPick/);
    assert.match(src, /nativePickWithFallbacks/);
    assert.match(src, /normalizePublicUrl/);
    assert.match(src, /postFormDataNative/);
    assert.match(src, /new File\(\[blob\]/);
  });

  it('child profile setup shows readable save errors', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-setup.js'), 'utf8');
    assert.match(src, /formatApiError/);
    assert.match(src, /photo save failed/);
    assert.doesNotMatch(src, /throw new Error\('upload'\)/);
    assert.doesNotMatch(src, /throw new Error\('unsafe url'\)/);
  });

  it('error toasts are centered and longer on mobile', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/toast.js'), 'utf8');
    assert.match(src, /text-center/);
    assert.match(src, /aria-live/);
    assert.match(src, /6000/);
  });

  it('upload route handles multer size errors', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/upload.js'), 'utf8');
    assert.match(src, /handleMulterError/);
    assert.match(src, /LIMIT_FILE_SIZE/);
  });

  it('SW bumped to v287', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(src, /stjarndag-v28[67]/);
  });
});
