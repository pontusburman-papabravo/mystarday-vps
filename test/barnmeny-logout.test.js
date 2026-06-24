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

  it('child-system-menu keeps logout and switch header buttons visible', () => {
    const src = read('public/js/child-system-menu.js');
    assert.doesNotMatch(src, /logoutBtn.*style\.display/);
    assert.doesNotMatch(src, /switchChildBtn.*style\.display/);
  });

  it('child-dashboard exposes logout/switch on window for system menu', () => {
    const src = read('public/js/child-dashboard.js');
    assert.match(src, /window\.childLogout\s*=\s*childLogout/);
    assert.match(src, /window\.switchChildMember\s*=\s*switchChildMember/);
  });
});
