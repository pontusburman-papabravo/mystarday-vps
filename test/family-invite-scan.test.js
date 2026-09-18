'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'public/js/family-invite-scan.js'), 'utf8');

function loadScan(origin) {
  const sandbox = {
    window: { location: { origin: origin || 'https://example.test' } },
    document: {
      readyState: 'loading',
      addEventListener() {},
      getElementById() { return null; },
    },
    URL,
    console,
  };
  sandbox.window.document = sandbox.document;
  vm.runInNewContext(SRC, sandbox);
  return sandbox.window.FamilyInviteScan;
}

describe('family invite QR paste', () => {
  it('does not use native window.prompt', () => {
    assert.doesNotMatch(SRC, /window\.prompt\s*\(/);
    assert.match(SRC, /family\.scanQr\.title/);
    assert.match(SRC, /familyScanInviteModal/);
  });

  it('sets the paste-field hint via .placeholder (release-compliance SAFE context)', () => {
    assert.match(SRC, /\.placeholder\s*=/);
    assert.doesNotMatch(SRC, /setAttribute\(\s*['"]placeholder['"]/);
  });

  it('family.js awaits the paste sheet and maps invalid copy', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/family.js'), 'utf8');
    assert.match(js, /await FamilyInviteScan\.scanAdultQrInteractive\(\)/);
    assert.match(js, /family\.scanQr\.invalid/);
  });

  it('parseQrPayload reads email, mailto, and invite URLs', () => {
    const scan = loadScan();
    assert.equal(scan.parseQrPayload('parent@example.com').email, 'parent@example.com');
    assert.equal(scan.parseQrPayload('mailto:parent@example.com?subject=hi').email, 'parent@example.com');
    assert.equal(scan.parseQrPayload('https://example.test/invite/abc123').inviteToken, 'abc123');
    assert.equal(scan.parseQrPayload('/invite/token-one').inviteToken, 'token-one');
    assert.equal(scan.parseQrPayload('not-a-payload').email, undefined);
    assert.equal(scan.parseQrPayload('not-a-payload').inviteToken, undefined);
  });
});
