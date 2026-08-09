/**
 * settings-native-nav.js — Native settings escape hatch (back + modal cleanup).
 * Fixes stuck modal-open / widget overlay blocking tab bar on /settings.
 */
(function (global) {
  'use strict';

  const OVERLAY_ID = 'msj-widget-prompt-overlay';

  function isNative() {
    return global.Platform && typeof Platform.isNative === 'function' && Platform.isNative();
  }

  function cleanupBlockingOverlays() {
    if (!global.document || !global.document.body) return;
    const overlay = global.document.getElementById(OVERLAY_ID);
    if (overlay) overlay.remove();
    global.document.body.classList.remove('modal-open');
  }

  function ensureBackToHome() {
    if (!isNative()) return;
    if (global.document.getElementById('nativeSettingsBackLink')) return;
    const scroll = global.document.querySelector('main[data-settings-root] .overflow-auto');
    if (!scroll) return;

    const wrap = global.document.createElement('div');
    wrap.className = 'native-settings-back-wrap';
    wrap.innerHTML =
      '<a id="nativeSettingsBackLink" href="/dashboard" class="native-settings-back-link">' +
      '← Till Hem</a>' +
      '<button type="button" id="nativeSettingsMenuLink" class="native-settings-menu-link">' +
      'Inställningsmeny</button>';

    scroll.insertBefore(wrap, scroll.firstChild);

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

  function init() {
    if ((global.location.pathname || '').replace(/\/$/, '') !== '/settings') return;
    cleanupBlockingOverlays();
    ensureBackToHome();
  }

  global.SettingsNativeNav = {
    cleanup: cleanupBlockingOverlays,
    init: init,
  };

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  global.addEventListener('pageshow', init);
})(typeof window !== 'undefined' ? window : globalThis);
