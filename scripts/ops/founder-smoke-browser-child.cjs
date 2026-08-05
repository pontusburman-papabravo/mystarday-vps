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
  if (expectedUsername) {
    const expected = normalizeUsername(expectedUsername);
    const actual = normalizeUsername(me.username);
    if (actual !== expected) {
      return {
        pass: false,
        reason: 'wrong_child',
        expected_username: expected,
        actual_username: actual || null,
      };
    }
  }
  if (me.child_ui_locale !== expectedChildUiLocale) {
    return { pass: false, reason: 'wrong_child_ui_locale', actual: me.child_ui_locale };
  }
  if (looksLikeChildLoginScreenText(todayBodyText)) {
    return { pass: false, reason: 'login_screen_text' };
  }

  const text = String(todayBodyText || '');
  if (expectedChildUiLocale === 'en-GB') {
    if (!hasEnglishChildTodaySurfaceCopy(text)) {
      return { pass: false, reason: 'missing_english_today_copy' };
    }
    if (hasSwedishChildTodayCoreLeak(text)) {
      return { pass: false, reason: 'swedish_leak_on_child_today' };
    }
  } else if (expectedChildUiLocale === 'sv-SE') {
    if (!hasSwedishChildTodaySurfaceCopy(text)) {
      return { pass: false, reason: 'missing_swedish_today_copy' };
    }
  }

  return { pass: true };
}

function hasEnglishChildTodayMainSurfaceMarker(bodyText) {
  const t = String(bodyText || '');
  return (
    /\bmission\b/i.test(t) ||
    /\bnow\b/i.test(t) ||
    /\bnext\b/i.test(t)
  );
}

function hasEnglishChildTodayNavMarker(bodyText) {
  const t = String(bodyText || '');
  return (
    /\btreasure chest\b/i.test(t) ||
    /\bmy collection\b/i.test(t) ||
    /\bmy world\b/i.test(t) ||
    /\bmy people\b/i.test(t)
  );
}

function hasEnglishChildTodaySurfaceCopy(bodyText) {
  const t = String(bodyText || '');
  const main = hasEnglishChildTodayMainSurfaceMarker(t);
  const nav = hasEnglishChildTodayNavMarker(t);
  if (!main) {
    return false;
  }
  if (nav) {
    return true;
  }
  const mainHits =
    (/\bmission\b/i.test(t) ? 1 : 0) +
    (/\bnow\b/i.test(t) ? 1 : 0) +
    (/\bnext\b/i.test(t) ? 1 : 0);
  return mainHits >= 2;
}

function hasSwedishChildTodaySurfaceCopy(bodyText) {
  const t = String(bodyText || '');
  return /\bidag\b/i.test(t) || /\bdaglig logg\b/i.test(t) || /\bmorgon\b/i.test(t);
}

function hasSwedishChildTodayCoreLeak(bodyText) {
  const t = String(bodyText || '');
  return (
    /\bidag\b/i.test(t) ||
    /\bskattkammaren\b/i.test(t) ||
    /\bnästa\b/i.test(t) ||
    /\bnu\b/i.test(t)
  );
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function evaluateParentSettingsEnglishPass(p) {
  const { bodyText, me, settingsReachable, htmlLang } = p;
  const text = String(bodyText || '');
  const checks = {
    settings_reachable: settingsReachable === true,
    parent_type: me?.type === 'parent',
    preferred_locale: me?.preferred_locale === 'en-GB',
    preferred_locale_actual: me?.preferred_locale ?? null,
    html_lang_en: typeof htmlLang === 'string' && htmlLang.toLowerCase().startsWith('en'),
    english_settings_heading: /\bsettings\b/i.test(text),
    english_family_save_copy:
      /save family settings/i.test(text) || /update family settings/i.test(text),
    english_family_copy: /\bfamily\b/i.test(text),
    no_swedish_familjeinställningar_leak: !/familjeinställningar/i.test(text),
    no_spara_familjeinställningar_leak: !/spara familjeinställningar/i.test(text),
  };
  checks.pass =
    checks.settings_reachable &&
    checks.parent_type &&
    checks.preferred_locale &&
    checks.html_lang_en &&
    checks.english_settings_heading &&
    checks.english_family_save_copy &&
    checks.no_swedish_familjeinställningar_leak &&
    checks.no_spara_familjeinställningar_leak;
  return checks;
}

function evaluateParentHandoffRestorePass(p) {
  const { me, path, onLoginForm, expectedEmail, expectedFamilyId } = p;
  if (onLoginForm || (path && path.startsWith('/login'))) {
    return { pass: false, reason: 'on_login_form' };
  }
  if (!me || me.type !== 'parent') {
    return { pass: false, reason: 'me_not_parent' };
  }
  if (normalizeEmail(me.email) !== normalizeEmail(expectedEmail)) {
    return { pass: false, reason: 'wrong_parent_email' };
  }
  if (expectedFamilyId && me.family_id !== expectedFamilyId) {
    return { pass: false, reason: 'wrong_family_id' };
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
  hasEnglishChildTodaySurfaceCopy,
  hasSwedishChildTodaySurfaceCopy,
  evaluateChildTodaySessionPass,
  evaluateParentSettingsEnglishPass,
  evaluateParentHandoffRestorePass,
  normalizeEmail,
  normalizeUsername,
  computeBrowserPass,
};
