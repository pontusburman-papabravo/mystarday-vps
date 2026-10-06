/**
 * child-ui-text.js — Shared child UI copy helpers (cpt wrappers + experience-pack fields).
 * Requires child-app-i18n.js + I18n bundle loaded.
 */
(function childUiTextModule() {
  'use strict';

  function childT(key, params) {
    if (typeof window.cpt === 'function') return cpt(key, params);
    return '';
  }

  function childPluralKey(key, count, params) {
    if (typeof window.childPlural === 'function') return childPlural(key, count, params);
    return childT(key, Object.assign({ count: count }, params || {}));
  }

  /** Pack copy lives on the historical field name. Each pack is already one language. */
  function childPackField(obj, baseKey) {
    if (!obj) return '';
    if (obj[baseKey]) return obj[baseKey];
    const enKey = /_sv$/.test(baseKey) ? baseKey.replace(/_sv$/, '_en') : baseKey + '_en';
    return obj[enKey] || '';
  }

  function childEmotionLabel(key) {
    return childT('checkoff.emotions.' + key);
  }

  function childScoreLabel(score) {
    const n = Number(score);
    if (!n || n < 1 || n > 10) return '';
    return childT('checkoff.score.' + n);
  }

  function childCelebrationAllDoneMsg(index) {
    const i = ((Number(index) || 0) % 7) + 1;
    return childT('celebration.allDoneMsg' + i);
  }

  function childRoleLabel(role) {
    return childT('family.roles.' + role) || role;
  }

  function getChildDateLocale() {
    if (typeof window.getChildUiLocale === 'function' && window.getChildUiLocale()) {
      return window.getChildUiLocale();
    }
    if (window.I18n && typeof I18n.getCurrentLang === 'function' && I18n.getCurrentLang()) {
      return I18n.getCurrentLang();
    }
    return (window.I18n && I18n.DEFAULT_LOCALE) || 'sv-SE';
  }

  function formatChildShortDate(isoOrDate) {
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(getChildDateLocale(), { day: 'numeric', month: 'short' });
  }

  window.childT = childT;
  window.childPluralKey = childPluralKey;
  window.childPackField = childPackField;
  window.childEmotionLabel = childEmotionLabel;
  window.childScoreLabel = childScoreLabel;
  window.childCelebrationAllDoneMsg = childCelebrationAllDoneMsg;
  window.childRoleLabel = childRoleLabel;
  window.getChildDateLocale = getChildDateLocale;
  window.formatChildShortDate = formatChildShortDate;
})();
