'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadLocales, t, getLocale } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('subscription follows family language', () => {
  const i18nJs = read('public/js/i18n.js');
  const subJs = read('public/js/settings-subscription.js');
  const paywallJs = read('public/js/paywall.js');
  const paywallHtml = read('public/paywall.html');

  it('client I18n.getLocale aliases getCurrentLang', () => {
    assert.match(i18nJs, /getCurrentLang\(\) \{/);
    assert.match(i18nJs, /getLocale\(\) \{\s*return this\.getCurrentLang\(\);/);
  });

  it('paywall does not auto-init against navigator before auth locale is known', () => {
    assert.match(paywallHtml, /data-i18n-manual-init="true"/);
    assert.match(paywallJs, /preferred_locale/);
    assert.match(paywallJs, /I18n\.init\(preferredLocale/);
    assert.doesNotMatch(paywallJs, /await I18n\.init\(\);/);
  });

  it('settings-subscription reads getCurrentLang and settings.subscription keys', () => {
    assert.match(subJs, /I18n\.getCurrentLang/);
    assert.match(subJs, /settings\.subscription\.heading/);
    assert.match(subJs, /settings\.subscription\.restore/);
    assert.match(subJs, /settings\.subscription\.manage/);
    assert.match(subJs, /parent-i18n-ready/);
    assert.match(subJs, /locale-changed/);
    assert.match(subJs, /Prenumeration/);
    assert.match(subJs, /Återställ köp/);
    assert.match(subJs, /Hantera abonnemang/);
  });

  it('merged locale bundles expose matching settings.subscription keys', () => {
    loadLocales();
    const keys = [
      'settings.subscription.heading',
      'settings.subscription.inactiveTitle',
      'settings.subscription.activateCta',
      'settings.subscription.grandfatheredTitle',
      'settings.subscription.restore',
      'settings.subscription.manage',
      'settings.subscription.restoreSuccess',
    ];
    for (const key of keys) {
      const sv = t('sv-SE', key);
      const en = t('en-GB', key);
      assert.notEqual(sv, key, `missing sv-SE ${key}`);
      assert.notEqual(en, key, `missing en-GB ${key}`);
      assert.notEqual(sv, en, `${key} must differ between sv-SE and en-GB`);
    }
    assert.equal(getLocale('en-GB').settings.subscription.heading, 'Subscription');
    assert.equal(getLocale('sv-SE').settings.subscription.heading, 'Prenumeration');
    assert.equal(t('en-GB', 'settings.subscription.restore'), 'Restore purchases');
    assert.equal(t('sv-SE', 'settings.subscription.restore'), 'Återställ köp');
  });

  it('renders English subscription card when I18n is en-GB', async () => {
    const mountEl = {
      innerHTML: '',
      closest() {
        return { classList: { add() {}, remove() {} } };
      },
    };
    const I18n = {
      lang: 'en-GB',
      getCurrentLang() { return 'en-GB'; },
      getLocale() { return 'en-GB'; },
      t(key) {
        const map = {
          'settings.subscription.heading': 'Subscription',
          'settings.subscription.inactiveTitle': 'No active Premium',
          'settings.subscription.inactiveBody': 'Activate Premium for full access to the app.',
          'settings.subscription.activateCta': 'Activate Premium',
          'settings.subscription.restore': 'Restore purchases',
          'settings.subscription.manage': 'Manage subscription',
        };
        return map[key] || key;
      },
    };
    const sandbox = {
      console,
      document: {
        readyState: 'loading',
        getElementById(id) {
          return id === 'subscriptionMount' ? mountEl : null;
        },
        addEventListener() {},
      },
      Auth: {
        api: async () => ({
          subscription_ui_visible: true,
          native_purchase_eligible: true,
          billing_ui_enabled: true,
          premium: { active: false },
        }),
      },
      Platform: { isNative() { return true; } },
      IAPManager: {
        init: async () => {},
        canPurchase() { return true; },
        restorePurchases: async () => ({ ok: false }),
      },
      I18n,
    };
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(subJs, sandbox, { filename: 'settings-subscription.js' });

    const result = await sandbox.SettingsSubscription.render(mountEl);
    assert.equal(result.visible, true);
    assert.match(mountEl.innerHTML, /Subscription/);
    assert.match(mountEl.innerHTML, /Restore purchases/);
    assert.match(mountEl.innerHTML, /Manage subscription/);
    assert.match(mountEl.innerHTML, /No active Premium/);
    assert.doesNotMatch(mountEl.innerHTML, /Prenumeration/);
    assert.doesNotMatch(mountEl.innerHTML, /Återställ köp/);
    assert.doesNotMatch(mountEl.innerHTML, /Hantera abonnemang/);
  });
});
