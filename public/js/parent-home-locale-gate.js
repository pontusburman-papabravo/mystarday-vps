/**
 * Parent Home locale gate — product rule P-i18n-Home-B.
 *
 * When family.preferred_locale = en-GB AND english_app is ON for the family,
 * always use the localized magic hub. Never fall back to Swedish classic cards
 * because parent_home_magic is OFF or legacy flags disagree.
 *
 * Unchanged:
 * - sv-SE families
 * - en-GB with english_app OFF
 * - Android flat (same hub content, flat CSS via is-native-android)
 * - Schedule editor / child drill-down (isOverviewVisible false in hub)
 */
(function parentHomeLocaleGateModule() {
  'use strict';

  let _preferredLocale = null;
  let _englishAppEnabled = null;

  function setContext(ctx) {
    if (!ctx) return;
    if (ctx.preferredLocale != null) _preferredLocale = ctx.preferredLocale;
    if (ctx.englishAppEnabled != null) _englishAppEnabled = ctx.englishAppEnabled === true;
  }

  function syncFromGlobals() {
    if (window.I18n && typeof window.I18n.getCurrentLang === 'function') {
      _preferredLocale = window.I18n.getCurrentLang();
    }
    if (window._stjarndagFeatures && window._stjarndagFeatures.english_app === true) {
      _englishAppEnabled = true;
    } else if (window._stjarndagFeatures && window._stjarndagFeatures.english_app === false) {
      _englishAppEnabled = false;
    }
  }

  function isEnglishParentHomeExperience() {
    syncFromGlobals();
    const locale = _preferredLocale
      || (window.I18n && window.I18n.getCurrentLang && window.I18n.getCurrentLang())
      || 'sv-SE';
    const englishOn = _englishAppEnabled === true;
    return locale === 'en-GB' && englishOn;
  }

  /** Skip parent_home_magic=false and other classic-home fallbacks. */
  function forceMagicHub() {
    return isEnglishParentHomeExperience();
  }

  document.addEventListener('parent-i18n-ready', function () {
    syncFromGlobals();
  });

  window.ParentHomeLocaleGate = {
    setContext: setContext,
    syncFromGlobals: syncFromGlobals,
    isEnglishParentHomeExperience: isEnglishParentHomeExperience,
    forceMagicHub: forceMagicHub,
  };
})();
