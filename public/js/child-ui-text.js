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

  /** Read label_sv / label_en (or *\_sv fields) from experience-pack objects. */
  function childPackField(obj, baseKey) {
    if (!obj) return '';
    const isEn = typeof window.getChildUiLocale === 'function' && getChildUiLocale() === 'en-GB';
    let enKey = baseKey.replace(/_sv$/, '_en');
    if (!/_sv$/.test(baseKey)) {
      enKey = baseKey + '_en';
    }
    if (isEn && obj[enKey]) return obj[enKey];
    if (obj[baseKey]) return obj[baseKey];
    if (isEn && obj[baseKey]) return obj[baseKey];
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

  window.childT = childT;
  window.childPluralKey = childPluralKey;
  window.childPackField = childPackField;
  window.childEmotionLabel = childEmotionLabel;
  window.childScoreLabel = childScoreLabel;
  window.childCelebrationAllDoneMsg = childCelebrationAllDoneMsg;
  window.childRoleLabel = childRoleLabel;
})();
