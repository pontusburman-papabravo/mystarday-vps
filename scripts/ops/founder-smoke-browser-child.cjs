'use strict';

const {
  findSwedishChildTodayLeaks,
  hasSwedishChildTodayCoreLeakInText,
  CHILD_TODAY_READY_ATTR,
} = require('./founder-smoke-browser-child-today-visible.cjs');

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
 * @param {string} [p.todayBodyText] — legacy full-page text (login guard)
 * @param {string} [p.mainText] — visible canonical main/header copy
 * @param {string} [p.navText] — visible canonical bottom nav copy
 * @param {boolean} [p.childTodayI18nReady]
 * @param {string} [p.htmlLang]
 */
function evaluateChildTodaySessionPass(p) {
  const {
    pathname,
    me,
    expectedUsername,
    expectedChildUiLocale,
    todayBodyText,
    mainText,
    navText,
    childTodayI18nReady,
    htmlLang,
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
  const loginProbe = String(todayBodyText || mainText || '');
  if (looksLikeChildLoginScreenText(loginProbe)) {
    return { pass: false, reason: 'login_screen_text' };
  }

  const main = String(mainText != null ? mainText : todayBodyText || '');
  const nav = String(navText != null ? navText : '');

  if (expectedChildUiLocale === 'en-GB') {
    if (childTodayI18nReady !== true) {
      return { pass: false, reason: 'child_today_i18n_not_ready' };
    }
    const lang = String(htmlLang || '').toLowerCase();
    if (!lang.startsWith('en')) {
      return { pass: false, reason: 'html_lang_not_en', actual: htmlLang || '' };
    }
    if (!hasEnglishChildTodayMainSurfaceMarker(main)) {
      return { pass: false, reason: 'missing_english_today_main_copy' };
    }
    const mainLeaks = findSwedishChildTodayLeaks(main, 'main');
    const navLeaks = findSwedishChildTodayLeaks(nav, 'nav');
    if (mainLeaks.length > 0 || navLeaks.length > 0) {
      return {
        pass: false,
        reason: 'swedish_leak_on_child_today',
        swedish_leaks: mainLeaks.concat(navLeaks),
      };
    }
    if (!hasEnglishChildTodayNavMarker(nav)) {
      return { pass: false, reason: 'missing_english_today_nav_copy' };
    }
  } else if (expectedChildUiLocale === 'sv-SE') {
    const surfaceText = [main, nav].filter(Boolean).join('\n') || main;
    if (!hasSwedishChildTodaySurfaceCopy(surfaceText)) {
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
    /\bmy people\b/i.test(t) ||
    /\btoday\b/i.test(t)
  );
}

function hasEnglishChildTodaySurfaceCopy(mainText, navText) {
  const main = String(mainText || '');
  const nav = String(navText || '');
  return hasEnglishChildTodayMainSurfaceMarker(main) && hasEnglishChildTodayNavMarker(nav);
}

function hasSwedishChildTodaySurfaceCopy(bodyText) {
  const t = String(bodyText || '');
  return (
    /\bidag\b/i.test(t) ||
    /\bdaglig logg\b/i.test(t) ||
    /\bmorgon\b/i.test(t) ||
    /\bnu:\s/i.test(t) ||
    /\bsenare:\s/i.test(t) ||
    /(?:^|\n)\s*⚡\s*NU\b/mi.test(t)
  );
}

/** @deprecated use findSwedishChildTodayLeaks on canonical regions */
function hasSwedishChildTodayCoreLeak(bodyText) {
  return hasSwedishChildTodayCoreLeakInText(bodyText);
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function evaluateParentSettingsEnglishPass(p) {
  const { bodyText, me, settingsReachable, htmlLang, diagnostics } = p;
  const text = String(bodyText || '');
  const checks = {
    settings_reachable: settingsReachable === true,
    parent_type: me?.type === 'parent',
    preferred_locale: me?.preferred_locale === 'en-GB',
    preferred_locale_actual: me?.preferred_locale ?? null,
    parent_i18n_ready: diagnostics?.parent_i18n_ready === true,
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
    checks.parent_i18n_ready &&
    checks.html_lang_en &&
    checks.english_settings_heading &&
    checks.english_family_save_copy &&
    checks.no_swedish_familjeinställningar_leak &&
    checks.no_spara_familjeinställningar_leak;
  if (!checks.pass && diagnostics && !checks.diagnostics) {
    checks.diagnostics = {
      pathname: diagnostics.pathname,
      readyState: diagnostics.readyState,
      html_lang: diagnostics.html_lang ?? htmlLang,
      parent_i18n_ready: diagnostics.parent_i18n_ready,
      settings_title_text: diagnostics.settings_title_text,
      family_save_text: diagnostics.family_save_text,
      body_text_snippet: diagnostics.body_text_snippet,
      swedish_leaks: diagnostics.swedish_leaks,
    };
  }
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
  hasEnglishChildTodayMainSurfaceMarker,
  hasEnglishChildTodayNavMarker,
  hasSwedishChildTodaySurfaceCopy,
  hasSwedishChildTodayCoreLeak,
  evaluateChildTodaySessionPass,
  evaluateParentSettingsEnglishPass,
  evaluateParentHandoffRestorePass,
  normalizeEmail,
  normalizeUsername,
  computeBrowserPass,
  CHILD_TODAY_READY_ATTR,
};
