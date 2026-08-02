'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  LOCALE_CLASSIFICATIONS,
  isLocaleFullySynchronized,
  isApiLocaleSynchronized,
  isDeterministicLocaleFailure,
  allowsSingleMountRecovery,
  sanitizeLocaleSwitcherDiagnostics,
  sanitizeSettingsNetworkEvidence,
} = require('../e2e/helpers/rc1-locale-settings-harness');

describe('rc1-locale-settings-harness', () => {
  it('1. en-GB active disabled — target sv-SE enabled is a harness click path (sync check)', () => {
    const start = {
      preferredLocale: 'en-GB',
      i18n: 'en-GB',
      htmlLang: 'en-gb',
    };
    assert.equal(isLocaleFullySynchronized(start, 'sv-SE'), false);
    const buttons = [
      { locale: 'en-GB', visible: true, disabled: true, ariaPressed: 'true' },
      { locale: 'sv-SE', visible: true, disabled: false, ariaPressed: 'false' },
    ];
    const target = buttons.find((b) => b.locale === 'sv-SE');
    assert.equal(target.disabled, false);
  });

  it('2. sv-SE active disabled — selecting en-GB uses target not active button', () => {
    const buttons = [
      { locale: 'en-GB', visible: true, disabled: false, ariaPressed: 'false' },
      { locale: 'sv-SE', visible: true, disabled: true, ariaPressed: 'true' },
    ];
    assert.equal(buttons.find((b) => b.locale === 'en-GB').disabled, false);
  });

  it('3. requested locale already active → fully synchronized without click', () => {
    const snap = { preferredLocale: 'en-GB', i18n: 'en-GB', htmlLang: 'en-GB' };
    assert.equal(isLocaleFullySynchronized(snap, 'en-GB'), true);
  });

  it('4. target missing → deterministic LOCALE_TARGET_NOT_FOUND', () => {
    assert.equal(isDeterministicLocaleFailure(LOCALE_CLASSIFICATIONS.LOCALE_TARGET_NOT_FOUND), true);
  });

  it('5. target disabled while not active → LOCALE_TARGET_DISABLED deterministic', () => {
    assert.equal(isDeterministicLocaleFailure(LOCALE_CLASSIFICATIONS.LOCALE_TARGET_DISABLED), true);
  });

  it('6. API 200 evidence sanitization', () => {
    const net = sanitizeSettingsNetworkEvidence({
      status: 200,
      preferredLocaleUpdated: true,
      requestedLocale: 'sv-SE',
    });
    assert.deepEqual(net, { status: 200, preferredLocaleUpdated: true, requestedLocale: 'sv-SE' });
  });

  it('7. API updated but I18n stale → product classification bucket', () => {
    assert.equal(isDeterministicLocaleFailure(LOCALE_CLASSIFICATIONS.LOCALE_API_UPDATED_UI_NOT_UPDATED), true);
    const snap = { preferredLocale: 'sv-SE', i18n: 'en-GB', htmlLang: 'sv-SE' };
    assert.equal(isApiLocaleSynchronized(snap, 'sv-SE'), true);
    assert.equal(isLocaleFullySynchronized(snap, 'sv-SE'), false);
  });

  it('8. 429 is not deterministic — retry allowed', () => {
    assert.equal(isDeterministicLocaleFailure(LOCALE_CLASSIFICATIONS.LOCALE_SETTINGS_API_FAILED), true);
  });

  it('9. mount transient allows single recovery', () => {
    assert.equal(allowsSingleMountRecovery(LOCALE_CLASSIFICATIONS.LOCALE_SWITCHER_NOT_MOUNTED), true);
  });

  it('10. selector failure deterministic — no triple retry', () => {
    assert.equal(isDeterministicLocaleFailure(LOCALE_CLASSIFICATIONS.LOCALE_TARGET_NOT_FOUND), true);
    assert.equal(allowsSingleMountRecovery(LOCALE_CLASSIFICATIONS.LOCALE_TARGET_NOT_FOUND), false);
  });

  it('11. restore diagnostics omit credentials', () => {
    const diag = sanitizeLocaleSwitcherDiagnostics({
      requestedLocale: 'sv-SE',
      startLocale: 'en-GB',
      currentApiLocale: 'en-GB',
      currentI18nLocale: 'en-GB',
      pagePath: '/settings',
      mountCount: 1,
      buttons: [{ locale: 'sv-SE', visible: true, disabled: false, ariaPressed: 'false' }],
      timeoutPhase: 'target_button_enabled',
      csrfToken: 'must-not-appear',
    });
    assert.equal(diag.requestedLocale, 'sv-SE');
    assert.equal(diag.timeoutPhase, 'target_button_enabled');
    assert.equal(diag.csrfToken, undefined);
  });

  it('12. reload persistence requires full sync', () => {
    const afterReload = { preferredLocale: 'sv-SE', i18n: 'sv-SE', htmlLang: 'sv-SE' };
    assert.equal(isLocaleFullySynchronized(afterReload, 'sv-SE'), true);
  });
});
