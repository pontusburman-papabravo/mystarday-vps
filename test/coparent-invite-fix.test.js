const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('co-parent invite fix', () => {
  it('settings has co-parent invite section and init', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
    assert.match(html, /id="coParentInviteSection"/);
    assert.match(html, /bootSettingsCoParent/);
    assert.match(html, /coparent-invite-ui\.js/);
  });

  it('magic settings tags co-parent section under family group', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-hubs.js'), 'utf8');
    assert.match(src, /tagChild\('coParentInviteSection', 'family'\)/);
  });

  it('co-parent invite available via Familj and readiness API', () => {
    const core = fs.readFileSync(path.join(ROOT, 'src/routes/family/core.js'), 'utf8');
    const readiness = fs.readFileSync(path.join(ROOT, 'public/js/home-readiness.js'), 'utf8');
    assert.match(core, /pending_invite/);
    assert.match(readiness, /pending_invite/);
  });

  it('medforalder modal has opaque magic panel class', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/dashboard.html'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(html, /medforalderCtaModal[\s\S]*magic-modal-panel/);
    assert.match(css, /\.magic-modal-panel/);
    assert.match(css, /#medforalderCtaModal/);
  });

  it('SW bumped to v293', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(sw, /stjarndag-v(?:29[3-9]|[3-9]\d\d|\d{4,})/);
  });
});
