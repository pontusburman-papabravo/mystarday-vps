'use strict';

/** @typedef {'SUCCESS_LOCALE_SETTINGS_UI' | 'SUCCESS_LOCALE_SETTINGS_UI_AFTER_REMOUNT' | 'SETTINGS_FAMILY_GROUP_NOT_OPEN' | 'LOCALE_SWITCHER_NOT_MOUNTED' | 'LOCALE_TARGET_NOT_FOUND' | 'LOCALE_TARGET_DISABLED' | 'LOCALE_SETTINGS_REQUEST_NOT_SENT' | 'LOCALE_SETTINGS_API_FAILED' | 'LOCALE_API_UPDATED_UI_NOT_UPDATED' | 'LOCALE_UI_UPDATED_API_NOT_UPDATED' | 'LOCALE_RELOAD_PERSISTENCE_FAILED' | 'LOCALE_RESTORE_FAILED' | 'LOCALE_UI_STATE_NOT_SYNCHRONIZED'} LocaleClassification */

const LOCALE_CLASSIFICATIONS = {
  SUCCESS_LOCALE_SETTINGS_UI: 'SUCCESS_LOCALE_SETTINGS_UI',
  SUCCESS_LOCALE_SETTINGS_UI_AFTER_REMOUNT: 'SUCCESS_LOCALE_SETTINGS_UI_AFTER_REMOUNT',
  SETTINGS_FAMILY_GROUP_NOT_OPEN: 'SETTINGS_FAMILY_GROUP_NOT_OPEN',
  LOCALE_SWITCHER_NOT_MOUNTED: 'LOCALE_SWITCHER_NOT_MOUNTED',
  LOCALE_TARGET_NOT_FOUND: 'LOCALE_TARGET_NOT_FOUND',
  LOCALE_TARGET_DISABLED: 'LOCALE_TARGET_DISABLED',
  LOCALE_SETTINGS_REQUEST_NOT_SENT: 'LOCALE_SETTINGS_REQUEST_NOT_SENT',
  LOCALE_SETTINGS_API_FAILED: 'LOCALE_SETTINGS_API_FAILED',
  LOCALE_API_UPDATED_UI_NOT_UPDATED: 'LOCALE_API_UPDATED_UI_NOT_UPDATED',
  LOCALE_UI_UPDATED_API_NOT_UPDATED: 'LOCALE_UI_UPDATED_API_NOT_UPDATED',
  LOCALE_RELOAD_PERSISTENCE_FAILED: 'LOCALE_RELOAD_PERSISTENCE_FAILED',
  LOCALE_RESTORE_FAILED: 'LOCALE_RESTORE_FAILED',
  LOCALE_UI_STATE_NOT_SYNCHRONIZED: 'LOCALE_UI_STATE_NOT_SYNCHRONIZED',
};

const DETERMINISTIC_LOCALE_CLASSIFICATIONS = new Set([
  LOCALE_CLASSIFICATIONS.LOCALE_TARGET_NOT_FOUND,
  LOCALE_CLASSIFICATIONS.LOCALE_TARGET_DISABLED,
  LOCALE_CLASSIFICATIONS.SETTINGS_FAMILY_GROUP_NOT_OPEN,
  LOCALE_CLASSIFICATIONS.LOCALE_SETTINGS_API_FAILED,
  LOCALE_CLASSIFICATIONS.LOCALE_API_UPDATED_UI_NOT_UPDATED,
  LOCALE_CLASSIFICATIONS.LOCALE_UI_UPDATED_API_NOT_UPDATED,
  LOCALE_CLASSIFICATIONS.LOCALE_SETTINGS_REQUEST_NOT_SENT,
  LOCALE_CLASSIFICATIONS.LOCALE_RELOAD_PERSISTENCE_FAILED,
  LOCALE_CLASSIFICATIONS.LOCALE_RESTORE_FAILED,
]);

const TRANSIENT_MOUNT_CLASSIFICATIONS = new Set([
  LOCALE_CLASSIFICATIONS.LOCALE_SWITCHER_NOT_MOUNTED,
  LOCALE_CLASSIFICATIONS.SETTINGS_FAMILY_GROUP_NOT_OPEN,
]);

/**
 * @param {{ preferredLocale?: string | null, i18n?: string | null, htmlLang?: string | null }} snap
 * @param {string} locale
 */
function isLocaleFullySynchronized(snap, locale) {
  const html = (snap.htmlLang || '').toLowerCase();
  const expectedHtml = locale.toLowerCase();
  return snap.preferredLocale === locale
    && snap.i18n === locale
    && html === expectedHtml;
}

/**
 * @param {{ preferredLocale?: string | null, i18n?: string | null, htmlLang?: string | null }} snap
 * @param {string} locale
 */
function isApiLocaleSynchronized(snap, locale) {
  return snap.preferredLocale === locale;
}

/**
 * @param {string | null | undefined} classification
 */
function isDeterministicLocaleFailure(classification) {
  return Boolean(classification && DETERMINISTIC_LOCALE_CLASSIFICATIONS.has(classification));
}

/**
 * @param {string | null | undefined} classification
 */
function allowsSingleMountRecovery(classification) {
  return Boolean(classification && TRANSIENT_MOUNT_CLASSIFICATIONS.has(classification));
}

/**
 * @param {object} dom
 */
function sanitizeLocaleSwitcherDiagnostics(dom) {
  return {
    requestedLocale: dom.requestedLocale,
    startLocale: dom.startLocale || null,
    currentApiLocale: dom.currentApiLocale,
    currentI18nLocale: dom.currentI18nLocale,
    pagePath: dom.pagePath,
    mountCount: dom.mountCount,
    buttons: (dom.buttons || []).map((b) => ({
      locale: b.locale,
      visible: b.visible,
      disabled: b.disabled,
      ariaPressed: b.ariaPressed,
    })),
    timeoutPhase: dom.timeoutPhase || null,
  };
}

/**
 * @param {{ status?: number, preferredLocaleUpdated?: boolean, requestedLocale?: string }} raw
 */
function sanitizeSettingsNetworkEvidence(raw) {
  return {
    status: raw.status ?? null,
    preferredLocaleUpdated: Boolean(raw.preferredLocaleUpdated),
    requestedLocale: raw.requestedLocale || null,
  };
}

class LocaleHarnessError extends Error {
  /**
   * @param {string} classification
   * @param {string} message
   * @param {object} [diagnostics]
   */
  constructor(classification, message, diagnostics = {}) {
    super(message);
    this.name = 'LocaleHarnessError';
    this.classification = classification;
    this.diagnostics = diagnostics;
  }
}

/**
 * In-browser: collect locale switcher button state (no credentials).
 */
const LOCALE_SWITCHER_DOM_PROBE = `
(() => {
  const mounts = [...document.querySelectorAll('[data-locale-switcher-mount]')];
  const mount = mounts.find((m) => m.offsetParent !== null) || mounts[0] || null;
  const readBtn = (loc) => {
    const btn = mount
      ? mount.querySelector('[data-locale-value="' + loc + '"]')
      : document.querySelector('[data-locale-value="' + loc + '"]');
    if (!btn) return { locale: loc, visible: false, disabled: true, ariaPressed: null };
    return {
      locale: loc,
      visible: btn.offsetParent !== null && !btn.hidden,
      disabled: Boolean(btn.disabled),
      ariaPressed: btn.getAttribute('aria-pressed'),
    };
  };
  return {
    pagePath: window.location.pathname,
    mountCount: mounts.length,
    mountVisible: Boolean(mount && mount.offsetParent !== null),
    buttons: ['en-GB', 'sv-SE'].map(readBtn),
    familyGroupVisible: Boolean(
      document.querySelector('[data-magic-settings-content="family"]')
      && document.querySelector('[data-magic-settings-content="family"]').offsetParent !== null
    ),
    htmlLang: document.documentElement.lang || null,
    i18n: window.I18n && typeof I18n.getCurrentLang === 'function' ? I18n.getCurrentLang() : null,
  };
})()
`;

module.exports = {
  LOCALE_CLASSIFICATIONS,
  LocaleHarnessError,
  isLocaleFullySynchronized,
  isApiLocaleSynchronized,
  isDeterministicLocaleFailure,
  allowsSingleMountRecovery,
  sanitizeLocaleSwitcherDiagnostics,
  sanitizeSettingsNetworkEvidence,
  LOCALE_SWITCHER_DOM_PROBE,
};
