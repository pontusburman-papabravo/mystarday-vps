'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('Fas 4B — device settings contracts', () => {
  it('settings page mounts Den här enheten section', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
    assert.match(html, /id="thisDeviceSection"/);
    assert.match(html, /settings-this-device\.js/);
    assert.doesNotMatch(html, /settings-trusted-devices\.js/);
  });

  it('analytics allowlist includes device setup events', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/analytics.js'), 'utf8');
    for (const ev of [
      'device_setup_shown',
      'device_role_selected',
      'device_start_mode_changed',
      'device_access_revoked',
    ]) {
      assert.match(src, new RegExp("'" + ev + "'"));
    }
  });

  it('PATCH update only touches family_trusted_device (no widget tables)', () => {
    const db = fs.readFileSync(path.join(ROOT, 'db/family-trusted-device.js'), 'utf8');
    assert.match(db, /updateDeviceSettings/);
    assert.doesNotMatch(db, /widget/);
    const settings = fs.readFileSync(path.join(ROOT, 'src/lib/trusted-device-settings.js'), 'utf8');
    assert.doesNotMatch(settings, /widget/);
  });

  it('dashboard loads device setup prompt', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/dashboard.html'), 'utf8');
    assert.match(html, /device-setup-prompt\.js/);
  });
});
