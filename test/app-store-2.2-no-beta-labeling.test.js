'use strict';

/**
 * Regression guard for the App Store 1.4.3 rejection (Guideline 2.2 — Performance:
 * Beta Testing). Apple flagged the shipped app presenting English as
 * "English BETA" on the first profile-choice screen and on the adult login
 * language switcher. English is a shipped, supported language and
 * must never be labelled beta/preview/test/trial/experimental/early access
 * anywhere in the app.
 *
 * This suite is source-pattern based (matching this repo's existing
 * public/js test convention — see test/schedule-add-menu.test.js) since
 * there is no full browser/jsdom harness for these client modules.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const PRERELEASE_WORDS = /\b(beta|preview|experimental|early access)\b/i;

describe('App Store 2.2 — English must never be labelled beta/preview/test/trial', () => {
  it('locale-switcher.js (adult login + settings + register language control) has no beta badge or hint', () => {
    const src = read('public/js/locale-switcher.js');
    assert.doesNotMatch(src, /beta/i, 'locale-switcher.js must not reference beta anywhere');
    // The English option renders as a plain label, no secondary badge span
    assert.match(src, /data-locale-value="en-GB"[\s\S]{0,120}data-i18n="language\.en-GB">English<\/span>\s*<\/button>/);
  });

  it('language-choice.js (mandatory onboarding language choice) has no beta badge or note', () => {
    const src = read('public/js/language-choice.js');
    // No beta badge/pill markup or beta-labelled i18n keys — the analytics
    // `beta_shown` metadata field is intentionally unchanged (not user-visible copy).
    assert.doesNotMatch(src, /language-choice__beta/, 'no beta badge/note CSS class or element must remain');
    assert.doesNotMatch(src, /language\.choice\.betaNote/, 'must not bind the removed beta-note translation key');
    assert.doesNotMatch(src, />\s*Beta\s*</i, 'must not render a literal "Beta" text node');
    assert.match(src, /data-locale-choice="en-GB">[\s\S]{0,80}<span class="language-choice__label">English<\/span>\s*<\/button>/);
  });

  it('first profile/role-choice screen (login.html ENTRY_ROLE_PICK) mounts the fixed locale switcher', () => {
    const html = read('public/login.html');
    const roleScreen = html.slice(html.indexOf('id="role-selection"'), html.indexOf('end role-selection'));
    assert.match(roleScreen, /data-locale-switcher-mount/, 'role-selection screen must render the language switcher');
  });

  it('adult login screen (login.html ENTRY_ADULT_LOGIN) mounts the fixed locale switcher', () => {
    const html = read('public/login.html');
    const loginScreen = html.slice(
      html.indexOf('id="parent-login-section"'),
      html.indexOf('loginForm')
    );
    assert.match(loginScreen, /data-locale-switcher-mount/, 'adult login screen must render the language switcher');
  });

  it('registration onboarding language choice mounts the fixed component', () => {
    const html = read('public/register.html');
    assert.match(html, /data-language-choice-mount/);
  });

  for (const locale of ['sv-SE', 'en-GB']) {
    it(`${locale}: English language label is a plain "English", no (Beta) suffix`, () => {
      loadLocales();
      assert.equal(t(locale, 'language.en-GB'), 'English');
      assert.equal(t(locale, 'language.sv-SE'), 'Svenska');
    });

    it(`${locale}: removed beta-badge translation keys stay removed`, () => {
      loadLocales();
      // t() falls back to returning the key itself when missing
      assert.equal(t(locale, 'language.betaBadge'), 'language.betaBadge');
      assert.equal(t(locale, 'language.en-GB-beta'), 'language.en-GB-beta');
      assert.equal(t(locale, 'language.choice.betaNote'), 'language.choice.betaNote');
    });

    it(`${locale}: existing-family English offer modal never frames English as beta/test/trial`, () => {
      loadLocales();
      assert.doesNotMatch(t(locale, 'language.offer.title'), PRERELEASE_WORDS);
      assert.doesNotMatch(t(locale, 'language.offer.body'), PRERELEASE_WORDS);
      assert.doesNotMatch(t(locale, 'language.offer.tryEnglish'), PRERELEASE_WORDS);
    });

    it(`${locale}: settings language description never frames English as beta/test/trial`, () => {
      loadLocales();
      assert.doesNotMatch(t(locale, 'settings.language.description'), PRERELEASE_WORDS);
    });

    it(`${locale}: onboarding child-experience note never frames English as beta`, () => {
      loadLocales();
      assert.doesNotMatch(t(locale, 'language.choice.childNote'), PRERELEASE_WORDS);
    });
  }

  it('no remaining user-visible shipped language-selection surface renders a beta/preview/test/trial marker', () => {
    // locale-switcher.js has zero legitimate reason to mention beta at all (no
    // rollout-offer analytics live there), so it gets the strict whole-file check.
    assert.doesNotMatch(read('public/js/locale-switcher.js'), /beta|preview|experimental|early.access/i);
    // language-choice.js keeps its `beta_shown` analytics metadata field (rollout
    // instrumentation, unrelated to visible copy) — check only the rendered markup.
    const src = read('public/js/language-choice.js');
    assert.doesNotMatch(src, /language-choice__beta|>\s*Beta\s*</i);
  });
});
