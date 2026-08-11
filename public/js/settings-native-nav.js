/**
 * settings-native-nav.js — Settings escape hatch (back + menu) on native and mobile web.
 * Fixes stuck modal-open / widget overlay blocking tab bar on /settings.
 */
(function (global) {
  'use strict';

  const OVERLAY_ID = 'msj-widget-prompt-overlay';
  const WRAP_ID = 'nativeSettingsBackLinkWrap';

  function isNative() {
    return global.Platform && typeof Platform.isNative === 'function' && Platform.isNative();
  }

  function isMobileWeb() {
    return global.matchMedia && global.matchMedia('(max-width: 767px)').matches;
  }

  function isSettingsPath() {
    return (global.location.pathname || '').replace(/\/$/, '') === '/settings';
  }

  function isMagicSettings() {
    return global.ParentMagicShell && ParentMagicShell.isMagic && ParentMagicShell.isMagic();
  }

  function shouldShowEscapeHatch() {
    if (!isSettingsPath()) return false;
    if (isNative()) return true;
    if (isMobileWeb() && isMagicSettings()) return true;
    if (isMobileWeb() && global.document.body.classList.contains('parent-magic-view')) return true;
    return false;
  }

  function cleanupBlockingOverlays() {
    if (!global.document || !global.document.body) return;
    const overlay = global.document.getElementById(OVERLAY_ID);
    if (overlay) overlay.remove();
    global.document.body.classList.remove('modal-open');
  }

  function settingsScrollRoot() {
    return global.document.querySelector('main[data-settings-root] .overflow-auto')
      || global.document.querySelector('main[data-settings-root]');
  }

  function ensureBackToHome() {
    if (!shouldShowEscapeHatch()) return;
    if (global.document.getElementById('nativeSettingsBackLink')) return;

    const scroll = settingsScrollRoot();
    const main = global.document.querySelector('main[data-settings-root]') || global.document.querySelector('main');
    const anchor = scroll || main;
    if (!anchor) return;

    const inGroup = global.document.body.classList.contains('magic-settings-in-group');
    const showMenu = inGroup;

    const wrap = global.document.createElement('div');
    wrap.id = WRAP_ID;
    wrap.className = 'native-settings-back-wrap';
    wrap.innerHTML =
      '<a id="nativeSettingsBackLink" href="/dashboard" class="native-settings-back-link">' +
      '← Till Hem</a>' +
      (showMenu
        ? '<button type="button" id="nativeSettingsMenuLink" class="native-settings-menu-link">' +
          'Inställningsmeny</button>'
        : '');

    if (scroll) {
      scroll.insertBefore(wrap, scroll.firstChild);
    } else if (main) {
      const backBar = global.document.getElementById('magicSettingsBackBar');
      if (backBar && backBar.parentNode === main) {
        main.insertBefore(wrap, backBar.nextSibling);
      } else {
        main.insertBefore(wrap, main.firstChild);
      }
    }

    const menuBtn = wrap.querySelector('#nativeSettingsMenuLink');
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        cleanupBlockingOverlays();
        if (global.ParentMagicPageHub && ParentMagicPageHub.returnToSettingsMenu) {
          ParentMagicPageHub.returnToSettingsMenu();
          return;
        }
        if (global.history && global.history.length > 1) {
          global.history.back();
        }
      });
    }
  }

  function syncEscapeHatch() {
    if (!isSettingsPath()) {
      const existing = global.document.getElementById(WRAP_ID);
      if (existing) existing.remove();
      return;
    }
    cleanupBlockingOverlays();
    ensureBackToHome();
  }

  function init() {
    syncEscapeHatch();
  }

  global.SettingsNativeNav = {
    cleanup: cleanupBlockingOverlays,
    init: init,
    sync: syncEscapeHatch,
  };

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  global.addEventListener('pageshow', init);
  global.addEventListener('stjarndag-magic-navigated', syncEscapeHatch);
  global.document.addEventListener('click', function (e) {
    if (!isSettingsPath()) return;
    if (e.target.closest('[data-settings-group]') || e.target.closest('[data-settings-back]')) {
      setTimeout(syncEscapeHatch, 0);
    }
  }, true);
})(typeof window !== 'undefined' ? window : globalThis);
