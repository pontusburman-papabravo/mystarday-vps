'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  evaluateParentSettingsEnglishPass,
  evaluateChildTodaySessionPass,
  hasEnglishChildTodaySurfaceCopy,
  hasSwedishChildTodaySurfaceCopy,
} = require('../scripts/ops/founder-smoke-browser-child.cjs');

const ROOT = path.join(__dirname, '..');

describe('founder smoke english UI contract', () => {
  it('parent settings en-GB passes when family/settings copy is English', () => {
    const r = evaluateParentSettingsEnglishPass({
      settingsReachable: true,
      me: { type: 'parent', preferred_locale: 'en-GB' },
      htmlLang: 'en',
      bodyText: 'Settings\nFamily settings\nLanguage\nProfile\nSave family settings',
      diagnostics: {
        parent_i18n_ready: true,
        pathname: '/settings',
        readyState: 'complete',
        html_lang: 'en',
        settings_title_text: 'Settings',
        family_save_text: 'Save family settings',
      },
    });
    assert.equal(r.pass, true);
    assert.equal(r.english_family_copy, true);
    assert.equal(r.no_swedish_familjeinställningar_leak, true);
  });

  it('parent settings en-GB fails on Swedish familjeinställningar leak', () => {
    const r = evaluateParentSettingsEnglishPass({
      settingsReachable: true,
      me: { type: 'parent', preferred_locale: 'en-GB' },
      htmlLang: 'en',
      bodyText: 'Familjeinställningar\nSpråk',
    });
    assert.equal(r.pass, false);
    assert.equal(r.no_swedish_familjeinställningar_leak, false);
  });

  it('child Today en-GB fails when only weak today/daily copy without main surface', () => {
    assert.equal(hasEnglishChildTodaySurfaceCopy('Today\nDaily log', ''), false);
  });

  it('child Today en-GB passes with Mission plus Treasure Chest nav copy', () => {
    const main = 'Mission\nNow\nNext';
    const nav = 'Treasure Chest';
    assert.equal(hasEnglishChildTodaySurfaceCopy(main, nav), true);
    const r = evaluateChildTodaySessionPass({
      pathname: '/child/today',
      me: {
        type: 'child',
        username: 'astrid921',
        child_ui_locale: 'en-GB',
        english_child_experience_enabled: true,
      },
      expectedUsername: 'astrid921',
      expectedChildUiLocale: 'en-GB',
      mainText: main,
      navText: nav,
      childTodayI18nReady: true,
      htmlLang: 'en-GB',
    });
    assert.equal(r.pass, true);
  });

  it('child Today en-GB passes with Mission/Now/Next and nav copy', () => {
    const main = 'Mission\nNow\nNext\nLater';
    const nav = 'My collection';
    assert.equal(hasEnglishChildTodaySurfaceCopy(main, nav), true);
    const r = evaluateChildTodaySessionPass({
      pathname: '/child/today',
      me: { type: 'child', username: 'astrid921', child_ui_locale: 'en-GB' },
      expectedUsername: 'astrid921',
      expectedChildUiLocale: 'en-GB',
      mainText: main,
      navText: nav,
      childTodayI18nReady: true,
      htmlLang: 'en-GB',
    });
    assert.equal(r.pass, true);
  });

  it('child Today sv-SE control still requires Swedish surface copy', () => {
    const r = evaluateChildTodaySessionPass({
      pathname: '/child/today',
      me: { type: 'child', username: 'astrid921', child_ui_locale: 'sv-SE' },
      expectedUsername: 'astrid921',
      expectedChildUiLocale: 'sv-SE',
      todayBodyText: 'Idag\nMorgon',
    });
    assert.equal(r.pass, true);
    assert.equal(hasSwedishChildTodaySurfaceCopy('Idag\nMorgon'), true);
  });

  it('settings page loads parent i18n bootstrap scripts', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
    assert.match(html, /parent-app-i18n\.js/);
    assert.match(html, /settings-parent-i18n\.js/);
    assert.match(html, /bootSettingsParentI18n/);
  });

  it('child dashboard loads child today i18n bootstrap', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.match(html, /child-today-i18n-bootstrap\.js/);
  });
});
