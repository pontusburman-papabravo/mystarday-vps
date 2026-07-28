/**
 * child-achievement-i18n.js — Localized trophy names/descriptions by stable slug keys.
 * DB seed strings are fallback for unknown/legacy slugs only.
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

  function isLocalized(key, localized) {
    if (!localized) return false;
    if (localized === key) return false;
    if (localized === 'child.' + key) return false;
    if (localized.startsWith('child.')) return false;
    return true;
  }

  function resolveField(achievement, field) {
    if (!achievement) return field === 'name' ? t('samling.trophyDefault') : '';
    const slug = achievement.slug;
    if (slug) {
      const key = 'achievements.trophies.' + slug + '.' + field;
      const localized = t(key);
      if (isLocalized(key, localized)) return localized;
    }
    const dbVal = field === 'name' ? achievement.name : achievement.description;
    if (dbVal) return dbVal;
    return field === 'name' ? t('samling.trophyDefault') : '';
  }

  function resolveName(achievement) {
    return resolveField(achievement, 'name');
  }

  function resolveDescription(achievement) {
    return resolveField(achievement, 'description');
  }

  window.ChildAchievementI18n = {
    resolveName: resolveName,
    resolveDescription: resolveDescription,
  };
})();
