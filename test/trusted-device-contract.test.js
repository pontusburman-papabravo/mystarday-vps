'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('R4.2 trusted device contracts', () => {
  it('child-login loads trusted-device-client before native restore', () => {
    const html = read('public/child-login.html');
    const trustedIdx = html.indexOf('trusted-device-client.js');
    const nativeIdx = html.indexOf('native-child-session-restore.js');
    assert.ok(trustedIdx > 0 && nativeIdx > 0);
    assert.ok(trustedIdx < nativeIdx);
  });

  it('native restore calls TrustedDeviceClient.tryRestoreSession', () => {
    const src = read('public/js/native-child-session-restore.js');
    assert.match(src, /TrustedDeviceClient\.tryRestoreSession/);
  });

  it('family routes mount trusted-devices after requireParent', () => {
    const idx = read('src/routes/family/index.js');
    const parentGate = idx.indexOf('requireParent');
    const trusted = idx.indexOf("require('./trusted-devices')");
    assert.ok(parentGate > 0 && trusted > parentGate);
  });
});
