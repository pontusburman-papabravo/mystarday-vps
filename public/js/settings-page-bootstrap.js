/**
 * settings-page-bootstrap.js — session validation vs optional data load (no false logout on 429).
 */
(function (global) {
  'use strict';

  const ApiErr = function () {
    return global.ApiErrorClassification || {};
  };

  function shouldRedirectToLogin(err) {
    return ApiErr().isAuthSessionFailure && ApiErr().isAuthSessionFailure(err);
  }

  function isTransientFailure(err) {
    return ApiErr().isTransientApiFailure && ApiErr().isTransientApiFailure(err);
  }

  function getRetryAfterMs(err) {
    return ApiErr().getRetryAfterMs ? ApiErr().getRetryAfterMs(err) : null;
  }

  /**
   * @returns {Promise<{ ok: boolean, me: object|null, redirectLogin: boolean, transient?: boolean, err?: Error }>}
   */
  async function validateSession(apiFn) {
    try {
      const me = await apiFn('/api/auth/me');
      return { ok: true, me: me, redirectLogin: false };
    } catch (err) {
      if (shouldRedirectToLogin(err)) {
        return { ok: false, me: null, redirectLogin: true, err: err };
      }
      const fallbackMe = global.Auth && typeof global.Auth.getUser === 'function'
        ? global.Auth.getUser()
        : null;
      return {
        ok: true,
        me: fallbackMe,
        redirectLogin: false,
        transient: isTransientFailure(err),
        err: err,
      };
    }
  }

  /**
   * @returns {Promise<{ ok: boolean, fam: object|null, err?: Error, transient?: boolean }>}
   */
  async function loadFamilyData(apiFn) {
    try {
      const fam = global.SharedFamilyFetch
        ? await global.SharedFamilyFetch.fetch(apiFn)
        : await apiFn('/api/family');
      return { ok: true, fam: fam };
    } catch (err) {
      return { ok: false, fam: null, err: err, transient: isTransientFailure(err) };
    }
  }

  function ensureFamilyLoadBanner() {
    let el = global.document.getElementById('settingsFamilyLoadError');
    if (el) return el;
    el = global.document.createElement('div');
    el.id = 'settingsFamilyLoadError';
    el.className = 'hidden mb-4 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-navy';
    el.setAttribute('role', 'alert');
    const anchor = global.document.querySelector('main') || global.document.body;
    anchor.insertBefore(el, anchor.firstChild);
    return el;
  }

  function spt(key, params) {
    if (typeof global.pt === 'function') return global.pt(key, params);
    if (global.I18n && typeof global.I18n.t === 'function') return global.I18n.t(key, params);
    return key;
  }

  function showFamilyLoadError(err, onRetry) {
    const banner = ensureFamilyLoadBanner();
    const retryMs = getRetryAfterMs(err);
    const retrySec = retryMs ? Math.ceil(retryMs / 1000) : null;
    const message = (err && err.message)
      ? String(err.message)
      : spt('settings.loadError.fallback');

    while (banner.firstChild) banner.removeChild(banner.firstChild);

    const title = global.document.createElement('p');
    title.className = 'font-semibold mb-1';
    title.textContent = spt('settings.loadError.title');

    const body = global.document.createElement('p');
    body.className = 'text-text-soft mb-2';
    body.textContent = message;

    const btn = global.document.createElement('button');
    btn.type = 'button';
    btn.id = 'settingsFamilyLoadRetryBtn';
    btn.className = 'min-h-[44px] px-4 py-2 rounded-xl bg-gold text-navy font-semibold';
    btn.textContent = retrySec
      ? spt('settings.loadError.retryIn', { seconds: retrySec })
      : spt('settings.loadError.retry');

    banner.appendChild(title);
    banner.appendChild(body);
    banner.appendChild(btn);
    banner.classList.remove('hidden');

    if (typeof onRetry !== 'function') return;

    let timer = null;
    function enableRetry() {
      btn.disabled = false;
      btn.textContent = spt('settings.loadError.retry');
    }
    btn.disabled = !!retryMs;
    if (retryMs) {
      timer = global.setTimeout(enableRetry, retryMs);
    }
    btn.onclick = function () {
      if (btn.disabled) return;
      banner.classList.add('hidden');
      if (timer) global.clearTimeout(timer);
      onRetry();
    };
  }

  global.SettingsPageBootstrap = {
    shouldRedirectToLogin: shouldRedirectToLogin,
    validateSession: validateSession,
    loadFamilyData: loadFamilyData,
    showFamilyLoadError: showFamilyLoadError,
    isTransientFailure: isTransientFailure,
    getRetryAfterMs: getRetryAfterMs,
  };
})(window);
