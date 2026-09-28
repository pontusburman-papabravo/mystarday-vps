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

function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => (
    params[name] == null ? '' : String(params[name])
  ));
}

function subscriptionSandbox(lang, map, status) {
  const mountEl = {
    innerHTML: '',
    closest() {
      return { classList: { add() {}, remove() {} } };
    },
  };
  const I18n = {
    lang,
    getCurrentLang() { return lang; },
    getLocale() { return lang; },
    t(key, params) {
      return interpolate(map[key] || key, params);
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
    Auth: { api: async () => status },
    Platform: { isNative() { return true; } },
    IAPManager: {
      init: async () => {},
      canPurchase() { return true; },
      canRestore() { return true; },
    },
    I18n,
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  return { sandbox, mountEl };
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

  it('paywall waits for preferred_locale before init', () => {
    assert.match(paywallHtml, /data-i18n-manual-init="true"/);
    assert.match(paywallJs, /preferred_locale/);
    assert.match(paywallJs, /I18n\.init\(preferredLocale/);
    assert.doesNotMatch(paywallJs, /await I18n\.init\(\);/);
  });

  it('settings subscription re-renders when the displayed locale changes', () => {
    assert.match(subJs, /I18n\.getCurrentLang/);
    assert.match(subJs, /settings\.subscription\.title/);
    assert.match(subJs, /settings\.subscription\.restore/);
    assert.match(subJs, /parent-i18n-ready/);
    assert.match(subJs, /settings-parent-i18n-ready/);
    assert.match(subJs, /locale-changed/);
  });

  it('merged locale bundles expose matching settings.subscription keys', () => {
    loadLocales();
    const keys = [
      'settings.subscription.title',
      'settings.subscription.noPremium',
      'settings.subscription.activate',
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
    assert.equal(getLocale('en-GB').settings.subscription.title, 'Subscription');
    assert.equal(getLocale('sv-SE').settings.subscription.title, 'Prenumeration');
    assert.equal(t('en-GB', 'settings.subscription.noPremium'), 'No active Premium');
    assert.equal(t('en-GB', 'settings.subscription.restore'), 'Restore purchases');
    assert.equal(t('sv-SE', 'settings.subscription.restore'), 'Återställ köp');
  });

  it('renders English subscription card for an en-GB family', async () => {
    const map = {
      'settings.subscription.title': 'Subscription',
      'settings.subscription.noPremium': 'No active Premium',
      'settings.subscription.choosePlan': 'Choose Premium Monthly or Premium Yearly to unlock full access.',
      'settings.subscription.activate': 'Activate Premium',
      'settings.subscription.restore': 'Restore purchases',
      'settings.subscription.manage': 'Manage subscription',
    };
    const { sandbox, mountEl } = subscriptionSandbox('en-GB', map, {
      subscription_ui_visible: true,
      native_purchase_eligible: true,
      native_restore_eligible: true,
      billing_ui_enabled: true,
      premium: { active: false },
    });
    vm.createContext(sandbox);
    vm.runInContext(subJs, sandbox, { filename: 'settings-subscription.js' });
    const result = await sandbox.SettingsSubscription.render(mountEl);
    assert.equal(result.visible, true);
    assert.match(mountEl.innerHTML, /Subscription/);
    assert.match(mountEl.innerHTML, /No active Premium/);
    assert.match(mountEl.innerHTML, /Activate Premium/);
    assert.match(mountEl.innerHTML, /Restore purchases/);
    assert.doesNotMatch(mountEl.innerHTML, /Manage subscription/);
    assert.doesNotMatch(mountEl.innerHTML, /Prenumeration/);
    assert.doesNotMatch(mountEl.innerHTML, /Återställ köp/);
  });

  it('renders Swedish subscription card and a Swedish date for a sv-SE family', async () => {
    const map = {
      'settings.subscription.title': 'Prenumeration',
      'settings.subscription.trialTitle': 'Premium – gratis provperiod',
      'settings.subscription.ends': 'Slutar {{date}}',
      'settings.subscription.restore': 'Återställ köp',
    };
    const { sandbox, mountEl } = subscriptionSandbox('sv-SE', map, {
      subscription_ui_visible: true,
      native_purchase_eligible: true,
      native_restore_eligible: true,
      billing_ui_enabled: true,
      premium: { active: true, trial: true, expires_at: '2026-12-31T12:00:00.000Z' },
    });
    vm.createContext(sandbox);
    vm.runInContext(subJs, sandbox, { filename: 'settings-subscription.js' });
    await sandbox.SettingsSubscription.render(mountEl);
    assert.match(mountEl.innerHTML, />Prenumeration</);
    assert.match(mountEl.innerHTML, /2026-12-31/);
    assert.doesNotMatch(mountEl.innerHTML, />Subscription</);
    assert.doesNotMatch(mountEl.innerHTML, /No active Premium/);
    assert.doesNotMatch(mountEl.innerHTML, /31\/12\/2026/);
  });

  it('formats an en-GB trial end date with the English locale', async () => {
    const map = {
      'settings.subscription.title': 'Subscription',
      'settings.subscription.trialTitle': 'Premium – free trial',
      'settings.subscription.ends': 'Ends {{date}}',
      'settings.subscription.restore': 'Restore purchases',
    };
    const { sandbox, mountEl } = subscriptionSandbox('en-GB', map, {
      subscription_ui_visible: true,
      native_purchase_eligible: true,
      native_restore_eligible: true,
      billing_ui_enabled: true,
      premium: { active: true, trial: true, expires_at: '2026-12-31T12:00:00.000Z' },
    });
    vm.createContext(sandbox);
    vm.runInContext(subJs, sandbox, { filename: 'settings-subscription.js' });
    await sandbox.SettingsSubscription.render(mountEl);
    assert.match(mountEl.innerHTML, /31\/12\/2026/);
    assert.doesNotMatch(mountEl.innerHTML, /2026-12-31/);
    assert.doesNotMatch(mountEl.innerHTML, /Prenumeration/);
  });
});
