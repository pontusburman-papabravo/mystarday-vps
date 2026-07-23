/**
 * Parent Home locale gate — product rule P-i18n-Home-B.
 *
 * When family.preferred_locale = en-GB AND english_app is ON for the family,
 * always use the localized magic hub. Never fall back to Swedish classic cards
 * because parent_home_magic is OFF or legacy flags disagree.
 *
 * While /api/features is still in flight (or failed), en-GB families hold the
 * magic hub so Swedish classic copy never flashes during slow init.
 *
 * Unchanged:
 * - sv-SE families
 * - en-GB with english_app OFF (after features load)
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
    if (window._stjarndagFeatures) {
      _englishAppEnabled = window._stjarndagFeatures.english_app === true;
    }
  }

  function currentLocale() {
    syncFromGlobals();
    return _preferredLocale
      || (window.I18n && window.I18n.getCurrentLang && window.I18n.getCurrentLang())
      || 'sv-SE';
  }

  function featuresKnown() {
    return window._stjarndagFeatures != null;
  }

  function isEnglishParentHomeExperience() {
    if (currentLocale() !== 'en-GB') return false;
    if (!featuresKnown()) return false;
    return window._stjarndagFeatures.english_app === true || _englishAppEnabled === true;
  }

  /** Skip parent_home_magic=false and other classic-home fallbacks. */
  function forceMagicHub() {
    if (currentLocale() !== 'en-GB') return false;
    if (!featuresKnown()) return true;
    return window._stjarndagFeatures.english_app === true || _englishAppEnabled === true;
  }

  document.addEventListener('parent-i18n-ready', function () {
    syncFromGlobals();
  });

  window.ParentHomeLocaleGate = {
    setContext: setContext,
    syncFromGlobals: syncFromGlobals,
    isEnglishParentHomeExperience: isEnglishParentHomeExperience,
    forceMagicHub: forceMagicHub,
    featuresKnown: featuresKnown,
  };
})();
