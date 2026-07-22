/**
 * landing-login-choice.js — Mobile web: app download vs web login choice.
 * Shows before /login and /child-login when visitor is on mobile browser.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'landing_login_entry_choice_v1';
  const APP_STORE_FALLBACK = 'https://apple.co/4v2ESuH';

  function isNativeShell() {
    return (global.Platform && global.Platform.isNative && global.Platform.isNative()) ||
      document.documentElement.classList.contains('platform-native') ||
      document.documentElement.classList.contains('is-native');
  }

  function isMobileWeb() {
    return window.matchMedia('(max-width: 960px)').matches && !isNativeShell();
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !global.MSStream;
  }

  function isAndroid() {
    return /Android/.test(navigator.userAgent);
  }

  function readPref() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.skipAsk !== true) return null;
      if (parsed.choice !== 'app' && parsed.choice !== 'web') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function savePref(choice, skipAsk) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice: choice, skipAsk: !!skipAsk }));
    } catch { /* silent */ }
  }

  function getAppStoreUrl() {
    const link = document.querySelector('a[data-track="app_store_click"]');
    return link && link.href ? link.href : APP_STORE_FALLBACK;
  }

  function getPlayStoreUrl() {
    const link = document.querySelector('a[data-track="play_store_click"]');
    if (!link || !link.href || link.href.indexOf('__PLAY_STORE_URL__') !== -1) return null;
    return link.href;
  }

  function getDownloadUrl() {
    if (isIOS()) return getAppStoreUrl();
    if (isAndroid()) return getPlayStoreUrl() || getAppStoreUrl();
    return getPlayStoreUrl() || getAppStoreUrl();
  }

  function downloadLabel() {
    if (isIOS()) return 'Ladda ner i App Store';
    if (isAndroid()) return 'Ladda ner i Google Play';
    return 'Ladda ner appen';
  }

  function track(eventType, metadata) {
    try {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          metadata: Object.assign({ page: 'landing' }, metadata || {}),
        }),
        credentials: 'include',
        keepalive: true,
      }).catch(function () {});
    } catch { /* silent */ }
  }

  function closeModal() {
    const el = document.getElementById('landingLoginChoiceModal');
    if (el) el.remove();
    document.body.classList.remove('landing-login-choice-open');
  }

  function navigateTo(targetHref) {
    if (global.closeLandingMobileMenu) global.closeLandingMobileMenu();
    window.location.href = targetHref;
  }

  function openStore() {
    const url = getDownloadUrl();
    if (global.closeLandingMobileMenu) global.closeLandingMobileMenu();
    window.location.href = url;
  }

  function showModal(targetHref) {
    closeModal();
    track('landing_login_choice_shown', { target: targetHref });

    const overlay = document.createElement('div');
    overlay.id = 'landingLoginChoiceModal';
    overlay.className = 'landing-login-choice-overlay';
    overlay.innerHTML =
      '<div class="landing-login-choice-card" role="dialog" aria-modal="true" aria-labelledby="landingLoginChoiceTitle">' +
        '<button type="button" class="landing-login-choice-close" aria-label="Stäng">&times;</button>' +
        '<h2 id="landingLoginChoiceTitle" class="landing-login-choice-title">Hur vill du fortsätta?</h2>' +
        '<p class="landing-login-choice-text">Du kan ladda ner appen eller logga in direkt i webbläsaren.</p>' +
        '<div class="landing-login-choice-actions">' +
          '<button type="button" class="landing-login-choice-btn landing-login-choice-btn--app" data-choice="app">' +
            '<span class="landing-login-choice-btn__icon" aria-hidden="true">📲</span>' +
            '<span class="landing-login-choice-btn__text"><strong>' + downloadLabel() + '</strong><span>Rekommenderas på mobil</span></span>' +
          '</button>' +
          '<button type="button" class="landing-login-choice-btn landing-login-choice-btn--web" data-choice="web">' +
            '<span class="landing-login-choice-btn__icon" aria-hidden="true">🌐</span>' +
            '<span class="landing-login-choice-btn__text"><strong>Logga in på webben</strong><span>Fortsätt i webbläsaren</span></span>' +
          '</button>' +
        '</div>' +
        '<label class="landing-login-choice-skip">' +
          '<input type="checkbox" id="landingLoginChoiceSkip">' +
          '<span>Fråga inte igen</span>' +
        '</label>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.classList.add('landing-login-choice-open');

    overlay.querySelector('.landing-login-choice-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    overlay.querySelector('[data-choice="app"]').addEventListener('click', function () {
      const skipAsk = overlay.querySelector('#landingLoginChoiceSkip').checked;
      if (skipAsk) savePref('app', true);
      track('landing_login_choice_app', { skip_ask: skipAsk });
      closeModal();
      openStore();
    });

    overlay.querySelector('[data-choice="web"]').addEventListener('click', function () {
      const skipAsk = overlay.querySelector('#landingLoginChoiceSkip').checked;
      if (skipAsk) savePref('web', true);
      track('landing_login_choice_web', { skip_ask: skipAsk, target: targetHref });
      closeModal();
      navigateTo(targetHref);
    });
  }

  function handleLoginLinkClick(e, link) {
    if (!isMobileWeb()) return;

    const href = link.getAttribute('href');
    if (href !== '/login' && href !== '/child-login') return;

    const pref = readPref();
    if (pref) {
      e.preventDefault();
      if (pref.choice === 'app') openStore();
      else navigateTo(href);
      return;
    }

    e.preventDefault();
    showModal(href);
  }

  function init() {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[href="/login"], a[href="/child-login"]');
      if (!link) return;
      handleLoginLinkClick(e, link);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.LandingLoginChoice = {
    isMobileWeb: isMobileWeb,
    readPref: readPref,
    closeModal: closeModal,
  };
})(window);
