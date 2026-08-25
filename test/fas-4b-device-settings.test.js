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

  it('Magic Settings exposes "Den här enheten" as its own top-level group + deep link', () => {
    const hubs = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-hubs.js'), 'utf8');
    // Group is registered and the legacy section is tagged into it (not left untagged).
    assert.match(hubs, /id:\s*'device'/);
    assert.match(hubs, /tagChild\('thisDeviceSection',\s*'device'\)/);
    // Deep link (#this-device) opens the group — matches device-setup-prompt.js.
    assert.match(hubs, /'this-device'/);
    assert.match(hubs, /showSettingsGroup\('device'\)/);
  });

  it('E: settings.groups.device translation parity across sv-SE and en-GB', () => {
    const sv = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/i18n/settings-sv-SE.json'), 'utf8'));
    const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/i18n/settings-en-GB.json'), 'utf8'));
    for (const [locale, doc] of [['sv-SE', sv], ['en-GB', en]]) {
      const device = doc.groups && doc.groups.device;
      assert.ok(device, 'missing groups.device in ' + locale);
      assert.ok(device.title && device.title.trim(), 'empty device.title in ' + locale);
      assert.ok(device.sub && device.sub.trim(), 'empty device.sub in ' + locale);
    }
    // Real translations, not a shared Swedish fallback leaking into English UI.
    assert.equal(sv.groups.device.title, 'Den här enheten');
    assert.equal(en.groups.device.title, 'This device');
    assert.notEqual(sv.groups.device.sub, en.groups.device.sub);
  });
});
