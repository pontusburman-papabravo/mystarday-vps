/**
 * child-app-i18n.js — Child UI locale bootstrap.
 * Canonical locale: family preferred_locale + english_child_experience flag.
 * When flag is OFF, child UI stays sv-SE even for en-GB families.
 */
(function childAppI18nModule() {
  'use strict';

  var _childUiLocale = 'sv-SE';
  var _englishChildEnabled = false;

  function resolveChildUiLocale(preferredLocale, englishChildEnabled) {
    var locale = String(preferredLocale || 'sv-SE').trim();
    if (locale === 'en-GB' && englishChildEnabled === true) {
      return 'en-GB';
    }
    return 'sv-SE';
  }

  function applyPageTitle() {
    if (!window.I18n) return;
    var titleKey = document.body && document.body.dataset && document.body.dataset.i18nTitle;
    if (!titleKey) return;
    var translated = I18n.t(titleKey);
    if (translated && translated !== titleKey) {
      document.title = translated;
    }
  }

  function applyChildDom() {
    if (!window.I18n) return;
    I18n.apply();
    applyPageTitle();
  }

  /**
   * @param {{ preferredLocale?: string, englishChildEnabled?: boolean }} [opts]
   * @returns {Promise<string>}
   */
  async function initChildAppI18n(opts) {
    if (!window.I18n) return 'sv-SE';
    var preferred = (opts && opts.preferredLocale) || null;
    var englishChild = !!(opts && opts.englishChildEnabled);
    if (!preferred && window.Auth && typeof Auth.getUser === 'function') {
      var user = Auth.getUser();
      if (user) {
        preferred = user.preferred_locale || user.child_ui_locale || null;
        if (typeof user.english_child_experience_enabled === 'boolean') {
          englishChild = user.english_child_experience_enabled;
        }
      }
    }
    if (!preferred && window.Auth && typeof Auth.api === 'function') {
      try {
        var me = await Auth.api('/api/auth/me');
        if (me) {
          preferred = me.child_ui_locale || me.preferred_locale || null;
          if (typeof me.english_child_experience_enabled === 'boolean') {
            englishChild = me.english_child_experience_enabled;
          }
        }
      } catch (_) { /* not logged in */ }
    }
    _englishChildEnabled = englishChild;
    _childUiLocale = resolveChildUiLocale(preferred, englishChild);
    await I18n.init(_childUiLocale);
    applyChildDom();
    document.dispatchEvent(new CustomEvent('child-i18n-ready', {
      detail: { lang: _childUiLocale, englishChildEnabled: _englishChildEnabled },
    }));
    return _childUiLocale;
  }

  function cpt(key, params) {
    if (!window.I18n) return key;
    return I18n.t('child.' + key, params || {});
  }

  function childPlural(key, count, params) {
    if (!window.I18n) return key;
    return I18n.plural('child.' + key, count, params || {});
  }

  function childLoginErrorFromResponse(data) {
    if (!data) return cpt('errors.serverError');
    if (data.code === 'CHILD_PIN_LOCKED') {
      var minutes = data.lockout_minutes;
      if (minutes == null && data.retry_after != null) {
        minutes = Math.max(1, Math.ceil(Number(data.retry_after) / 60));
      }
      return childErrorFromCode('CHILD_PIN_LOCKED', { minutes: minutes || 1 });
    }
    if (data.code && data.code !== 'CHILD_PIN_INVALID') {
      return childErrorFromCode(data.code);
    }
    var remaining = data.attempts_remaining;
    if (remaining === 1) return cpt('errors.pinWarningLast');
    if (remaining != null && remaining <= 2 && remaining > 0) {
      return cpt('errors.pinWarningLow', { remaining: remaining });
    }
    if (data.code) return childErrorFromCode(data.code);
    return data.error || cpt('errors.serverError');
  }

  function lockoutCountdownText(remainingSeconds) {
    if (remainingSeconds > 60) {
      var mins = Math.floor(remainingSeconds / 60);
      var suffix = mins === 1 ? '' : 'er';
      if (getChildUiLocale() === 'en-GB') suffix = mins === 1 ? '' : 's';
      return cpt('login.lockoutSubMinutes', { minutes: mins, minuteSuffix: suffix });
    }
    return cpt('login.lockoutSubSeconds', { seconds: remainingSeconds });
  }

  function childErrorFromCode(code, params) {
    var map = {
      CHILD_NAME_REQUIRED: 'errors.pinNameRequired',
      CHILD_PIN_REQUIRED: 'errors.pinRequired',
      CHILD_PIN_INVALID_FORMAT: 'errors.pinInvalidFormat',
      CHILD_PIN_INVALID: 'errors.pinInvalid',
      CHILD_PIN_LOCKED: 'errors.pinLocked',
      CHILD_SERVER_ERROR: 'errors.serverError',
    };
    var path = map[code];
    if (!path) return cpt('errors.serverError');
    var p = params || {};
    if (code === 'CHILD_PIN_LOCKED' && p.minutes != null) {
      p.minuteLabel = Number(p.minutes) === 1
        ? cpt('errors.minuteOne')
        : cpt('errors.minuteOther');
    }
    return cpt(path, p);
  }

  function getChildUiLocale() {
    return _childUiLocale;
  }

  document.addEventListener('locale-changed', function () {
    if (!window.I18n) return;
    applyChildDom();
    document.dispatchEvent(new CustomEvent('child-i18n-ready', {
      detail: { lang: _childUiLocale, englishChildEnabled: _englishChildEnabled },
    }));
  });

  window.initChildAppI18n = initChildAppI18n;
  window.cpt = cpt;
  window.childPlural = childPlural;
  window.childLoginErrorFromResponse = childLoginErrorFromResponse;
  window.childLockoutCountdownText = lockoutCountdownText;
  window.childErrorFromCode = childErrorFromCode;
  window.getChildUiLocale = getChildUiLocale;
  window.resolveChildUiLocale = resolveChildUiLocale;
})();
