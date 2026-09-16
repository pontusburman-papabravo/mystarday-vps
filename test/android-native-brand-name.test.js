'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('Android native brand name (Play launcher / Billing sheet)', () => {
  it('install-android-l10n and cap:sync:android wire the brand helper', () => {
    const install = fs.readFileSync(path.join(ROOT, 'scripts/install-android-l10n.mjs'), 'utf8');
    const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
    const verify = fs.readFileSync(path.join(ROOT, 'scripts/verify-android-native.mjs'), 'utf8');
    assert.match(install, /native-brand-name\.mjs/);
    assert.match(install, /patchAndroidResStrings/);
    assert.match(pkg, /install-android-l10n\.mjs/);
    assert.match(verify, /assertAndroidStringsHaveRealBrand/);
  });

  it('replaces the cloud placeholder with Swedish and English launcher names', async () => {
    const {
      swedishBrandName,
      englishBrandName,
      applyNativeBrandToStringsXml,
      assertAndroidStringsHaveRealBrand,
      BRAND_PLACEHOLDER,
    } = await import('../scripts/lib/native-brand-name.mjs');

    assert.equal(swedishBrandName().includes('REDACTED'), false);
    assert.equal(englishBrandName(), 'My Starday');
    assert.equal(swedishBrandName().startsWith('Min '), true);
    assert.ok(swedishBrandName().length >= 10);

    const template = fs.readFileSync(
      path.join(ROOT, 'scripts/android/l10n/res/values-sv/strings.xml'),
      'utf8'
    );
    assert.equal(template.includes(BRAND_PLACEHOLDER), true);

    const sv = applyNativeBrandToStringsXml(template, 'values-sv');
    const en = applyNativeBrandToStringsXml(
      fs.readFileSync(path.join(ROOT, 'scripts/android/l10n/res/values-en-rGB/strings.xml'), 'utf8'),
      'values-en-rGB'
    );
    assert.equal(assertAndroidStringsHaveRealBrand(sv, 'sv'), swedishBrandName());
    assert.equal(assertAndroidStringsHaveRealBrand(en, 'en-GB'), englishBrandName());
    assert.equal(sv.includes(BRAND_PLACEHOLDER), false);
    assert.equal(en.includes(BRAND_PLACEHOLDER), false);
    assert.match(sv, /använder kameran/);
    assert.match(en, /uses the camera/);
  });

  it('installAndroidL10n patches default + overlay strings.xml in a fake android tree', async () => {
    const { installAndroidL10n } = await import('../scripts/install-android-l10n.mjs');
    const {
      swedishBrandName,
      englishBrandName,
      extractAndroidString,
      BRAND_PLACEHOLDER,
    } = await import('../scripts/lib/native-brand-name.mjs');

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'android-brand-'));
    try {
      fs.cpSync(path.join(ROOT, 'scripts/android/l10n'), path.join(tmp, 'scripts/android/l10n'), {
        recursive: true,
      });
      const valuesDir = path.join(tmp, 'android/app/src/main/res/values');
      fs.mkdirSync(valuesDir, { recursive: true });
      fs.writeFileSync(
        path.join(valuesDir, 'strings.xml'),
        `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">${BRAND_PLACEHOLDER}</string>\n    <string name="title_activity_main">${BRAND_PLACEHOLDER}</string>\n</resources>\n`
      );

      const patched = installAndroidL10n(tmp);
      assert.ok(patched.length >= 3, `expected default+sv+en-GB, got ${patched.length}`);

      const sv = fs.readFileSync(
        path.join(tmp, 'android/app/src/main/res/values-sv/strings.xml'),
        'utf8'
      );
      const en = fs.readFileSync(
        path.join(tmp, 'android/app/src/main/res/values-en-rGB/strings.xml'),
        'utf8'
      );
      const def = fs.readFileSync(path.join(valuesDir, 'strings.xml'), 'utf8');
      assert.equal(extractAndroidString(sv, 'app_name'), swedishBrandName());
      assert.equal(extractAndroidString(en, 'app_name'), englishBrandName());
      assert.equal(extractAndroidString(def, 'app_name'), swedishBrandName());
      for (const xml of [sv, en, def]) {
        assert.equal(xml.includes(BRAND_PLACEHOLDER), false);
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
