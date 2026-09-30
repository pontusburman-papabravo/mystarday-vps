/**
 * app-entry.js — Applandningssidan v2 entry state machine.
 * WHAT: welcome → role → adult start/login/signup for native + PWA standalone.
 * WHAT NOT: auth POST, child PIN — login.html inline + child-login.js.
 */
(function () {
  'use strict';

  const ENTRY_VERSION = 'v2_1';
  const SCREENS = {
    ENTRY_WELCOME: 'entry-welcome',
    ENTRY_ROLE_PICK: 'role-selection',
    ENTRY_ADULT_START: 'entry-adult-start',
    ENTRY_ADULT_LOGIN: 'parent-login-section',
    ENTRY_ADULT_SIGNUP_INTRO: 'entry-signup-intro',
  };

  const VIEW_EVENTS = {
    ENTRY_WELCOME: 'entry_welcome_viewed',
    ENTRY_ROLE_PICK: 'role_selection_viewed',
    ENTRY_ADULT_START: 'adult_start_viewed',
    ENTRY_ADULT_LOGIN: 'adult_login_viewed',
    ENTRY_ADULT_SIGNUP_INTRO: 'adult_signup_intro_viewed',
  };

  let _currentScreen = null;
  let _fullFlow = false;

  function track(eventName, props) {
    if (window.EntryAnalytics && typeof EntryAnalytics.track === 'function') {
      EntryAnalytics.track(eventName, props);
    }
  }

  function isInstalledApp() {
    return (
      (typeof window.Platform !== 'undefined' && typeof Platform.isNative === 'function' && Platform.isNative()) ||
      (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
    );
  }

  /** Native shell only. PWA standalone keeps the longer welcome. */
  function isNativeAppShell() {
    try {
      if (typeof Capacitor !== 'undefined' && Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) {
        return true;
      }
    } catch (_) { /* ignore */ }
    if (typeof window.Platform !== 'undefined' && typeof Platform.isNative === 'function' && Platform.isNative()) {
      return true;
    }
    const html = document.documentElement;
    if (!html || !html.classList) return false;
    return html.classList.contains('is-native')
      || html.classList.contains('is-native-android')
      || html.classList.contains('is-native-ios')
      || html.classList.contains('platform-native')
      || html.classList.contains('platform-ios')
      || html.classList.contains('platform-android');
  }

  function firstRunMeta() {
    const meta = (window.EntryAnalytics && typeof EntryAnalytics.acquisitionMeta === 'function')
      ? EntryAnalytics.acquisitionMeta()
      : {};
    if (!meta.entry_source) meta.entry_source = 'native_login';
    return meta;
  }

  function getLoginNextUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
      return next;
    } catch (_) {
      return null;
    }
  }

  function isAddChildReturn() {
    const next = getLoginNextUrl();
    return !!(next && next.indexOf('addChild') !== -1);
  }

  function setEntryPath(value) {
    try {
      if (value) sessionStorage.setItem('entry_path', value);
    } catch (_) { /* ignore */ }
  }

  function getEntryPath() {
    try {
      return sessionStorage.getItem('entry_path');
    } catch (_) {
      return null;
    }
  }

  function markEntryVersion() {
    try {
      sessionStorage.setItem('entry_version', ENTRY_VERSION);
    } catch (_) { /* ignore */ }
  }

  function getScreenEl(screenId) {
    const domId = SCREENS[screenId];
    return domId ? document.getElementById(domId) : null;
  }

  function hideGlobalLogo(hide) {
    const logo = document.getElementById('login-global-logo');
    if (logo) logo.style.display = hide ? 'none' : '';
  }

  function hideAllScreens() {
    Object.keys(SCREENS).forEach(function (key) {
      const el = getScreenEl(key);
      if (!el) return;
      el.classList.remove('is-active', 'card-transition');
      if (key === 'ENTRY_ADULT_LOGIN') {
        el.style.display = 'none';
      } else if (el.classList.contains('app-entry-screen')) {
        el.style.display = 'none';
      } else {
        el.style.display = 'none';
      }
    });
  }

  function showScreen(screenId, opts) {
    opts = opts || {};
    hideAllScreens();

    const el = getScreenEl(screenId);
    if (!el) return;

    _currentScreen = screenId;

    if (screenId === 'ENTRY_ADULT_LOGIN') {
      el.style.display = 'flex';
    } else {
      el.style.display = 'flex';
      el.classList.add('is-active');
    }

    el.classList.add('card-transition');
    hideGlobalLogo(screenId === 'ENTRY_WELCOME');

    if (!opts.silent && VIEW_EVENTS[screenId]) {
      track(VIEW_EVENTS[screenId]);
    }

    updateParentLoginBackButton();
    updateSignupIntroLinks();
  }

  function updateParentLoginBackButton() {
    const section = document.getElementById('parent-login-section');
    if (!section) return;
    const backBtn = section.querySelector('.magic-back-btn');
    if (!backBtn || backBtn.id === 'addChildBackBtn') return;
    backBtn.onclick = function () {
      goBack();
    };
  }

  function updateSignupIntroLinks() {
    const createBtn = document.getElementById('entrySignupCreateBtn');
    if (createBtn && !createBtn.dataset.bound) {
      createBtn.dataset.bound = '1';
      createBtn.addEventListener('click', function () {
        track('signup_started');
        window.location.href = '/register';
      });
    }
  }

  function goBack() {
    if (!_fullFlow) {
      if (window.LoginMagic && LoginMagic.backToRoleSelection) {
        LoginMagic.backToRoleSelection();
      }
      return;
    }

    if (_currentScreen === 'ENTRY_ADULT_LOGIN') {
      const path = getEntryPath();
      if (path === 'welcome_existing') {
        showScreen('ENTRY_WELCOME');
        return;
      }
      showScreen('ENTRY_ADULT_START');
      return;
    }

    if (_currentScreen === 'ENTRY_ADULT_SIGNUP_INTRO') {
      showScreen('ENTRY_ADULT_START');
      return;
    }

    if (_currentScreen === 'ENTRY_ADULT_START') {
      showScreen('ENTRY_ROLE_PICK');
      return;
    }

    if (_currentScreen === 'ENTRY_ROLE_PICK') {
      showScreen('ENTRY_WELCOME');
      return;
    }
  }

  function goToChildLogin() {
    markEntryVersion();
    setEntryPath('role_child');
    // Do not arm entry_restore=ENTRY_ROLE_PICK. An authoritative redirect back
    // to /login would otherwise redraw this same screen and look like a dead tap.
    try {
      sessionStorage.removeItem('entry_restore');
    } catch (_) { /* ignore */ }
    track('role_child_selected');
    if (window.DeviceMode) DeviceMode.enterChild();
    window.location.href = '/child-login';
  }

  function goToAdultStart() {
    setEntryPath('role_adult');
    track('role_adult_selected');
    showScreen('ENTRY_ADULT_START');
  }

  function goToAdultLogin(fromExistingShortcut) {
    if (fromExistingShortcut) {
      setEntryPath('welcome_existing');
      track('entry_existing_account_tapped');
    }
    showScreen('ENTRY_ADULT_LOGIN');
  }

  function goToSignupIntro() {
    track('adult_new_selected');
    showScreen('ENTRY_ADULT_SIGNUP_INTRO');
  }

  function bindWelcomeActions() {
    const startBtn = document.getElementById('entryWelcomeStartBtn');
    const existingBtn = document.getElementById('entryWelcomeExistingBtn');
    const howBtn = document.getElementById('entryHowItWorksBtn');
    const howClose = document.getElementById('entryHowItWorksClose');
    const howModal = document.getElementById('entry-how-it-works-modal');

    if (startBtn && !startBtn.dataset.bound) {
      startBtn.dataset.bound = '1';
      startBtn.addEventListener('click', function () {
        setEntryPath('welcome_get_started');
        track('entry_cta_started');
        showScreen('ENTRY_ROLE_PICK');
      });
    }

    if (existingBtn && !existingBtn.dataset.bound) {
      existingBtn.dataset.bound = '1';
      existingBtn.addEventListener('click', function () {
        goToAdultLogin(true);
      });
    }

    if (howBtn && howModal && !howBtn.dataset.bound) {
      howBtn.dataset.bound = '1';
      howBtn.addEventListener('click', function () {
        howModal.classList.remove('hidden');
        track('entry_how_it_works_opened');
      });
    }

    if (howClose && howModal && !howClose.dataset.bound) {
      howClose.dataset.bound = '1';
      howClose.addEventListener('click', function () {
        howModal.classList.add('hidden');
      });
      howModal.addEventListener('click', function (e) {
        if (e.target === howModal) howModal.classList.add('hidden');
      });
    }

    const createBtn = document.getElementById('entryFirstRunCreateBtn');
    const loginBtn = document.getElementById('entryFirstRunLoginBtn');
    const childBtn = document.getElementById('entryFirstRunChildBtn');

    if (createBtn && !createBtn.dataset.bound) {
      createBtn.dataset.bound = '1';
      createBtn.addEventListener('click', function () {
        const meta = firstRunMeta();
        track('native_create_account_click', meta);
        track('signup_started', meta);
        const href = (window.EntryAnalytics && typeof EntryAnalytics.registerHrefFromEntry === 'function')
          ? EntryAnalytics.registerHrefFromEntry()
          : '/register?entry=native_first_run&src=login';
        window.location.href = href;
      });
    }

    if (loginBtn && !loginBtn.dataset.bound) {
      loginBtn.dataset.bound = '1';
      loginBtn.addEventListener('click', function () {
        track('native_login_click', firstRunMeta());
        setEntryPath('welcome_existing');
        showScreen('ENTRY_ADULT_LOGIN');
      });
    }

    if (childBtn && !childBtn.dataset.bound) {
      childBtn.dataset.bound = '1';
      childBtn.addEventListener('click', function () {
        goToChildLogin();
      });
    }
  }

  function showNativeFirstRun() {
    const legacy = document.getElementById('entryWelcomeLegacy');
    const first = document.getElementById('entryWelcomeFirstRun');
    if (legacy) legacy.hidden = true;
    if (first) first.hidden = false;
    showScreen('ENTRY_WELCOME');
    track('native_first_run_shown', firstRunMeta());
  }

  function bindRolePickActions() {
    const backBtn = document.getElementById('entryRoleBackBtn');
    if (backBtn && !backBtn.dataset.bound) {
      backBtn.dataset.bound = '1';
      backBtn.addEventListener('click', function () {
        showScreen('ENTRY_WELCOME');
      });
    }

    const title = document.getElementById('entryRoleTitle');
    if (title && window.I18n) title.textContent = I18n.t('auth.entry.role.title');

    const kidSub = document.querySelector('#kid-role-card .card-sub');
    if (kidSub && window.I18n) kidSub.textContent = I18n.t('auth.entry.role.kidSub');

    const parentSub = document.querySelector('#parent-role-card .card-sub');
    if (parentSub && window.I18n) parentSub.textContent = I18n.t('auth.entry.role.parentSub');
  }

  function bindAdultStartActions() {
    const backBtn = document.getElementById('entryAdultStartBackBtn');
    const existingBtn = document.getElementById('entryAdultStartExistingBtn');
    const newBtn = document.getElementById('entryAdultStartNewBtn');

    if (backBtn && !backBtn.dataset.bound) {
      backBtn.dataset.bound = '1';
      backBtn.addEventListener('click', goBack);
    }

    if (existingBtn && !existingBtn.dataset.bound) {
      existingBtn.dataset.bound = '1';
      existingBtn.addEventListener('click', function () {
        track('adult_existing_selected');
        showScreen('ENTRY_ADULT_LOGIN');
      });
    }

    if (newBtn && !newBtn.dataset.bound) {
      newBtn.dataset.bound = '1';
      newBtn.addEventListener('click', goToSignupIntro);
    }
  }

  function bindSignupIntroActions() {
    const backBtn = document.getElementById('entrySignupBackBtn');
    const existingBtn = document.getElementById('entrySignupExistingBtn');

    if (backBtn && !backBtn.dataset.bound) {
      backBtn.dataset.bound = '1';
      backBtn.addEventListener('click', goBack);
    }

    if (existingBtn && !existingBtn.dataset.bound) {
      existingBtn.dataset.bound = '1';
      existingBtn.addEventListener('click', function () {
        showScreen('ENTRY_ADULT_LOGIN');
      });
    }
  }

  function bindLoginSectionLinks() {
    const signupLink = document.getElementById('entryLoginSignupLink');
    if (signupLink && !signupLink.dataset.bound) {
      signupLink.dataset.bound = '1';
      signupLink.addEventListener('click', function (e) {
        if (!_fullFlow) return;
        e.preventDefault();
        showScreen('ENTRY_ADULT_SIGNUP_INTRO');
      });
    }
  }

  function restoreScreenIfNeeded() {
    try {
      const restore = sessionStorage.getItem('entry_restore');
      if (restore && SCREENS[restore]) {
        sessionStorage.removeItem('entry_restore');
        showScreen(restore, { silent: true });
        return true;
      }
    } catch (_) { /* ignore */ }
    return false;
  }

  function init() {
    _fullFlow = isInstalledApp();
    markEntryVersion();
    bindWelcomeActions();
    bindRolePickActions();
    bindAdultStartActions();
    bindSignupIntroActions();
    bindLoginSectionLinks();

    if (!_fullFlow || isAddChildReturn()) {
      _fullFlow = false;
      const parentSection = document.getElementById('parent-login-section');
      const roleSel = document.getElementById('role-selection');
      if (roleSel) roleSel.style.display = 'none';
      if (parentSection) {
        parentSection.style.display = 'flex';
        _currentScreen = 'ENTRY_ADULT_LOGIN';
      }
      const addBanner = document.getElementById('addChildLoginBanner');
      if (addBanner) addBanner.classList.toggle('hidden', !isAddChildReturn());
      return;
    }

    track('app_opened');

    if (restoreScreenIfNeeded()) return;

    // Role pick only when /login resume already declined (no resumable app-entry).
    // A logged-in native shell must not sit on ENTRY_ROLE_PICK before that decision.
    if (
      isNativeAppShell() &&
      window.Auth && typeof Auth.isLoggedIn === 'function' && Auth.isLoggedIn()
    ) {
      showScreen('ENTRY_ROLE_PICK');
      return;
    }

    if (isNativeAppShell()) {
      showNativeFirstRun();
      return;
    }

    showScreen('ENTRY_WELCOME');
  }

  window.AppEntry = {
    init: init,
    showScreen: showScreen,
    goBack: goBack,
    goToChildLogin: goToChildLogin,
    goToAdultStart: goToAdultStart,
    goToAdultLogin: goToAdultLogin,
    goToSignupIntro: goToSignupIntro,
    isFullEntryFlow: function () { return _fullFlow; },
    isInstalledApp: isInstalledApp,
    getCurrentScreen: function () { return _currentScreen; },
    track: track,
    trackAuthMethod: function (method) {
      track('adult_login_method_selected', { method: method });
    },
    trackAuthSuccess: function (method) {
      track('adult_login_success', { method: method || 'email' });
    },
    trackAuthFailed: function (method, reason) {
      track('adult_login_failed', { method: method || 'email', reason: reason || 'unknown' });
    },
  };
})();
