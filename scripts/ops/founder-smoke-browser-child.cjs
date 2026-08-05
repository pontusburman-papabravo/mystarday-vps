'use strict';

const CHILD_TODAY_PATHS = ['/child/today'];
const CHILD_DASHBOARD_PREFIX = '/child/dashboard';

function isAuthenticatedChildTodayPath(pathname) {
  if (!pathname || typeof pathname !== 'string') return false;
  if (pathname.includes('child-login')) return false;
  return (
    CHILD_TODAY_PATHS.includes(pathname) ||
    pathname.startsWith(CHILD_DASHBOARD_PREFIX)
  );
}

function looksLikeChildLoginScreenText(bodyText) {
  const t = String(bodyText || '');
  const loginMarkers =
    /\bwho are you\??\b/i.test(t) ||
    /\blog in as a child\b/i.test(t) ||
    /\bvem är du\??\b/i.test(t) ||
    /\blogga in som barn\b/i.test(t);
  const todayMarkers =
    /\btoday\b/i.test(t) ||
    /\bdaglig logg\b/i.test(t) ||
    /\bheaderTitle\b/i.test(t);
  return loginMarkers && !todayMarkers;
}

/**
 * @param {object} p
 * @param {string} p.pathname
 * @param {object|null} p.me — /api/auth/me JSON
 * @param {string} p.expectedUsername
 * @param {'en-GB'|'sv-SE'} p.expectedChildUiLocale
 * @param {string} p.todayBodyText — visible text on child today (not login)
 */
function evaluateChildTodaySessionPass(p) {
  const {
    pathname,
    me,
    expectedUsername,
    expectedChildUiLocale,
    todayBodyText,
  } = p;

  if (!isAuthenticatedChildTodayPath(pathname)) {
    return { pass: false, reason: 'not_on_child_today' };
  }
  if (!me || me.type !== 'child') {
    return { pass: false, reason: 'me_not_child' };
  }
  if (expectedUsername && me.username !== expectedUsername) {
    return { pass: false, reason: 'wrong_child' };
  }
  if (me.child_ui_locale !== expectedChildUiLocale) {
    return { pass: false, reason: 'wrong_child_ui_locale', actual: me.child_ui_locale };
  }
  if (looksLikeChildLoginScreenText(todayBodyText)) {
    return { pass: false, reason: 'login_screen_text' };
  }

  const text = String(todayBodyText || '');
  if (expectedChildUiLocale === 'en-GB') {
    if (!/\btoday\b/i.test(text) && !/\bdaily\b/i.test(text)) {
      return { pass: false, reason: 'missing_english_today_copy' };
    }
  } else if (expectedChildUiLocale === 'sv-SE') {
    if (!/\bdaglig logg\b/i.test(text) && !/\bidag\b/i.test(text)) {
      return { pass: false, reason: 'missing_swedish_today_copy' };
    }
  }

  return { pass: true };
}

function computeBrowserPass({ scenarios, restoreMeta, vpsOn }) {
  const scenariosPass = Object.values(scenarios).every((s) => s && s.pass === true);
  const restorePass =
    !vpsOn ||
    (restoreMeta?.restored === true && restoreMeta?.restore_matches_snapshot === true);
  return {
    scenariosPass,
    restorePass,
    pass: scenariosPass && restorePass,
  };
}

module.exports = {
  isAuthenticatedChildTodayPath,
  looksLikeChildLoginScreenText,
  evaluateChildTodaySessionPass,
  computeBrowserPass,
};
