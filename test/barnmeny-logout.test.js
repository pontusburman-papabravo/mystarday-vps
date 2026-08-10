const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('child logout / switch (barnmeny v2)', () => {
  it('parental-gate falls back to Auth._showParentPinGateOverlay on child pages', () => {
    const src = read('public/js/parental-gate.js');
    assert.match(src, /Auth\._showParentPinGateOverlay/);
  });

  it('Fas 4A: trusted daily UX removes child logout from normal chrome', () => {
    const chrome = read('public/js/child-trusted-chrome.js');
    assert.match(chrome, /logoutBtn/);
    const settings = read('public/js/child-settings-view.js');
    assert.match(settings, /ChildTrustedChrome\.isDailyUxActive/);
  });

  it('child-dashboard exposes switchChildMember for profile context switch', () => {
    const src = read('public/js/child-dashboard.js');
    assert.match(src, /window\.switchChildMember\s*=\s*switchChildMember/);
  });
});
