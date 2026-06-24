const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('co-parent invite button fix', () => {
  it('coparent-invite-ui.js provides portal modal and settings boot', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/coparent-invite-ui.js'), 'utf8');
    assert.match(src, /coParentInviteModal/);
    assert.match(src, /document\.body\.appendChild/);
    assert.match(src, /openCoParentInviteModal/);
    assert.match(src, /ParentMagicPageBoot\.register\('settings'/);
    assert.match(src, /openMedforalderCtaInvite/);
  });

  it('router loads coparent script for dashboard, family, settings', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    assert.match(router, /settings:\s*\[['"]\/js\/coparent-invite-ui\.js/);
    assert.match(router, /family:[\s\S]*coparent-invite-ui\.js/);
    assert.match(router, /dashboard:[\s\S]*coparent-invite-ui\.js/);
  });

  it('settings uses open button not orphaned inline form', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
    assert.match(html, /id="coParentInviteOpenBtn"/);
    assert.match(html, /bootSettingsCoParent/);
    assert.doesNotMatch(html, /id="coParentInviteForm"/);
  });

  it('family buttons call openCoParentInviteModal', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/family.html'), 'utf8');
    assert.match(html, /openCoParentInviteModal\(\)/);
    assert.match(html, /coparent-invite-ui\.js/);
  });

  it('SW bumped to v293', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(sw, /stjarndag-v(?:29[3-9]|[3-9]\d\d|\d{4,})/);
  });
});
