'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('i18n store beta build versions', () => {
  it('iOS marketing version is 1.4.6 (1.4.5 train is closed)', () => {
    const pbx = fs.readFileSync(
      path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj'),
      'utf8'
    );
    assert.match(pbx, /CURRENT_PROJECT_VERSION = 30;/);
    assert.match(pbx, /MARKETING_VERSION = 1\.4\.6;/);
    assert.doesNotMatch(pbx, /MARKETING_VERSION = 1\.4\.5;/);
    assert.doesNotMatch(pbx, /MARKETING_VERSION = 1\.4\.4;/);
    assert.doesNotMatch(pbx, /MARKETING_VERSION = 1\.4\.3;/);
  });

  it('Android versionCode 15 for 1.4.5 native release (Play AAB brand-name fix)', () => {
    const ver = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'assets/play-store/android-version.json'), 'utf8')
    );
    assert.equal(ver.versionCode, 15);
    assert.equal(ver.versionName, '1.4.5');
  });

  it('beta phase documentation exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/i18n-store-beta-builds.md')));
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/i18n-beta-rollout-plan.md')));
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/app-store-connect-metadata-en-GB.md')));
  });
});
