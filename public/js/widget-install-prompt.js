/**
 * widget-install-prompt.js — native homescreen widget offer on app start (R4.5).
 * "Fråga inte igen" persists locally; guide always available from Settings.
 */
(function (global) {
  'use strict';

  const DISMISS_FOREVER_KEY = 'stjarndag_widget_homescreen_prompt_dismiss_v1';
  const OVERLAY_ID = 'msj-widget-prompt-overlay';
  let _showPromise = null;

  function isNative() {
    return global.WidgetBridgeClient && global.WidgetBridgeClient.isNative();
  }

  function isExcludedPath() {
    const p = (global.location.pathname || '').replace(/\/$/, '') || '/';
    if (p === '/login' || p === '/register' || p === '/onboarding' || p === '/admin' || p === '/settings') return true;
    if (p === '/' || p === '/index.html' || p === '/en' || p === '/en.html') return true;
    return false;
  }

  function isDismissedForever() {
    try {
      return global.localStorage.getItem(DISMISS_FOREVER_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function setDismissedForever() {
    try {
      global.localStorage.setItem(DISMISS_FOREVER_KEY, '1');
    } catch (_) { /* ignore */ }
  }

  function isLoggedIn() {
    return global.Auth && typeof Auth.isLoggedIn === 'function' && Auth.isLoggedIn();
  }

  function removeModal() {
    const overlay = global.document.getElementById(OVERLAY_ID);
    if (overlay) overlay.remove();
    if (global.document && global.document.body) {
      global.document.body.classList.remove('modal-open');
    }
  }

  function dismissForNavigation() {
    removeModal();
  }

  function buildModal(opts) {
    opts = opts || {};
    removeModal();
    const overlay = global.document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'fixed inset-0 z-[10450] flex items-end sm:items-center justify-center p-4 bg-black/50';
    overlay.setAttribute('role', 'presentation');

    overlay.innerHTML =
      '<div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 font-body text-navy" role="dialog" aria-modal="true" aria-labelledby="msjWidgetPromptTitle">' +
      '<h2 id="msjWidgetPromptTitle" class="font-heading text-lg mb-2">Lägg till widget på hemskärmen?</h2>' +
      '<p class="text-sm text-navy-soft mb-3">Se nästa aktivitet direkt på hemskärmen — utan att öppna appen.</p>' +
      '<ol class="text-sm text-navy-soft space-y-1.5 mb-4 list-decimal list-inside">' +
      '<li>Tryck <strong class="text-navy">Anslut widget</strong> här i appen.</li>' +
      '<li>På hemskärmen: håll ned på bakgrunden → tryck <strong class="text-navy">+</strong> → sök <strong class="text-navy">Min Stjärndag</strong>.</li>' + // pragma: allowlist secret
      '</ol>' +
      '<label class="flex items-start gap-2 text-sm text-navy-soft mb-4 cursor-pointer">' +
      '<input type="checkbox" id="msjWidgetPromptNever" class="mt-1 w-4 h-4 rounded border-lavender" />' +
      '<span>Fråga inte igen</span>' +
      '</label>' +
      '<div class="flex flex-col gap-2">' +
      '<button type="button" id="msjWidgetPromptConnect" class="w-full px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-semibold min-h-[44px]">Anslut widget</button>' +
      '<button type="button" id="msjWidgetPromptLater" class="w-full px-4 py-3 bg-lavender/40 text-navy rounded-xl font-semibold min-h-[44px]">Inte nu</button>' +
      '<button type="button" id="msjWidgetPromptSettings" class="w-full px-4 py-2 text-sm text-navy-soft underline min-h-[44px]">Öppna inställningar</button>' +
      '</div>' +
      '</div>';

    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) closeWithOptions(overlay, false);
    });

    global.document.body.appendChild(overlay);

    const connectBtn = overlay.querySelector('#msjWidgetPromptConnect');
    const laterBtn = overlay.querySelector('#msjWidgetPromptLater');
    const settingsBtn = overlay.querySelector('#msjWidgetPromptSettings');

    if (connectBtn) {
      connectBtn.addEventListener('click', function () {
        connectBtn.disabled = true;
        onConnect().finally(function () {
          connectBtn.disabled = false;
          closeWithOptions(overlay, true);
        });
      });
    }
    if (laterBtn) {
      laterBtn.addEventListener('click', function () {
        closeWithOptions(overlay, false);
      });
    }
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function () {
        closeWithOptions(overlay, false);
        dismissForNavigation();
        global.location.href = '/settings#widgetSettingsSection';
      });
    }

    if (opts.focusConnect && connectBtn) connectBtn.focus();
  }

  function closeWithOptions(overlay, afterConnect) {
    const never = overlay.querySelector('#msjWidgetPromptNever');
    if (never && never.checked) setDismissedForever();
    removeModal();
    if (!afterConnect && never && never.checked) return;
  }

  async function onConnect() {
    if (!global.WidgetBridgeProvision) return;
    const result = await global.WidgetBridgeProvision.syncBinding({});
    if (result && result.ok) return;
    if (result && result.skipped && result.reason === 'no_child_context') {
      global.location.href = '/settings#widgetSettingsSection';
    }
  }

  async function shouldOffer(opts) {
    opts = opts || {};
    if (!opts.force) {
      if (!isNative() || isExcludedPath() || !isLoggedIn() || isDismissedForever()) return false;
    } else {
      if (!isNative() || !isLoggedIn()) return false;
    }

    let status = {};
    try {
      status = await global.WidgetBridgeClient.getStatus();
    } catch (_) { /* ignore */ }
    if (status.hasBinding && !opts.force) return false;

    try {
      const res = await global.fetch('/api/widget/native-status', { credentials: 'include' });
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.native_widget_enabled;
    } catch (_) {
      return false;
    }
  }

  async function tryShow(opts) {
    opts = opts || {};
    if (_showPromise) return _showPromise;
    _showPromise = (async function () {
      if (global.document.getElementById(OVERLAY_ID)) return;
      if (!(await shouldOffer(opts))) return;
      buildModal({ focusConnect: !!opts.focusConnect });
    })().finally(function () {
      _showPromise = null;
    });
    return _showPromise;
  }

  global.WidgetInstallPrompt = {
    tryShow: tryShow,
    openGuide: function () {
      return tryShow({ force: true, focusConnect: true });
    },
    clearDismissForever: function () {
      try {
        global.localStorage.removeItem(DISMISS_FOREVER_KEY);
      } catch (_) { /* ignore */ }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
