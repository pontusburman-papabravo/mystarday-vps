const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('co-parent invite fix', () => {
  it('settings has co-parent invite section and init', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
    assert.match(html, /id="coParentInviteSection"/);
    assert.match(html, /initCoParentInviteSection/);
    assert.match(html, /\/api\/family\/invite/);
  });

  it('magic settings tags co-parent section under family group', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-hubs.js'), 'utf8');
    assert.match(src, /tagChild\('coParentInviteSection', 'family'\)/);
  });

  it('dashboard home hub renders co-parent CTA', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/dashboard-home-hub.js'), 'utf8');
    assert.match(src, /renderCoParentCta/);
    assert.match(src, /invite-coparent/);
    assert.match(src, /openMedforalderCtaInvite/);
  });

  it('medforalder modal has opaque magic panel class', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/dashboard.html'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
    assert.match(html, /medforalderCtaModal[\s\S]*magic-modal-panel/);
    assert.match(css, /\.magic-modal-panel/);
    assert.match(css, /#medforalderCtaModal/);
  });

  it('SW bumped to v292', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(sw, /stjarndag-v292/);
  });
});
