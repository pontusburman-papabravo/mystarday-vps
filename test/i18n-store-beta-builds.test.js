'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('i18n store beta build versions', () => {
  it('iOS build 30 / marketing 1.4.3 for English Beta native l10n', () => {
    const pbx = fs.readFileSync(
      path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj'),
      'utf8'
    );
    assert.match(pbx, /CURRENT_PROJECT_VERSION = 30;/);
    assert.match(pbx, /MARKETING_VERSION = 1\.4\.3;/);
  });

  it('Android versionCode 12 for 1.4 native release (1.4.0)', () => {
    const ver = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'assets/play-store/android-version.json'), 'utf8')
    );
    assert.equal(ver.versionCode, 12);
    assert.equal(ver.versionName, '1.4.0');
  });

  it('beta phase documentation exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/i18n-store-beta-builds.md')));
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/i18n-beta-rollout-plan.md')));
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/app-store-connect-metadata-en-GB.md')));
  });
});
